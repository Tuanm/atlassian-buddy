import { describe, expect, test } from 'bun:test';
import { AtlassianClient } from '../api/client';

class TestClient extends AtlassianClient {
  constructor() {
    super('https://test.atlassian.net', 'test:test');
  }

  extractCursor(link?: string) {
    return super.extractCursor(link);
  }

  buildPaginatedResult<T>(results: T[], nextLink?: string) {
    return super.buildPaginatedResult(results, nextLink);
  }
}

describe('AtlassianClient', () => {
  const client = new TestClient();

  describe('extractCursor', () => {
    test('extracts cursor from next link', () => {
      const cursor = client.extractCursor('/api/spaces?cursor=abc123&limit=25');
      expect(cursor).toBe('abc123');
    });

    test('returns undefined when no cursor', () => {
      expect(client.extractCursor(undefined)).toBeUndefined();
      expect(client.extractCursor('/api/spaces?limit=25')).toBeUndefined();
    });
  });

  describe('buildPaginatedResult', () => {
    test('returns results without pagination when no next link', () => {
      const result = client.buildPaginatedResult(['a', 'b', 'c']);
      expect(result.results).toEqual(['a', 'b', 'c']);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    test('sets hasMore and nextCursor when next link present', () => {
      const result = client.buildPaginatedResult(['a', 'b'], '/api?cursor=xyz');
      expect(result.results).toEqual(['a', 'b']);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('xyz');
    });
  });
});
