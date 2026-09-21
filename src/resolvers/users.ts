import api, { route } from '@forge/api';

export interface JiraUserSearchItem {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active?: boolean;
  accountType?: string;
}

export async function searchJiraUsers(query: string = ''): Promise<JiraUserSearchItem[]> {
  const cleanQuery = (query || '').trim();

  try {
    let users: JiraUserSearchItem[] = [];

    if (cleanQuery.length > 0) {
      // Search with query parameter
      const res = await api
        .asUser()
        .requestJira(route`/rest/api/3/user/search?query=${cleanQuery}&maxResults=50`);

      if (res.ok) {
        users = (await res.json()) as JiraUserSearchItem[];
      } else {
        // Fallback to asApp()
        const appRes = await api
          .asApp()
          .requestJira(route`/rest/api/3/user/search?query=${cleanQuery}&maxResults=50`);
        if (appRes.ok) {
          users = (await appRes.json()) as JiraUserSearchItem[];
        }
      }
    } else {
      // Query is empty: fetch active instance users for pre-populating dropdown
      const res = await api
        .asUser()
        .requestJira(route`/rest/api/3/users/search?maxResults=50`);

      if (res.ok) {
        users = (await res.json()) as JiraUserSearchItem[];
      } else {
        const appRes = await api
          .asApp()
          .requestJira(route`/rest/api/3/users/search?maxResults=50`);
        if (appRes.ok) {
          users = (await appRes.json()) as JiraUserSearchItem[];
        }
      }
    }

    // Filter valid human/active users
    return (users || [])
      .filter((u) => u.accountId && u.displayName && u.accountType !== 'app')
      .map((u) => ({
        accountId: u.accountId,
        displayName: u.displayName,
        emailAddress: u.emailAddress,
        avatarUrls: u.avatarUrls,
        active: u.active !== false,
      }));
  } catch (e) {
    console.error('Error searching Jira users:', e);
    return [];
  }
}

