import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE_DIR = '.atlassian-buddy';

export function extractDomain(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return url.hostname;
  } catch {
    return 'unknown';
  }
}

export function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace('~', homedir());
  }
  return path;
}

function ensureDir(dirPath: string): void {
  const expanded = expandPath(dirPath);
  if (!existsSync(expanded)) {
    mkdirSync(expanded, { recursive: true });
  }
}

export function writeJson(filePath: string, data: unknown): void {
  const expanded = expandPath(filePath);
  ensureDir(expanded);
  try {
    writeFileSync(expanded, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    throw new Error(
      `Failed to write JSON to ${expanded}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function writeText(filePath: string, content: string): void {
  const expanded = expandPath(filePath);
  ensureDir(expanded);
  try {
    writeFileSync(expanded, content, 'utf-8');
  } catch (err) {
    throw new Error(
      `Failed to write text to ${expanded}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function writeBinary(filePath: string, data: Buffer): void {
  const expanded = expandPath(filePath);
  ensureDir(expanded);
  try {
    writeFileSync(expanded, data);
  } catch (err) {
    throw new Error(
      `Failed to write binary to ${expanded}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function buildConfluencePagePath(domain: string, spaceId: string, pageId: string): string {
  return join(BASE_DIR, 'wiki', domain, spaceId, pageId);
}

export function buildJiraIssuePath(domain: string, projectKey: string, issueKey: string): string {
  return join(BASE_DIR, 'jira', domain, projectKey, issueKey);
}
