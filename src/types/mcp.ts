// MCP Tool schemas

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// Pagination helpers
export interface ListParams {
  cursor?: string;
  limit?: number;
}

// Attachment metadata (returned in page/issue)
export interface AttachmentMeta {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
}

export interface DownloadResult {
  filename: string;
  mimeType: string;
  path: string;
}

// Space summary
export interface SpaceSummary {
  id: string;
  key: string;
  name: string;
}

// Project summary
export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
}

// Page result
export interface PageResult {
  id: string;
  title: string;
  body: string;
  parentId?: string;
  version: number;
  updated: string;
  attachments: AttachmentMeta[];
}

// Issue result
export interface IssueResult {
  id: string;
  key: string;
  summary: string;
  description: string;
  type: string;
  status: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
  resolved?: string;
  labels: string[];
  attachments: AttachmentMeta[];
  comments: CommentResult[];
}

// Comment result
export interface CommentResult {
  id: string;
  author: string;
  body: string;
  created: string;
}
