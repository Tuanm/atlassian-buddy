import type {
  ConfluenceAttachment,
  ConfluencePage,
  ConfluenceSpace,
  PaginatedResponse,
} from '../types/confluence';
import type { AttachmentMeta, PaginatedResult } from '../types/mcp';
import { AtlassianClient } from './client';

const PAGE_LIMIT = 25;

export class ConfluenceClient extends AtlassianClient {
  async listSpaces(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResult<ConfluenceSpace>> {
    const limit = params?.limit || PAGE_LIMIT;
    const path = params?.cursor
      ? `/wiki/api/v2/spaces?limit=${limit}&cursor=${params.cursor}`
      : `/wiki/api/v2/spaces?limit=${limit}`;

    const response = await this.fetch<PaginatedResponse<ConfluenceSpace>>(path);
    return this.buildPaginatedResult(response.results, response._links?.next);
  }

  async getSpace(spaceKey: string): Promise<ConfluenceSpace | null> {
    try {
      const response = await this.fetch<PaginatedResponse<ConfluenceSpace>>(
        `/wiki/api/v2/spaces?keys=${spaceKey}&limit=1`
      );
      return response.results[0] || null;
    } catch {
      return null;
    }
  }

  async searchPages(
    query: string,
    spaceKey?: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResult<ConfluencePage>> {
    const limit = params?.limit || PAGE_LIMIT;
    let path = `/wiki/api/v2/spaces?limit=${limit}`;
    if (spaceKey) path += `&keys=${spaceKey}`;

    const spacesResponse = await this.fetch<PaginatedResponse<ConfluenceSpace>>(path);
    const spaceIds = spacesResponse.results.map((s) => s.id);

    if (spaceIds.length === 0) {
      return { results: [], hasMore: false };
    }

    const cql = spaceKey ? `space="${spaceKey}" AND title~"${query}"` : `title~"${query}"`;

    const searchPath = `/wiki/api/v2/search?cql=${encodeURIComponent(cql)}&limit=${limit}${
      params?.cursor ? `&cursor=${params.cursor}` : ''
    }`;

    const searchResponse = await this.fetch<{
      results: ConfluencePage[];
      _links?: { next?: string };
    }>(searchPath);

    return this.buildPaginatedResult(searchResponse.results, searchResponse._links?.next);
  }

  async getPage(pageId: string): Promise<ConfluencePage> {
    return this.fetch<ConfluencePage>(`/wiki/api/v2/pages/${pageId}?body-format=storage`);
  }

  async getPageChildren(
    pageId: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResult<ConfluencePage>> {
    const limit = params?.limit || PAGE_LIMIT;
    const path = params?.cursor
      ? `/wiki/api/v2/pages/${pageId}/children?limit=${limit}&cursor=${params.cursor}`
      : `/wiki/api/v2/pages/${pageId}/children?limit=${limit}`;

    const response = await this.fetch<PaginatedResponse<ConfluencePage>>(path);
    return this.buildPaginatedResult(response.results, response._links?.next);
  }

  async getAttachments(pageId: string): Promise<AttachmentMeta[]> {
    const attachments: AttachmentMeta[] = [];
    let cursor: string | undefined;

    do {
      const path = cursor
        ? `/wiki/api/v2/pages/${pageId}/attachments?limit=${PAGE_LIMIT}&cursor=${cursor}`
        : `/wiki/api/v2/pages/${pageId}/attachments?limit=${PAGE_LIMIT}`;

      const response = await this.fetch<PaginatedResponse<ConfluenceAttachment>>(path);
      for (const att of response.results) {
        attachments.push({
          id: att.id,
          filename: att.title,
          size: att.fileSize,
          mimeType: att.mediaType,
        });
      }
      cursor = this.extractCursor(response._links?.next);
    } while (cursor);

    return attachments;
  }

  async downloadAttachment(
    attachmentId: string
  ): Promise<{ filename: string; mimeType: string; data: string }> {
    const { data, contentType } = await this.fetchBinary(
      `/wiki/api/v2/attachments/${attachmentId}/download`
    );
    return {
      filename: 'unknown',
      mimeType: contentType,
      data: data.toString('base64'),
    };
  }
}
