import api, { route } from '@forge/api';
import { JiraBoard, JiraSpace, JiraFieldDefinition } from '../types/jira';

export async function getBoards(): Promise<{
  boards: JiraBoard[];
  spaces: JiraSpace[];
  storyPointsField: string;
}> {
  const maxResults = 50;
  const boards: JiraBoard[] = [];
  const spaces: JiraSpace[] = [];

  // Helper for resilient requests
  async function fetchWithFallback(endpoint: string) {
    try {
      const userRes = await api.asUser().requestJira(route`${endpoint}` as any, { headers: { Accept: 'application/json' } });
      if (userRes.ok) return userRes;
    } catch (e) {
      // Ignore and try app fallback
    }
    try {
      const appRes = await api.asApp().requestJira(route`${endpoint}` as any, { headers: { Accept: 'application/json' } });
      return appRes;
    } catch (e) {
      return null;
    }
  }

  // 1. Concurrently fetch first page of boards, first page of projects/spaces, and custom fields
  const [boardsResult, projectsResult, fieldsResult] = await Promise.allSettled([
    api.asUser().requestJira(
      route`/rest/agile/1.0/board?startAt=0&maxResults=${maxResults}`,
      { headers: { Accept: 'application/json' } }
    ).catch(() => api.asApp().requestJira(
      route`/rest/agile/1.0/board?startAt=0&maxResults=${maxResults}`,
      { headers: { Accept: 'application/json' } }
    )),
    api.asUser().requestJira(
      route`/rest/api/3/project/search?startAt=0&maxResults=${maxResults}&expand=insight,lead`,
      { headers: { Accept: 'application/json' } }
    ).catch(() => api.asApp().requestJira(
      route`/rest/api/3/project/search?startAt=0&maxResults=${maxResults}&expand=insight,lead`,
      { headers: { Accept: 'application/json' } }
    )),
    api.asUser().requestJira(
      route`/rest/api/3/field`,
      { headers: { Accept: 'application/json' } }
    ).catch(() => api.asApp().requestJira(
      route`/rest/api/3/field`,
      { headers: { Accept: 'application/json' } }
    ))
  ]);

  // Process Boards (Page 1)
  if (boardsResult.status === 'fulfilled' && boardsResult.value && boardsResult.value.ok) {
    try {
      const firstData = (await boardsResult.value.json()) as { values?: JiraBoard[]; isLast?: boolean; total?: number };
      const fetchedBoards = firstData.values || [];
      boards.push(...fetchedBoards);

      // Paginate through remaining boards (up to 250 boards)
      let isLastBoard = firstData.isLast === true || fetchedBoards.length < maxResults;
      let boardStartAt = fetchedBoards.length;

      while (!isLastBoard && boardStartAt < 250) {
        try {
          const res = await api.asUser().requestJira(
            route`/rest/agile/1.0/board?startAt=${boardStartAt}&maxResults=${maxResults}`,
            { headers: { Accept: 'application/json' } }
          );
          if (!res.ok) break;
          const data = (await res.json()) as { values?: JiraBoard[]; isLast?: boolean; total?: number };
          const newBoards = data.values || [];
          boards.push(...newBoards);
          if (data.isLast === true || newBoards.length === 0 || newBoards.length < maxResults) {
            isLastBoard = true;
          }
          boardStartAt += newBoards.length;
        } catch (e) {
          console.warn('Error during boards pagination:', e);
          break;
        }
      }
    } catch (e) {
      console.warn('Error parsing boards data:', e);
    }
  }

  // Process Spaces / Projects (Page 1)
  if (projectsResult.status === 'fulfilled' && projectsResult.value && projectsResult.value.ok) {
    try {
      const firstProjData = (await projectsResult.value.json()) as { values?: JiraSpace[]; isLast?: boolean; total?: number };
      const fetchedProjects = firstProjData.values || [];
      spaces.push(...fetchedProjects);

      // Paginate through remaining projects/spaces (up to 250 projects)
      let isLastProj = firstProjData.isLast === true || fetchedProjects.length < maxResults;
      let projStartAt = fetchedProjects.length;

      while (!isLastProj && projStartAt < 250) {
        try {
          const res = await api.asUser().requestJira(
            route`/rest/api/3/project/search?startAt=${projStartAt}&maxResults=${maxResults}&expand=insight,lead`,
            { headers: { Accept: 'application/json' } }
          );
          if (!res.ok) break;
          const data = (await res.json()) as { values?: JiraSpace[]; isLast?: boolean; total?: number };
          const newProjs = data.values || [];
          spaces.push(...newProjs);
          if (data.isLast === true || newProjs.length === 0 || newProjs.length < maxResults) {
            isLastProj = true;
          }
          projStartAt += newProjs.length;
        } catch (e) {
          console.warn('Error during projects/spaces pagination:', e);
          break;
        }
      }
    } catch (e) {
      console.warn('Error parsing projects data:', e);
    }
  }

  // Build a lookup map of known projects with board associations
  const projectsWithBoards = new Set<string>();
  boards.forEach(b => {
    if (b.location?.projectKey) {
      projectsWithBoards.add(b.location.projectKey.toUpperCase());
    }
  });

  // For any Space / Project that doesn't have an explicit Agile Board returned,
  // synthesize a space-level board entry so EVERY Space and Team on the instance is visible
  spaces.forEach(space => {
    const pKeyUpper = space.key.toUpperCase();
    if (!projectsWithBoards.has(pKeyUpper)) {
      let numId = Number(space.id);
      if (isNaN(numId) || numId <= 0) {
        numId = Math.abs(space.key.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) % 1000000;
      }
      boards.push({
        id: -numId,
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
      projectsWithBoards.add(pKeyUpper);
    }
  });

  // Parse story points custom field definition
  let spFieldId = 'customfield_10016';
  if (fieldsResult.status === 'fulfilled' && fieldsResult.value && fieldsResult.value.ok) {
    try {
      const fields = (await fieldsResult.value.json()) as JiraFieldDefinition[];
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
      // Sort Scrum & Kanban boards first, then Spaces
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
    const res = await api.asUser().requestJira(
      route`/rest/api/3/field`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return [{ id: 'customfield_10016', name: 'Story Points (Default)', isRecommended: true }];
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

