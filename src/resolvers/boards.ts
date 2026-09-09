import api, { route } from '@forge/api';
import { JiraBoard, JiraFieldDefinition } from '../types/jira';

export async function getBoards(): Promise<{
  boards: JiraBoard[];
  storyPointsField: string;
}> {
  const maxResults = 50;

  // 1. Concurrently fetch first page of boards AND custom fields list
  const [firstPageRes, fieldsRes] = await Promise.all([
    api.asUser().requestJira(
      route`/rest/agile/1.0/board?startAt=0&maxResults=${maxResults}`,
      { headers: { Accept: 'application/json' } }
    ),
    api.asUser().requestJira(
      route`/rest/api/3/field`,
      { headers: { Accept: 'application/json' } }
    )
  ]);

  if (!firstPageRes.ok) throw new Error(`Failed to fetch boards: ${firstPageRes.status}`);

  const boards: JiraBoard[] = [];
  const firstData = (await firstPageRes.json()) as { values: JiraBoard[]; total: number; isLast?: boolean };
  boards.push(...(firstData.values || []));

  // If there are more pages, fetch remaining pages
  let startAt = maxResults;
  while (!firstData.isLast && boards.length < (firstData.total || 0)) {
    const res = await api.asUser().requestJira(
      route`/rest/agile/1.0/board?startAt=${startAt}&maxResults=${maxResults}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) break;
    const data = (await res.json()) as { values: JiraBoard[]; total: number; isLast?: boolean };
    boards.push(...(data.values || []));
    if (data.isLast || (data.values || []).length === 0) break;
    startAt += maxResults;
  }

  // Parse story points custom field definition
  let spFieldId = 'customfield_10016';
  if (fieldsRes.ok) {
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
    boards,
    storyPointsField: spFieldId,
  };
}

