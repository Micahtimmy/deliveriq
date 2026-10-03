import api, { route } from '@forge/api';
import { JiraSprint } from '../types/jira';

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

export async function getSprints(boardId: number): Promise<JiraSprint[]> {
  const sprints: JiraSprint[] = [];
  let startAt = 0;

  while (true) {
    const res = await fetchJiraWithFallback(
      () => route`/rest/agile/1.0/board/${boardId}/sprint?state=closed,active&startAt=${startAt}&maxResults=50`
    );

    if (!res) break;

    if (res.status === 400 || res.status === 404) {
      // Board does not support sprints (e.g. Kanban board) or has no sprints
      return [];
    }

    if (!res.ok) break;

    const data = (await res.json()) as { values?: JiraSprint[]; isLast?: boolean; total?: number };
    const fetchedValues = data.values || [];
    sprints.push(...fetchedValues);

    if (data.isLast === true || fetchedValues.length === 0 || fetchedValues.length < 50) break;
    if (typeof data.total === 'number' && data.total > 0 && sprints.length >= data.total) break;
    startAt += fetchedValues.length;
  }

  return sprints.sort((a, b) =>
    new Date(b.endDate || b.startDate || 0).getTime() - new Date(a.endDate || a.startDate || 0).getTime()
  );
}
