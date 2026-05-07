// Jira API types

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  lead?: {
    displayName: string;
    emailAddress: string;
  };
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
  renderedFields?: {
    description?: string;
    [key: string]: unknown;
  };
  changelog?: {
    histories: JiraChangelogHistory[];
  };
}

export interface JiraIssueFields {
  summary: string;
  description?: unknown; // ADF format
  issuetype: {
    name: string;
    iconUrl?: string;
  };
  status: {
    name: string;
    statusCategory: {
      name: string;
      colorName: string;
    };
  };
  priority?: {
    name: string;
    iconUrl?: string;
  };
  assignee?: {
    displayName: string;
    emailAddress?: string;
  };
  reporter?: {
    displayName: string;
    emailAddress?: string;
  };
  created: string;
  updated: string;
  resolutiondate?: string;
  labels?: string[];
  components?: Array<{ name: string }>;
  fixVersions?: Array<{ name: string }>;
  versions?: Array<{ name: string }>;
  attachment?: JiraAttachment[];
  comment?: {
    comments: JiraComment[];
  };
  subtasks?: Array<{
    key: string;
    fields: {
      summary: string;
      status: { name: string };
    };
  }>;
  parent?: {
    key: string;
    fields: { summary: string };
  };
  [key: string]: unknown;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
  created: string;
  author: {
    displayName: string;
  };
}

export interface JiraComment {
  id: string;
  author: {
    displayName: string;
    emailAddress?: string;
  };
  body: unknown; // ADF format
  renderedBody?: string;
  created: string;
  updated: string;
}

export interface JiraChangelogHistory {
  id: string;
  author: {
    displayName: string;
  };
  created: string;
  items: Array<{
    field: string;
    fieldtype: string;
    from?: string;
    fromString?: string;
    to?: string;
    toString?: string;
  }>;
}

export interface JiraPaginatedResponse<T> {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: T[];
}

export interface JiraConfig {
  baseUrl: string;
  authToken: string; // email:api_token
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active?: boolean;
  timeZone?: string;
  accountType?: string;
  avatarUrls?: {
    '48x48': string;
    '32x32': string;
    '24x24': string;
    '16x16': string;
  };
}

export interface PaginatedResult<T> {
  results: T[];
  nextCursor?: string;
  hasMore: boolean;
}
