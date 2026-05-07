import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  buildConfluencePagePath,
  buildJiraIssuePath,
  expandPath,
  extractDomain,
} from '../utils/storage';

describe('extractDomain', () => {
  test('extracts domain from cloud url', () => {
    expect(extractDomain('https://yoursite.atlassian.net/wiki')).toBe('yoursite.atlassian.net');
  });

  test('extracts domain from server url', () => {
    expect(extractDomain('https://confluence.company.com/wiki')).toBe('confluence.company.com');
  });

  test('handles url with port', () => {
    expect(extractDomain('https://internal.company.com:8443/wiki')).toBe('internal.company.com');
  });

  test('handles url with trailing slash', () => {
    expect(extractDomain('https://site.atlassian.net/wiki/')).toBe('site.atlassian.net');
  });

  test('handles url without /wiki', () => {
    expect(extractDomain('https://jira.company.com')).toBe('jira.company.com');
  });

  test('returns unknown for invalid url', () => {
    expect(extractDomain('not-a-url')).toBe('unknown');
    expect(extractDomain('')).toBe('unknown');
  });
});

describe('expandPath', () => {
  const homeDir = homedir();

  test('expands tilde to home directory', () => {
    expect(expandPath('~/documents')).toBe(join(homeDir, 'documents'));
    expect(expandPath('~')).toBe(homeDir);
  });

  test('returns path unchanged if not starting with tilde', () => {
    expect(expandPath('/absolute/path')).toBe('/absolute/path');
    expect(expandPath('relative/path')).toBe('relative/path');
    expect(expandPath('/home/user/file.txt')).toBe('/home/user/file.txt');
  });
});

describe('buildConfluencePagePath', () => {
  test('builds correct path', () => {
    const path = buildConfluencePagePath('yoursite.atlassian.net', 'TEAM', '12345');
    expect(path).toBe('.atlassian-buddy/wiki/yoursite.atlassian.net/TEAM/12345');
  });

  test('handles different domains', () => {
    const path1 = buildConfluencePagePath('confluence.company.com', 'PROJ', 'page1');
    expect(path1).toBe('.atlassian-buddy/wiki/confluence.company.com/PROJ/page1');
  });

  test('handles spaces in space key', () => {
    const path = buildConfluencePagePath('site.atlassian.net', 'MY PROJECT', '999');
    expect(path).toBe('.atlassian-buddy/wiki/site.atlassian.net/MY PROJECT/999');
  });
});

describe('buildJiraIssuePath', () => {
  test('builds correct path', () => {
    const path = buildJiraIssuePath('yoursite.atlassian.net', 'TEAM', 'TEAM-123');
    expect(path).toBe('.atlassian-buddy/jira/yoursite.atlassian.net/TEAM/TEAM-123');
  });

  test('handles different projects', () => {
    const path = buildJiraIssuePath('jira.company.com', 'BANCSTAC', 'BANCSTAC-456');
    expect(path).toBe('.atlassian-buddy/jira/jira.company.com/BANCSTAC/BANCSTAC-456');
  });

  test('handles hyphenated project keys', () => {
    const path = buildJiraIssuePath('site.atlassian.net', 'MY-PROJ', 'MY-PROJ-789');
    expect(path).toBe('.atlassian-buddy/jira/site.atlassian.net/MY-PROJ/MY-PROJ-789');
  });
});
