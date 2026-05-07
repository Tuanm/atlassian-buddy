import { describe, expect, test } from 'bun:test';
import type {
  JiraAttachment,
  JiraChangelogHistory,
  JiraComment,
  JiraIssue,
  JiraIssueFields,
  JiraProject,
} from '../types/jira';

describe('JiraProject', () => {
  test('minimal project', () => {
    const project: JiraProject = {
      id: '100',
      key: 'TEAM',
      name: 'Team Project',
      projectTypeKey: 'software',
    };
    expect(project.id).toBe('100');
    expect(project.key).toBe('TEAM');
    expect(project.name).toBe('Team Project');
    expect(project.projectTypeKey).toBe('software');
    expect(project.description).toBeUndefined();
    expect(project.lead).toBeUndefined();
  });

  test('project with description', () => {
    const project: JiraProject = {
      id: '101',
      key: 'PROD',
      name: 'Production',
      projectTypeKey: 'software',
      description: 'Production support project',
    };
    expect(project.description).toBe('Production support project');
  });

  test('project with lead', () => {
    const project: JiraProject = {
      id: '102',
      key: 'PLAT',
      name: 'Platform',
      projectTypeKey: 'software',
      lead: {
        displayName: 'Alice Manager',
        emailAddress: 'alice@company.com',
      },
    };
    expect(project.lead?.displayName).toBe('Alice Manager');
    expect(project.lead?.emailAddress).toBe('alice@company.com');
  });
});

describe('JiraIssue', () => {
  test('minimal issue', () => {
    const issue: JiraIssue = {
      id: '123',
      key: 'TEAM-1',
      self: 'https://example.com/rest/api/3/issue/123',
      fields: {
        summary: 'Test Issue',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        issuetype: { name: 'Task' },
        status: {
          name: 'To Do',
          statusCategory: { name: 'To Do', colorName: 'undefined' },
        },
      } as JiraIssueFields,
    };
    expect(issue.id).toBe('123');
    expect(issue.key).toBe('TEAM-1');
    expect(issue.fields.summary).toBe('Test Issue');
  });

  test('issue with renderedFields', () => {
    const issue: JiraIssue = {
      id: '456',
      key: 'TEAM-2',
      self: 'https://example.com/rest/api/3/issue/456',
      fields: {
        summary: 'Issue with rendered',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        issuetype: { name: 'Bug' },
        status: {
          name: 'In Progress',
          statusCategory: { name: 'In Progress', colorName: 'blue' },
        },
      } as JiraIssueFields,
      renderedFields: {
        description: '<p>Rendered HTML description</p>',
      },
    };
    expect(issue.renderedFields?.description).toBe('<p>Rendered HTML description</p>');
  });

  test('issue with changelog', () => {
    const issue: JiraIssue = {
      id: '789',
      key: 'TEAM-3',
      self: 'https://example.com/rest/api/3/issue/789',
      fields: {
        summary: 'Issue with changelog',
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-02T00:00:00Z',
        issuetype: { name: 'Story' },
        status: {
          name: 'Done',
          statusCategory: { name: 'Done', colorName: 'green' },
        },
      } as JiraIssueFields,
      changelog: {
        histories: [],
      },
    };
    expect(issue.changelog?.histories).toEqual([]);
  });
});

describe('JiraIssueFields', () => {
  test('issue with all common fields', () => {
    const fields: JiraIssueFields = {
      summary: 'Complete Issue',
      description: { type: 'doc', content: [] },
      issuetype: { name: 'Bug', iconUrl: 'https://example.com/bug.png' },
      status: {
        name: 'In Review',
        statusCategory: { name: 'In Review', colorName: 'yellow' },
      },
      priority: { name: 'High', iconUrl: 'https://example.com/high.png' },
      assignee: { displayName: 'Developer', emailAddress: 'dev@company.com' },
      reporter: { displayName: 'Reporter', emailAddress: 'reporter@company.com' },
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-10T00:00:00Z',
      resolutiondate: '2024-01-15T00:00:00Z',
      labels: ['frontend', 'urgent'],
      components: [{ name: 'UI' }, { name: 'API' }],
      fixVersions: [{ name: 'v1.0' }, { name: 'v1.1' }],
      versions: [{ name: 'v0.9' }],
      attachment: [],
      comment: { comments: [] },
      subtasks: [],
      parent: { key: 'TEAM-100', fields: { summary: 'Parent Issue' } },
    };
    expect(fields.summary).toBe('Complete Issue');
    expect(fields.labels).toEqual(['frontend', 'urgent']);
    expect(fields.components?.length).toBe(2);
    expect(fields.fixVersions?.length).toBe(2);
    expect(fields.subtasks).toEqual([]);
    expect(fields.parent?.key).toBe('TEAM-100');
  });

  test('issue without optional fields', () => {
    const fields: JiraIssueFields = {
      summary: 'Minimal Issue',
      issuetype: { name: 'Task' },
      status: {
        name: 'Backlog',
        statusCategory: { name: 'To Do', colorName: 'blue-gray' },
      },
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
    };
    expect(fields.priority).toBeUndefined();
    expect(fields.assignee).toBeUndefined();
    expect(fields.labels).toBeUndefined();
  });

  test('issue with subtasks', () => {
    const fields: JiraIssueFields = {
      summary: 'Parent Issue',
      issuetype: { name: 'Epic' },
      status: {
        name: 'In Progress',
        statusCategory: { name: 'In Progress', colorName: 'blue' },
      },
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      subtasks: [
        {
          key: 'TEAM-101',
          fields: { summary: 'Subtask 1', status: { name: 'Done' } },
        },
        {
          key: 'TEAM-102',
          fields: { summary: 'Subtask 2', status: { name: 'To Do' } },
        },
      ],
    };
    expect(fields.subtasks?.length).toBe(2);
    expect(fields.subtasks?.[0].fields.summary).toBe('Subtask 1');
  });
});

describe('JiraAttachment', () => {
  test('minimal attachment', () => {
    const att: JiraAttachment = {
      id: 'att1',
      filename: 'screenshot.png',
      size: 1024,
      mimeType: 'image/png',
      content: 'https://example.com/attachments/att1',
      author: { displayName: 'Uploader' },
      created: '2024-01-01T00:00:00Z',
    };
    expect(att.id).toBe('att1');
    expect(att.filename).toBe('screenshot.png');
    expect(att.size).toBe(1024);
    expect(att.mimeType).toBe('image/png');
  });

  test('attachment with thumbnail', () => {
    const att: JiraAttachment = {
      id: 'att2',
      filename: 'preview.jpg',
      size: 2048,
      mimeType: 'image/jpeg',
      content: 'https://example.com/attachments/att2',
      thumbnail: 'https://example.com/attachments/att2/thumbnail',
      author: { displayName: 'Uploader' },
      created: '2024-01-02T00:00:00Z',
    };
    expect(att.thumbnail).toBe('https://example.com/attachments/att2/thumbnail');
  });
});

describe('JiraComment', () => {
  test('minimal comment', () => {
    const comment: JiraComment = {
      id: 'comment1',
      author: { displayName: 'Commenter' },
      body: { type: 'doc', content: [] },
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
    };
    expect(comment.id).toBe('comment1');
    expect(comment.author.displayName).toBe('Commenter');
    expect(comment.body).toBeDefined();
    expect(comment.renderedBody).toBeUndefined();
  });

  test('comment with rendered body', () => {
    const comment: JiraComment = {
      id: 'comment2',
      author: { displayName: 'Commenter', emailAddress: 'c@company.com' },
      body: { type: 'doc', content: [] },
      renderedBody: '<p>Rendered comment text</p>',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-02T00:00:00Z',
    };
    expect(comment.renderedBody).toBe('<p>Rendered comment text</p>');
    expect(comment.author.emailAddress).toBe('c@company.com');
  });
});

describe('JiraChangelogHistory', () => {
  test('changelog with status change', () => {
    const history: JiraChangelogHistory = {
      id: 'hist1',
      author: { displayName: 'Changer' },
      created: '2024-01-15T10:00:00Z',
      items: [
        {
          field: 'status',
          fieldtype: 'jira',
          from: '10000',
          fromString: 'To Do',
          to: '10001',
          toString: 'In Progress',
        },
      ],
    };
    expect(history.items[0].field).toBe('status');
    expect(history.items[0].fromString).toBe('To Do');
    expect(history.items[0].toString).toBe('In Progress');
  });

  test('changelog with multiple field changes', () => {
    const history: JiraChangelogHistory = {
      id: 'hist2',
      author: { displayName: 'Multi Changer' },
      created: '2024-01-20T14:30:00Z',
      items: [
        {
          field: 'assignee',
          fieldtype: 'jira',
          from: 'user1',
          fromString: 'Alice',
          to: 'user2',
          toString: 'Bob',
        },
        {
          field: 'priority',
          fieldtype: 'jira',
          from: '3',
          fromString: 'Medium',
          to: '1',
          toString: 'Highest',
        },
      ],
    };
    expect(history.items.length).toBe(2);
  });

  test('changelog with label change', () => {
    const history: JiraChangelogHistory = {
      id: 'hist3',
      author: { displayName: 'Label Changer' },
      created: '2024-02-01T09:00:00Z',
      items: [
        {
          field: 'labels',
          fieldtype: 'jira',
          from: null,
          fromString: '',
          to: 'bug',
          toString: 'bug',
        },
      ],
    };
    expect(history.items[0].field).toBe('labels');
  });
});
