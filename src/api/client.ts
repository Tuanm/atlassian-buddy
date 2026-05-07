// Base HTTP client with Atlassian auth

import type { PaginatedResult } from '../types/mcp';

const RATE_LIMIT_DELAY_MS = 1000;
const MAX_RETRIES = 5;

export abstract class AtlassianClient {
  protected baseUrl: string;
  protected authHeader: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(authToken).toString('base64')}`;
  }

  protected async fetch<T>(path: string, retries = 0): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });

    if (response.status === 429) {
      if (retries >= MAX_RETRIES) {
        throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries`);
      }
      const delay = RATE_LIMIT_DELAY_MS * 2 ** retries;
      await this.sleep(delay);
      return this.fetch<T>(path, retries + 1);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  protected async fetchBinary(
    path: string,
    retries = 0
  ): Promise<{ data: Buffer; contentType: string; contentDisposition?: string }> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (response.status === 429) {
      if (retries >= MAX_RETRIES) {
        throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries`);
      }
      const delay = RATE_LIMIT_DELAY_MS * 2 ** retries;
      await this.sleep(delay);
      return this.fetchBinary(path, retries + 1);
    }

    if (!response.ok) {
      throw new Error(`Download failed ${response.status}: ${path}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition');
    const arrayBuffer = await response.arrayBuffer();
    return { data: Buffer.from(arrayBuffer), contentType, contentDisposition };
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected extractCursor(nextLink?: string): string | undefined {
    if (!nextLink) return undefined;
    const match = nextLink.match(/cursor=([^&]+)/);
    return match ? match[1] : undefined;
  }

  protected buildPaginatedResult<T>(results: T[], nextLink?: string): PaginatedResult<T> {
    return {
      results,
      nextCursor: this.extractCursor(nextLink),
      hasMore: !!nextLink,
    };
  }
}
