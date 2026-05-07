import { writeFileSync } from 'node:fs';
import type {
  JiraAttachment,
  JiraComment,
  JiraIssue,
  JiraPaginatedResponse,
  JiraProject,
} from '../types/jira';
import type { AttachmentMeta, DownloadResult, PaginatedResult } from '../types/mcp';
import { AtlassianClient } from './client';

const MAX_RESULTS = 100;

export class JiraClient extends AtlassianClient {
  async listProjects(params?: {
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResult<JiraProject>> {
    const limit = params?.limit || MAX_RESULTS;
    const path = `/rest/api/3/project?limit=${limit}`;
    const projects = await this.fetch<JiraProject[]>(path);
    return {
      results: projects,
      hasMore: false,
    };
  }

  async getProject(projectKey: string): Promise<JiraProject | null> {
    try {
      return await this.fetch<JiraProject>(`/rest/api/3/project/${projectKey}`);
    } catch {
      return null;
    }
  }

  async searchIssues(
    query?: string,
    jql?: string,
    params?: { limit?: number; cursor?: string }
  ): Promise<PaginatedResult<JiraIssue>> {
    const limit = params?.limit || MAX_RESULTS;
    const startAt = params?.cursor ? parseInt(params.cursor, 10) : 0;

    let finalJql = jql;
    if (query) {
      const escapedQuery = query.replace(/"/g, '\\"');
      finalJql = `(summary ~ "${escapedQuery}" OR description ~ "${escapedQuery}" OR environment ~ "${escapedQuery}")`;
      if (jql) {
        finalJql = `${finalJql} AND (${jql})`;
      }
    }

    if (!finalJql) {
      finalJql = 'ORDER BY created DESC';
    }

    const searchParams = new URLSearchParams({
      jql: finalJql,
      startAt: startAt.toString(),
      maxResults: limit.toString(),
      expand: 'renderedFields,changelog',
      fields: '*all',
    });

    const response = await this.fetch<JiraPaginatedResponse<JiraIssue>>(
      `/rest/api/3/search/jql?${searchParams.toString()}`
    );

    const nextCursor =
      startAt + response.issues.length < response.total
        ? String(startAt + response.issues.length)
        : undefined;

    return {
      results: response.issues,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    return this.fetch<JiraIssue>(
      `/rest/api/3/issue/${issueKey}?expand=renderedFields,changelog,attachment`
    );
  }

  async getIssueComments(issueKey: string): Promise<JiraComment[]> {
    const response = await this.fetch<{ comments: JiraComment[] }>(
      `/rest/api/3/issue/${issueKey}/comment`
    );
    return response.comments || [];
  }

  async getIssueChangelog(issueKey: string): Promise<JiraChangelogHistory[]> {
    const histories: JiraChangelogHistory[] = [];
    let cursor: string | undefined;

    do {
      let path = `/rest/api/3/issue/${issueKey}/changelog`;
      if (cursor) path += `?cursor=${encodeURIComponent(cursor)}`;

      const response = await this.fetch<{
        values: JiraChangelogHistory[];
        isLast: boolean;
        nextPage?: string;
      }>(path);
      histories.push(...(response.values || []));
      cursor = response.nextPage;
    } while (cursor);

    return histories;
  }

  async downloadAttachment(attachmentId: string, downloadPath: string): Promise<DownloadResult> {
    const attachment = await this.fetch<{ content: string; filename: string; mimeType: string }>(
      `/rest/api/3/attachment/${attachmentId}`
    );
    const { data, contentType, contentDisposition } = await this.fetchBinary(attachment.content);
    const filename = this.extractFilename(contentDisposition) || attachment.filename;
    try {
      writeFileSync(downloadPath, data);
    } catch (err) {
      throw new Error(
        `Failed to save attachment to ${downloadPath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    return { filename, mimeType: contentType, path: downloadPath };
  }

  private extractFilename(contentDisposition?: string): string | undefined {
    if (!contentDisposition) return undefined;
    const match = contentDisposition.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|([^;\n]*))/i);
    return match?.[2] || match?.[3];
  }
}

export function extractAttachmentMeta(attachment: JiraAttachment): AttachmentMeta {
  return {
    id: attachment.id,
    filename: attachment.filename,
    size: attachment.size,
    mimeType: attachment.mimeType,
  };
}

export function extractTextFromADF(adf: unknown): string {
  if (!adf || typeof adf !== 'object') {
    return String(adf || '');
  }

  const node = adf as {
    type?: string;
    content?: unknown[];
    text?: string;
    attrs?: { level?: number };
  };

  if (node.type === 'doc' && node.content) {
    return node.content.map((n) => extractTextFromADF(n)).join('\n\n');
  }

  if (node.type === 'paragraph' && node.content) {
    return node.content.map((n) => extractTextFromADF(n)).join('');
  }

  if (node.type === 'text') {
    return node.text || '';
  }

  if (node.type === 'codeBlock' && node.content) {
    const code = node.content.map((n) => extractTextFromADF(n)).join('');
    return `\`\`\`\n${code}\n\`\`\``;
  }

  if (node.type === 'heading' && node.content) {
    const level = node.attrs?.level || 1;
    const text = node.content.map((n) => extractTextFromADF(n)).join('');
    return `${'#'.repeat(level)} ${text}`;
  }

  if (node.content) {
    return node.content.map((n) => extractTextFromADF(n)).join('');
  }

  return '';
}
