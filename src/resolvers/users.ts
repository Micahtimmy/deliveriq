import api, { route } from '@forge/api';

export interface JiraUserSearchItem {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active?: boolean;
  accountType?: string;
}

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

export async function searchJiraUsers(query: string = ''): Promise<JiraUserSearchItem[]> {
  const cleanQuery = (query || '').trim();
  const seenAccountIds = new Set<string>();
  const results: JiraUserSearchItem[] = [];

  try {
    let rawUsers: JiraUserSearchItem[] = [];

    if (cleanQuery.length > 0) {
      // 1. Try standard query user search (up to 100 results)
      const res = await fetchJiraWithFallback(
        () => route`/rest/api/3/user/search?query=${cleanQuery}&maxResults=100`
      );

      if (res && res.ok) {
        rawUsers = (await res.json()) as JiraUserSearchItem[];
      }

      // 2. If user/search didn't return anything or failed, try user picker
      if (!rawUsers || rawUsers.length === 0) {
        const pickerRes = await fetchJiraWithFallback(
          () => route`/rest/api/3/user/picker?query=${cleanQuery}&maxResults=100`
        );
        if (pickerRes && pickerRes.ok) {
          const pickerData = (await pickerRes.json()) as { users?: Array<{ accountId: string; displayName: string; avatarUrl?: string; html?: string }> };
          if (pickerData && Array.isArray(pickerData.users)) {
            rawUsers = pickerData.users.map(u => ({
              accountId: u.accountId,
              displayName: u.displayName,
              avatarUrls: u.avatarUrl ? { '24x24': u.avatarUrl } : undefined,
              active: true,
            }));
          }
        }
      }
    } else {
      // Query is empty: fetch active instance users (up to 100)
      const res = await fetchJiraWithFallback(
        () => route`/rest/api/3/users/search?maxResults=100`
      );

      if (res && res.ok) {
        rawUsers = (await res.json()) as JiraUserSearchItem[];
      }

      // If /users/search failed, try /rest/api/3/users
      if (!rawUsers || rawUsers.length === 0) {
        const altRes = await fetchJiraWithFallback(
          () => route`/rest/api/3/users?maxResults=100`
        );
        if (altRes && altRes.ok) {
          rawUsers = (await altRes.json()) as JiraUserSearchItem[];
        }
      }

      // If still empty, try user/search with wildcard/empty query
      if (!rawUsers || rawUsers.length === 0) {
        const searchWildcardRes = await fetchJiraWithFallback(
          () => route`/rest/api/3/user/search?query=%&maxResults=100`
        );
        if (searchWildcardRes && searchWildcardRes.ok) {
          rawUsers = (await searchWildcardRes.json()) as JiraUserSearchItem[];
        }
      }
    }

    // Filter valid human and active users and deduplicate
    for (const u of (rawUsers || [])) {
      if (
        u.accountId &&
        u.displayName &&
        u.accountType !== 'app' &&
        !seenAccountIds.has(u.accountId)
      ) {
        seenAccountIds.add(u.accountId);
        results.push({
          accountId: u.accountId,
          displayName: u.displayName,
          emailAddress: u.emailAddress,
          avatarUrls: u.avatarUrls,
          active: u.active !== false,
        });
      }
    }

    return results.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } catch (e) {
    console.error('Error searching Jira users:', e);
    return [];
  }
}
