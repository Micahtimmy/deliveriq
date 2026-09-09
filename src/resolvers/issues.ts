import api, { route } from '@forge/api';
import { JiraIssue } from '../types/jira';

export async function getIssues(
  boardId: number,
  sprintIds: number[],
  storyPointsField: string
): Promise<JiraIssue[]> {
  const fields = [
    'summary', 'assignee', 'status', 'resolution', 'resolutiondate',
    'duedate', 'issuetype', 'comment', 'issuelinks',
    storyPointsField,
  ].join(',');

  // Fetch all selected sprints concurrently
  const sprintIssuesNested = await Promise.all(
    sprintIds.map(async (sprintId) => {
      const sprintIssues: JiraIssue[] = [];
      let startAt = 0;

      while (true) {
        const res = await api.asUser().requestJira(
          route`/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=100&fields=${fields}&expand=changelog`,
          { headers: { Accept: 'application/json' } }
        );
        if (!res.ok) throw new Error(`Failed to fetch issues for sprint ${sprintId}: ${res.status}`);

        const data = (await res.json()) as { issues: JiraIssue[]; total: number };
        const fetched = data.issues || [];
        sprintIssues.push(...fetched);

        if (startAt + 100 >= (data.total || 0) || fetched.length === 0) break;
        startAt += 100;
      }
      return sprintIssues;
    })
  );

  const allIssues: JiraIssue[] = [];
  const seenKeys = new Set<string>();

  sprintIssuesNested.flat().forEach(issue => {
    if (!seenKeys.has(issue.key)) {
      // Normalize story points field to a consistent key
      (issue.fields as Record<string, unknown>)['story_points'] =
        (issue.fields as Record<string, unknown>)[storyPointsField] as number ?? null;
      allIssues.push(issue);
      seenKeys.add(issue.key);
    }
  });

  // Only return resolved issues (resolutiondate set and assignee not null)
  return allIssues.filter(
    i => i.fields.resolutiondate && i.fields.assignee &&
         i.fields.resolution?.name !== "Won't Do" &&
         i.fields.resolution?.name !== 'Duplicate'
  );
}

