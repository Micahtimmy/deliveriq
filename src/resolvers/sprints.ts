import api, { route } from '@forge/api';
import { JiraSprint } from '../types/jira';

export async function getSprints(boardId: number): Promise<JiraSprint[]> {
  const sprints: JiraSprint[] = [];
  let startAt = 0;

  while (true) {
    const res = await api.asUser().requestJira(
      route`/rest/agile/1.0/board/${boardId}/sprint?state=closed,active&startAt=${startAt}&maxResults=50`,
      { headers: { Accept: 'application/json' } }
    );

    if (res.status === 400 || res.status === 404) {
      // Board does not support sprints (e.g. Kanban board) or has no sprints
      return [];
    }

    if (!res.ok) throw new Error(`Failed to fetch sprints: ${res.status}`);
    const data = await res.json() as { values?: JiraSprint[]; isLast?: boolean; total?: number };
    const fetchedValues = data.values || [];
    sprints.push(...fetchedValues);

    if (data.isLast || fetchedValues.length === 0 || sprints.length >= (data.total || 0)) break;
    startAt += 50;
  }

  return sprints.sort((a, b) =>
    new Date(b.endDate || b.startDate || 0).getTime() - new Date(a.endDate || a.startDate || 0).getTime()
  );
}
