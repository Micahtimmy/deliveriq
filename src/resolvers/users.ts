import api, { route } from '@forge/api';

export interface JiraUserSearchItem {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active?: boolean;
}

export async function searchJiraUsers(query: string): Promise<JiraUserSearchItem[]> {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();

  try {
    const response = await api
      .asUser()
      .requestJira(route`/rest/api/3/user/search?query=${cleanQuery}&maxResults=20`);

    if (response.ok) {
      const users = (await response.json()) as JiraUserSearchItem[];
      return users.filter((u) => u.accountId && u.displayName);
    }

    // Fallback to asApp() if asUser permissions differ
    const appResponse = await api
      .asApp()
      .requestJira(route`/rest/api/3/user/search?query=${cleanQuery}&maxResults=20`);

    if (appResponse.ok) {
      const users = (await appResponse.json()) as JiraUserSearchItem[];
      return users.filter((u) => u.accountId && u.displayName);
    }

    return [];
  } catch (e) {
    console.error('Error searching Jira users:', e);
    return [];
  }
}
