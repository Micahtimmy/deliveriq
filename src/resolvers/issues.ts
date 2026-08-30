import api, { route } from '@forge/api';
import { JiraIssue } from '../types/jira';

export async function getIssues(
  boardId: number,
  sprintIds: number[],
  storyPointsField: string
): Promise<JiraIssue[]> {
  const allIssues: JiraIssue[] = [];
  const seenKeys = new Set<string>();

  for (const sprintId of sprintIds) {
    let startAt = 0;
    const fields = [
      'summary', 'assignee', 'status', 'resolution', 'resolutiondate',
      'duedate', 'issuetype', 'comment', 'issuelinks',
      storyPointsField,
    ].join(',');

    while (true) {
      const res = await api.asUser().requestJira(
        route`/rest/agile/1.0/board/${boardId}/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=100&fields=${fields}&expand=changelog`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) throw new Error(`Failed to fetch issues for sprint ${sprintId}: ${res.status}`);

      const data = await res.json() as { issues: JiraIssue[]; total: number };

      // Deduplicate across sprints
      (data.issues || []).forEach(issue => {
        if (!seenKeys.has(issue.key)) {
          // Normalize story points field to a consistent key
          (issue.fields as Record<string, unknown>)['story_points'] =
            (issue.fields as Record<string, unknown>)[storyPointsField] as number ?? null;
          allIssues.push(issue);
          seenKeys.add(issue.key);
        }
      });

      if (startAt + 100 >= (data.total || 0)) break;
      startAt += 100;
    }
  }

  // Only return resolved issues (resolutiondate set and assignee not null)
  return allIssues.filter(
    i => i.fields.resolutiondate && i.fields.assignee &&
         i.fields.resolution?.name !== "Won't Do" &&
         i.fields.resolution?.name !== 'Duplicate'
  );
}
