import api, { route } from '@forge/api';
import { JiraBoard, JiraFieldDefinition } from '../types/jira';

export async function getBoards(): Promise<{
  boards: JiraBoard[];
  storyPointsField: string;
}> {
  const boards: JiraBoard[] = [];
  let startAt = 0;
  const maxResults = 50;

  while (true) {
    const res = await api.asUser().requestJira(
      route`/rest/agile/1.0/board?startAt=${startAt}&maxResults=${maxResults}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) throw new Error(`Failed to fetch boards: ${res.status}`);
    const data = await res.json() as { values: JiraBoard[]; total: number; isLast?: boolean };
    boards.push(...(data.values || []));
    if (data.isLast || boards.length >= (data.total || 0)) break;
    startAt += maxResults;
  }

  // Discover story points field
  const fieldsRes = await api.asUser().requestJira(
    route`/rest/api/3/field`,
    { headers: { Accept: 'application/json' } }
  );
  const fields = await fieldsRes.json() as JiraFieldDefinition[];
  const spField = fields.find(f =>
    f.name.toLowerCase().includes('story point') && f.custom
  );

  return {
    boards,
    storyPointsField: spField?.id || 'customfield_10016',
  };
}
