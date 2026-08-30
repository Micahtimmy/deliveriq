export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: {
    projectId?: number;
    projectKey: string;
    projectName: string;
    displayName?: string;
    projectTypeKey?: string;
  };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
  completeDate?: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  avatarUrls?: {
    '48x48': string;
  };
}

export interface JiraChangelogItem {
  field: string;
  fromString: string | null;
  toString: string | null;
  from: string | null;
  to: string | null;
}

export interface JiraChangelogHistory {
  id: string;
  author: JiraUser;
  created: string;
  items: JiraChangelogItem[];
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: string | { content: Array<{ content: Array<{ text?: string }> }> };
  created: string;
}

export interface JiraIssueLink {
  type: {
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: { id: string; key: string; fields: { issuetype: { name: string } } };
  outwardIssue?: { id: string; key: string; fields: { issuetype: { name: string } } };
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    assignee: JiraUser | null;
    status: { name: string; statusCategory: { name: string } };
    resolution: { name: string } | null;
    resolutiondate: string | null;
    duedate: string | null;
    issuetype: { name: string };
    story_points?: number | null;
    customfield_10016?: number | null;
    customfield_10028?: number | null;
    comment?: { comments: JiraComment[] };
    issuelinks?: JiraIssueLink[];
    sprint?: JiraSprint;
  };
  changelog?: {
    histories: JiraChangelogHistory[];
  };
}

export interface JiraFieldDefinition {
  id: string;
  name: string;
  custom: boolean;
}
