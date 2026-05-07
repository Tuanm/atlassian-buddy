// Confluence API types

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: 'global' | 'personal';
  description?: {
    plain: { value: string };
  };
  homepageId?: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  spaceId: string;
  parentId?: string;
  status: 'current' | 'archived' | 'deleted';
  body?: {
    storage: {
      value: string;
      representation: 'storage';
    };
  };
  version?: {
    number: number;
    createdAt: string;
  };
  _links?: {
    webui: string;
  };
}

export interface ConfluenceAttachment {
  id: string;
  title: string;
  mediaType: string;
  fileSize: number;
  downloadLink?: string;
  pageId?: string;
  _links?: {
    download?: string;
  };
}

export interface PaginatedResponse<T> {
  results: T[];
  _links?: {
    next?: string;
  };
  size?: number;
  start?: number;
}

export interface ConfluenceConfig {
  baseUrl: string;
  authToken: string; // email:api_token
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  results: T[];
  nextCursor?: string;
  hasMore: boolean;
}
