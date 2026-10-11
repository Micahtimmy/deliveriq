import api, { route } from '@forge/api';
import { JiraBoard, JiraSpace, JiraFieldDefinition } from '../types/jira';

// Resilient Jira API helper trying asUser() first, then asApp() if unauthorized or failed
async function fetchJiraWithFallback(routeBuilder: () => any): Promise<any | null> {
  try {
    const userRes = await api.asUser().requestJira(routeBuilder(), { headers: { Accept: 'application/json' } });
    if (userRes && userRes.ok) return userRes;
  } catch (e) {
    // Ignore and try asApp
  }
  try {
    const appRes = await api.asApp().requestJira(routeBuilder(), { headers: { Accept: 'application/json' } });
    if (appRes && appRes.ok) return appRes;
  } catch (e) {
    // Ignore
  }
  return null;
}

export async function getBoards(): Promise<{
  boards: JiraBoard[];
  spaces: JiraSpace[];
  storyPointsField: string;
}> {
  const maxResults = 100;
  const boards: JiraBoard[] = [];
  const spaces: JiraSpace[] = [];
  const seenBoardIds = new Set<number>();
  const seenProjectKeys = new Set<string>();

  // 1. Concurrently start fetching first page of boards, projects/spaces, and fields
  const [boardsRes, projectsRes, fieldsRes] = await Promise.all([
    fetchJiraWithFallback(() => route`/rest/agile/1.0/board?startAt=0&maxResults=${maxResults}`),
    fetchJiraWithFallback(() => route`/rest/api/3/project/search?startAt=0&maxResults=${maxResults}&expand=insight,lead`),
    fetchJiraWithFallback(() => route`/rest/api/3/field`)
  ]);

  // Process Boards (Page 1 + Full Pagination up to 1000 boards)
  if (boardsRes && boardsRes.ok) {
    try {
      const firstData = (await boardsRes.json()) as { values?: JiraBoard[]; isLast?: boolean; total?: number };
      const firstBoards = firstData.values || [];
      for (const b of firstBoards) {
        if (!seenBoardIds.has(b.id)) {
          seenBoardIds.add(b.id);
          boards.push(b);
        }
      }

      let isLast = firstData.isLast === true || firstBoards.length < maxResults;
      let startAt = firstBoards.length;

      while (!isLast && startAt < 5000) {
        const nextRes = await fetchJiraWithFallback(
          () => route`/rest/agile/1.0/board?startAt=${startAt}&maxResults=${maxResults}`
        );
        if (!nextRes || !nextRes.ok) break;

        const nextData = (await nextRes.json()) as { values?: JiraBoard[]; isLast?: boolean; total?: number };
        const newBoards = nextData.values || [];
        for (const b of newBoards) {
          if (!seenBoardIds.has(b.id)) {
            seenBoardIds.add(b.id);
            boards.push(b);
          }
        }

        if (nextData.isLast === true || newBoards.length === 0 || newBoards.length < maxResults) {
          isLast = true;
        }
        startAt += newBoards.length;
      }
    } catch (e) {
      console.warn('Error parsing boards data:', e);
    }
  }

  // Process Projects / Spaces (Page 1 + Full Pagination up to 5000 projects)
  if (projectsRes && projectsRes.ok) {
    try {
      const firstProjData = (await projectsRes.json()) as { values?: JiraSpace[]; isLast?: boolean; total?: number };
      const firstProjs = firstProjData.values || [];
      for (const p of firstProjs) {
        if (!seenProjectKeys.has(p.key.toUpperCase())) {
          seenProjectKeys.add(p.key.toUpperCase());
          spaces.push(p);
        }
      }

      let isLastProj = firstProjData.isLast === true || firstProjs.length < maxResults;
      let projStartAt = firstProjs.length;

      while (!isLastProj && projStartAt < 5000) {
        const nextProjRes = await fetchJiraWithFallback(
          () => route`/rest/api/3/project/search?startAt=${projStartAt}&maxResults=${maxResults}&expand=insight,lead`
        );
        if (!nextProjRes || !nextProjRes.ok) break;

        const nextProjData = (await nextProjRes.json()) as { values?: JiraSpace[]; isLast?: boolean; total?: number };
        const newProjs = nextProjData.values || [];
        for (const p of newProjs) {
          if (!seenProjectKeys.has(p.key.toUpperCase())) {
            seenProjectKeys.add(p.key.toUpperCase());
            spaces.push(p);
          }
        }

        if (nextProjData.isLast === true || newProjs.length === 0 || newProjs.length < maxResults) {
          isLastProj = true;
        }
        projStartAt += newProjs.length;
      }
    } catch (e) {
      console.warn('Error parsing projects data:', e);
    }
  }

  // Fallback: If project/search returned nothing, try basic /rest/api/3/project
  if (spaces.length === 0) {
    try {
      const basicProjRes = await fetchJiraWithFallback(() => route`/rest/api/3/project`);
      if (basicProjRes && basicProjRes.ok) {
        const basicProjs = (await basicProjRes.json()) as JiraSpace[];
        for (const p of (basicProjs || [])) {
          if (!seenProjectKeys.has(p.key.toUpperCase())) {
            seenProjectKeys.add(p.key.toUpperCase());
            spaces.push(p);
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching fallback projects list:', e);
    }
  }

  // Synthesize a space-level entry for EVERY Project/Space so users can always evaluate by Space directly
  spaces.forEach(space => {
    let numId = Number(space.id);
    if (isNaN(numId) || numId <= 0) {
      numId = Math.abs(space.key.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000;
    }
    const synthesizedId = -numId;
    if (!seenBoardIds.has(synthesizedId)) {
      seenBoardIds.add(synthesizedId);
      boards.push({
        id: synthesizedId,
        name: `${space.name} (${space.key})`,
        type: space.projectTypeKey || 'project',
        location: {
          projectId: Number(space.id) || undefined,
          projectKey: space.key,
          projectName: space.name,
          displayName: space.name,
          projectTypeKey: space.projectTypeKey
        }
      });
    }
  });

  // Parse story points custom field definition
  let spFieldId = 'customfield_10016';
  if (fieldsRes && fieldsRes.ok) {
    try {
      const fields = (await fieldsRes.json()) as JiraFieldDefinition[];
      const spField = fields.find(f =>
        f.name.toLowerCase().includes('story point') && f.custom
      );
      if (spField?.id) {
        spFieldId = spField.id;
      }
    } catch (e) {
      console.warn('Failed to parse Jira fields definition:', e);
    }
  }

  return {
    boards: boards.sort((a, b) => {
      // Sort Scrum & Kanban boards first, then Spaces, alphabetically
      const aIsSpace = a.id < 0;
      const bIsSpace = b.id < 0;
      if (aIsSpace !== bIsSpace) return aIsSpace ? 1 : -1;
      return a.name.localeCompare(b.name);
    }),
    spaces: spaces.sort((a, b) => a.name.localeCompare(b.name)),
    storyPointsField: spFieldId,
  };
}

export async function getStoryPointsFields(): Promise<Array<{ id: string; name: string; isRecommended?: boolean }>> {
  try {
    const res = await fetchJiraWithFallback(() => route`/rest/api/3/field`);
    if (!res || !res.ok) return [{ id: 'customfield_10016', name: 'Story Points (Default)', isRecommended: true }];
    const fields = (await res.json()) as JiraFieldDefinition[];
    
    const candidateFields = fields
      .filter(f => {
        const n = f.name.toLowerCase();
        return (
          n.includes('story point') ||
          n.includes('story points') ||
          n.includes('estimate') ||
          n.includes('estimation') ||
          n.includes('points') ||
          f.id === 'customfield_10016' ||
          f.id === 'customfield_10028'
        );
      })
      .map(f => {
        const n = f.name.toLowerCase();
        const isRecommended = n === 'story points' || n === 'story point estimate' || f.id === 'customfield_10016';
        return {
          id: f.id,
          name: f.name,
          isRecommended
        };
      });

    if (candidateFields.length === 0) {
      return [{ id: 'customfield_10016', name: 'Story Points (Default)', isRecommended: true }];
    }

    return candidateFields.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
  } catch (e) {
    console.warn('Error fetching Jira fields:', e);
    return [{ id: 'customfield_10016', name: 'Story Points (Default)', isRecommended: true }];
  }
}
