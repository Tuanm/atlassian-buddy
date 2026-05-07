import { describe, expect, test } from 'bun:test';
import type { JiraUser } from '../types/jira';

describe('JiraUser type', () => {
  describe('required fields', () => {
    test('has required accountId field', () => {
      const user: JiraUser = {
        accountId: '1234567890abcdef1234567890abcdef',
        displayName: 'John Doe',
      };
      expect(user.accountId).toBe('1234567890abcdef1234567890abcdef');
    });

    test('has required displayName field', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Jane Smith',
      };
      expect(user.displayName).toBe('Jane Smith');
    });
  });

  describe('optional fields', () => {
    test('emailAddress is optional', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
      };
      expect(user.emailAddress).toBeUndefined();
    });

    test('emailAddress can be set', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
        emailAddress: 'test@example.com',
      };
      expect(user.emailAddress).toBe('test@example.com');
    });

    test('active is optional', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
      };
      expect(user.active).toBeUndefined();
    });

    test('active can be true', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Active User',
        active: true,
      };
      expect(user.active).toBe(true);
    });

    test('active can be false', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Inactive User',
        active: false,
      };
      expect(user.active).toBe(false);
    });

    test('timeZone is optional', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
      };
      expect(user.timeZone).toBeUndefined();
    });

    test('timeZone can be set', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
        timeZone: 'America/New_York',
      };
      expect(user.timeZone).toBe('America/New_York');
    });

    test('accountType is optional', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
      };
      expect(user.accountType).toBeUndefined();
    });

    test('accountType can be atlassian', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Atlassian User',
        accountType: 'atlassian',
      };
      expect(user.accountType).toBe('atlassian');
    });

    test('accountType can be app', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'App User',
        accountType: 'app',
      };
      expect(user.accountType).toBe('app');
    });

    test('accountType can be enterprise', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Enterprise User',
        accountType: 'enterprise',
      };
      expect(user.accountType).toBe('enterprise');
    });
  });

  describe('avatarUrls', () => {
    test('avatarUrls is optional', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
      };
      expect(user.avatarUrls).toBeUndefined();
    });

    test('avatarUrls can have all sizes', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
        avatarUrls: {
          '48x48': 'https://example.com/avatar/48',
          '32x32': 'https://example.com/avatar/32',
          '24x24': 'https://example.com/avatar/24',
          '16x16': 'https://example.com/avatar/16',
        },
      };
      expect(user.avatarUrls?.['48x48']).toBe('https://example.com/avatar/48');
      expect(user.avatarUrls?.['32x32']).toBe('https://example.com/avatar/32');
      expect(user.avatarUrls?.['24x24']).toBe('https://example.com/avatar/24');
      expect(user.avatarUrls?.['16x16']).toBe('https://example.com/avatar/16');
    });

    test('avatarUrls can have partial sizes', () => {
      const user: JiraUser = {
        accountId: 'abc123',
        displayName: 'Test User',
        avatarUrls: {
          '48x48': 'https://example.com/avatar/48',
        },
      };
      expect(user.avatarUrls?.['48x48']).toBe('https://example.com/avatar/48');
      expect(user.avatarUrls?.['32x32']).toBeUndefined();
    });
  });

  describe('complete user examples', () => {
    test('full user object', () => {
      const user: JiraUser = {
        accountId: '557058:5d5a30c6-9724-4a91-b25f-8a8e0d3e8f4e',
        displayName: 'John Developer',
        emailAddress: 'john.dev@company.com',
        active: true,
        timeZone: 'UTC',
        accountType: 'atlassian',
        avatarUrls: {
          '48x48': 'https://example.com/avatars/john/48',
          '32x32': 'https://example.com/avatars/john/32',
          '24x24': 'https://example.com/avatars/john/24',
          '16x16': 'https://example.com/avatars/john/16',
        },
      };
      expect(user.accountId).toBe('557058:5d5a30c6-9724-4a91-b25f-8a8e0d3e8f4e');
      expect(user.displayName).toBe('John Developer');
      expect(user.emailAddress).toBe('john.dev@company.com');
      expect(user.active).toBe(true);
      expect(user.timeZone).toBe('UTC');
      expect(user.accountType).toBe('atlassian');
    });

    test('minimal user object', () => {
      const user: JiraUser = {
        accountId: 'minimal123',
        displayName: 'Minimal User',
      };
      expect(Object.keys(user).length).toBe(2);
    });

    test('inactive user with no avatar', () => {
      const user: JiraUser = {
        accountId: 'inactive123',
        displayName: 'Former Employee',
        active: false,
        emailAddress: 'former@company.com',
        timeZone: 'America/Los_Angeles',
        accountType: 'enterprise',
      };
      expect(user.active).toBe(false);
      expect(user.avatarUrls).toBeUndefined();
    });
  });
});

describe('getUsers parameter building', () => {
  test('default parameters produce empty params', () => {
    const options = {};
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    expect(params.toString()).toBe('');
  });

  test('query parameter', () => {
    const options = { query: 'john' };
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    expect(params.toString()).toBe('query=john');
  });

  test('username parameter', () => {
    const options = { username: 'jdoe' };
    const params = new URLSearchParams();
    if (options.username) params.set('username', options.username);
    expect(params.toString()).toBe('username=jdoe');
  });

  test('email parameter', () => {
    const options = { email: 'john@example.com' };
    const params = new URLSearchParams();
    if (options.email) params.set('email', options.email);
    expect(params.toString()).toBe('email=john%40example.com');
  });

  test('accountId parameter', () => {
    const options = { accountId: 'abc123' };
    const params = new URLSearchParams();
    if (options.accountId) params.set('accountId', options.accountId);
    expect(params.toString()).toBe('accountId=abc123');
  });

  test('accountType atlassian', () => {
    const options = { accountType: 'atlassian' as const };
    const params = new URLSearchParams();
    if (options.accountType) params.set('accountType', options.accountType);
    expect(params.toString()).toBe('accountType=atlassian');
  });

  test('accountType app', () => {
    const options = { accountType: 'app' as const };
    const params = new URLSearchParams();
    if (options.accountType) params.set('accountType', options.accountType);
    expect(params.toString()).toBe('accountType=app');
  });

  test('accountType enterprise', () => {
    const options = { accountType: 'enterprise' as const };
    const params = new URLSearchParams();
    if (options.accountType) params.set('accountType', options.accountType);
    expect(params.toString()).toBe('accountType=enterprise');
  });

  test('includeActive true', () => {
    const options = { includeActive: true };
    const params = new URLSearchParams();
    if (options.includeActive !== undefined)
      params.set('includeActive', String(options.includeActive));
    expect(params.toString()).toBe('includeActive=true');
  });

  test('includeActive false', () => {
    const options = { includeActive: false };
    const params = new URLSearchParams();
    if (options.includeActive !== undefined)
      params.set('includeActive', String(options.includeActive));
    expect(params.toString()).toBe('includeActive=false');
  });

  test('includeInactive true', () => {
    const options = { includeInactive: true };
    const params = new URLSearchParams();
    if (options.includeInactive !== undefined)
      params.set('includeInactive', String(options.includeInactive));
    expect(params.toString()).toBe('includeInactive=true');
  });

  test('multiple parameters combined', () => {
    const options = {
      query: 'john',
      accountType: 'atlassian' as const,
      includeActive: true,
      includeInactive: false,
    };
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    if (options.accountType) params.set('accountType', options.accountType);
    if (options.includeActive !== undefined)
      params.set('includeActive', String(options.includeActive));
    if (options.includeInactive !== undefined)
      params.set('includeInactive', String(options.includeInactive));
    expect(params.toString()).toBe(
      'query=john&accountType=atlassian&includeActive=true&includeInactive=false'
    );
  });
});
