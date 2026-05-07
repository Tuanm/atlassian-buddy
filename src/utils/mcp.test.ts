import { describe, expect, test } from 'bun:test';
import type {
  AttachmentMeta,
  CommentResult,
  DownloadResult,
  IssueResult,
  PageResult,
  ProjectSummary,
  SpaceSummary,
  ToolDefinition,
  ToolResult,
} from '../types/mcp';

describe('ToolDefinition', () => {
  test('minimal tool definition', () => {
    const tool: ToolDefinition = {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
    expect(tool.name).toBe('test_tool');
    expect(tool.description).toBe('A test tool');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.required).toBeUndefined();
  });

  test('tool with properties and required fields', () => {
    const tool: ToolDefinition = {
      name: 'get_user',
      description: 'Get user by ID',
      inputSchema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          includeInactive: { type: 'boolean' },
        },
        required: ['userId'],
      },
    };
    expect(tool.inputSchema.properties.userId).toBeDefined();
    expect(tool.inputSchema.properties.includeInactive).toBeDefined();
    expect(tool.inputSchema.required).toEqual(['userId']);
  });
});

describe('ToolResult', () => {
  test('successful result', () => {
    const result: ToolResult = {
      content: [{ type: 'text', text: '{"success": true}' }],
    };
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('{"success": true}');
    expect(result.isError).toBeUndefined();
  });

  test('error result', () => {
    const result: ToolResult = {
      content: [{ type: 'text', text: 'Error: Not found' }],
      isError: true,
    };
    expect(result.isError).toBe(true);
  });

  test('result with multiple content items', () => {
    const result: ToolResult = {
      content: [
        { type: 'text', text: 'First message' },
        { type: 'text', text: 'Second message' },
      ],
    };
    expect(result.content.length).toBe(2);
  });
});

describe('AttachmentMeta', () => {
  test('creates attachment metadata', () => {
    const meta: AttachmentMeta = {
      id: 'att123',
      filename: 'document.pdf',
      size: 1024,
      mimeType: 'application/pdf',
    };
    expect(meta.id).toBe('att123');
    expect(meta.filename).toBe('document.pdf');
    expect(meta.size).toBe(1024);
    expect(meta.mimeType).toBe('application/pdf');
  });
});

describe('DownloadResult', () => {
  test('creates download result', () => {
    const result: DownloadResult = {
      filename: 'image.png',
      mimeType: 'image/png',
      path: '/tmp/downloads/image.png',
    };
    expect(result.filename).toBe('image.png');
    expect(result.mimeType).toBe('image/png');
    expect(result.path).toBe('/tmp/downloads/image.png');
  });
});

describe('SpaceSummary', () => {
  test('creates space summary', () => {
    const space: SpaceSummary = {
      id: 'space1',
      key: 'TEAM',
      name: 'Team Space',
    };
    expect(space.id).toBe('space1');
    expect(space.key).toBe('TEAM');
    expect(space.name).toBe('Team Space');
  });
});

describe('ProjectSummary', () => {
  test('creates project summary', () => {
    const project: ProjectSummary = {
      id: 'proj1',
      key: 'PROJ',
      name: 'Project',
    };
    expect(project.id).toBe('proj1');
    expect(project.key).toBe('PROJ');
    expect(project.name).toBe('Project');
  });
});

describe('PageResult', () => {
  test('creates page result', () => {
    const page: PageResult = {
      id: 'page1',
      title: 'My Page',
      body: '<p>Page content</p>',
      version: 3,
      updated: '2024-01-15T10:00:00Z',
      attachments: [{ id: 'att1', filename: 'file.pdf', size: 1024, mimeType: 'application/pdf' }],
    };
    expect(page.id).toBe('page1');
    expect(page.title).toBe('My Page');
    expect(page.body).toBe('<p>Page content</p>');
    expect(page.version).toBe(3);
    expect(page.attachments.length).toBe(1);
    expect(page.parentId).toBeUndefined();
  });

  test('page result with parent', () => {
    const page: PageResult = {
      id: 'child1',
      title: 'Child Page',
      body: 'Content',
      parentId: 'parent1',
      version: 1,
      updated: '2024-01-01T00:00:00Z',
      attachments: [],
    };
    expect(page.parentId).toBe('parent1');
  });
});

describe('IssueResult', () => {
  test('creates issue result', () => {
    const issue: IssueResult = {
      id: 'issue1',
      key: 'TEAM-1',
      summary: 'Test Issue',
      description: 'Issue description',
      type: 'Bug',
      status: 'In Progress',
      priority: 'High',
      assignee: 'Developer',
      reporter: 'Reporter',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-10T00:00:00Z',
      resolved: '2024-01-15T00:00:00Z',
      labels: ['bug', 'urgent'],
      attachments: [],
      comments: [],
    };
    expect(issue.key).toBe('TEAM-1');
    expect(issue.labels).toEqual(['bug', 'urgent']);
    expect(issue.resolved).toBe('2024-01-15T00:00:00Z');
  });

  test('issue result without optional fields', () => {
    const issue: IssueResult = {
      id: 'issue2',
      key: 'TEAM-2',
      summary: 'Minimal Issue',
      description: '',
      type: 'Task',
      status: 'To Do',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      labels: [],
      attachments: [],
      comments: [],
    };
    expect(issue.priority).toBeUndefined();
    expect(issue.assignee).toBeUndefined();
    expect(issue.resolved).toBeUndefined();
    expect(issue.labels).toEqual([]);
  });

  test('issue result with comments and attachments', () => {
    const issue: IssueResult = {
      id: 'issue3',
      key: 'TEAM-3',
      summary: 'Issue with details',
      description: 'Description',
      type: 'Story',
      status: 'Done',
      created: '2024-01-01T00:00:00Z',
      updated: '2024-01-20T00:00:00Z',
      labels: ['story'],
      attachments: [{ id: 'att1', filename: 'spec.pdf', size: 2048, mimeType: 'application/pdf' }],
      comments: [
        {
          id: 'comment1',
          author: 'Reviewer',
          body: 'Looks good!',
          created: '2024-01-15T10:00:00Z',
        },
      ],
    };
    expect(issue.attachments.length).toBe(1);
    expect(issue.comments.length).toBe(1);
    expect(issue.comments[0].author).toBe('Reviewer');
  });
});

describe('CommentResult', () => {
  test('creates comment result', () => {
    const comment: CommentResult = {
      id: 'comment1',
      author: 'Alice',
      body: 'This is a comment',
      created: '2024-01-10T14:30:00Z',
    };
    expect(comment.id).toBe('comment1');
    expect(comment.author).toBe('Alice');
    expect(comment.body).toBe('This is a comment');
    expect(comment.created).toBe('2024-01-10T14:30:00Z');
  });
});
