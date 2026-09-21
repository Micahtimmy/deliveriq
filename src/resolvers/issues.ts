import api, { route } from '@forge/api';
import { JiraIssue } from '../types/jira';

/**
 * Execute JQL search to fetch issues with full changelog & fields for Kanban / Space boards
 */
async function fetchIssuesByJql(
  jql: string,
  fields: string[],
  maxLimit: number = 300
): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = [];
  let nextPageToken: string | undefined = undefined;

  while (allIssues.length < maxLimit) {
    const payload: Record<string, unknown> = {
      jql,
      maxResults: Math.min(100, maxLimit - allIssues.length),
      fields,
      expand: ['changelog'],
    };
    if (nextPageToken) {
      payload.nextPageToken = nextPageToken;
    }

    // 1. Try POST /rest/api/3/search/jql
    let res = await api.asUser().requestJira(
      route`/rest/api/3/search/jql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    // 2. Fallback to POST /rest/api/2/search if v3/jql returns 404/410
    if (!res.ok && (res.status === 404 || res.status === 410)) {
      res = await api.asUser().requestJira(
        route`/rest/api/2/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            jql,
            maxResults: payload.maxResults,
            fields,
            expand: 'changelog',
          }),
        }
      );
    }

    if (!res.ok) {
      console.warn(`JQL Search returned status ${res.status} for query: ${jql}`);
      break;
    }

    const data = (await res.json()) as {
      issues?: JiraIssue[];
      nextPageToken?: string;
      total?: number;
      isLast?: boolean;
    };

    const fetched = data.issues || [];
    allIssues.push(...fetched);

    if (data.isLast || !data.nextPageToken || fetched.length === 0 || allIssues.length >= (data.total || maxLimit)) {
      break;
    }
    nextPageToken = data.nextPageToken;
  }

  return allIssues;
}

export async function getIssues(
  boardId: number,
  sprintIds: number[],
  storyPointsField: string,
  dateRange?: { startDate: string; endDate: string },
  projectKey?: string
): Promise<JiraIssue[]> {
  const fieldsList = [
    'summary', 'assignee', 'status', 'resolution', 'resolutiondate',
    'duedate', 'issuetype', 'comment', 'issuelinks', 'project',
    storyPointsField,
  ];
  const fieldsParam = fieldsList.join(',');

  const hasScrumSprints = sprintIds.some(id => id > 0);

  // 1. If Scrum sprints are explicitly provided, fetch via Agile REST API
  if (hasScrumSprints) {
    const validSprintIds = sprintIds.filter(id => id > 0);
    const sprintIssuesNested = await Promise.all(
      validSprintIds.map(async (sprintId) => {
        const sprintIssues: JiraIssue[] = [];
        let startAt = 0;

        while (true) {
          const res = await api.asUser().requestJira(
            route`/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=100&fields=${fieldsParam}&expand=changelog`,
            { headers: { Accept: 'application/json' } }
          );
          if (!res.ok) {
            console.warn(`Failed to fetch issues for sprint ${sprintId}: ${res.status}`);
            break;
          }

          const data = (await res.json()) as { issues?: JiraIssue[]; total?: number; isLast?: boolean };
          const fetched = data.issues || [];
          sprintIssues.push(...fetched);

          if (data.isLast === true || fetched.length === 0 || fetched.length < 100) break;
          if (typeof data.total === 'number' && data.total > 0 && startAt + fetched.length >= data.total) break;
          startAt += fetched.length;
        }
        return sprintIssues;
      })
    );

    const allIssues: JiraIssue[] = [];
    const seenKeys = new Set<string>();

    sprintIssuesNested.flat().forEach(issue => {
      if (!seenKeys.has(issue.key)) {
        (issue.fields as Record<string, unknown>)['story_points'] =
          (issue.fields as Record<string, unknown>)[storyPointsField] as number ?? null;
        allIssues.push(issue);
        seenKeys.add(issue.key);
      }
    });

    return allIssues.filter(
      i => i.fields.resolutiondate && i.fields.assignee &&
           i.fields.resolution?.name !== "Won't Do" &&
           i.fields.resolution?.name !== 'Duplicate'
    );
  }

  // 2. Kanban Board / Space / Date Range timeline query via JQL
  let targetProjectKey = projectKey;
  if (!targetProjectKey && boardId > 0) {
    try {
      const bRes = await api.asUser().requestJira(
        route`/rest/agile/1.0/board/${boardId}`,
        { headers: { Accept: 'application/json' } }
      );
      if (bRes.ok) {
        const bData = (await bRes.json()) as { location?: { projectKey?: string } };
        targetProjectKey = bData.location?.projectKey;
      }
    } catch (e) {
      console.warn(`Could not resolve location for board ${boardId}:`, e);
    }
  }

  // Construct precise JQL based on date range or rolling timeline
  let jql = 'resolution IS NOT EMPTY';

  if (targetProjectKey) {
    jql += ` AND project = "${targetProjectKey}"`;
  }

  if (dateRange?.startDate && dateRange?.endDate) {
    jql += ` AND resolutiondate >= "${dateRange.startDate}" AND resolutiondate <= "${dateRange.endDate} 23:59"`;
  } else {
    // Default to last 30 days if no date range specified for Kanban
    jql += ' AND resolutiondate >= -30d';
  }

  jql += ' ORDER BY resolutiondate DESC';

  const rawJqlIssues = await fetchIssuesByJql(jql, fieldsList, 300);

  const seenKeys = new Set<string>();
  const normalizedIssues: JiraIssue[] = [];

  rawJqlIssues.forEach(issue => {
    if (!seenKeys.has(issue.key)) {
      (issue.fields as Record<string, unknown>)['story_points'] =
        (issue.fields as Record<string, unknown>)[storyPointsField] as number ?? null;
      normalizedIssues.push(issue);
      seenKeys.add(issue.key);
    }
  });

  return normalizedIssues.filter(
    i => i.fields.resolutiondate && i.fields.assignee &&
         i.fields.resolution?.name !== "Won't Do" &&
         i.fields.resolution?.name !== 'Duplicate'
  );
}
