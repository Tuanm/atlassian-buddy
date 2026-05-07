import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceClient } from './api/confluence';
import { extractAttachmentMeta, extractTextFromADF, JiraClient } from './api/jira';

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL || '';
const JIRA_BASE_URL = process.env.JIRA_BASE_URL || process.env.CONFLUENCE_BASE_URL || '';
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || '';

if (!CONFLUENCE_BASE_URL || !ATLASSIAN_API_TOKEN) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const confluence = new ConfluenceClient(CONFLUENCE_BASE_URL, ATLASSIAN_API_TOKEN);
const jira = new JiraClient(JIRA_BASE_URL, ATLASSIAN_API_TOKEN);

const tools = [
  {
    name: 'list_spaces',
    description: 'List all Confluence spaces',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max results (default 25)', default: 25 },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
    },
  },
  {
    name: 'get_space',
    description: 'Get a Confluence space by key',
    inputSchema: {
      type: 'object' as const,
      properties: {
        spaceKey: { type: 'string', description: 'Space key (e.g., BANCSTAC)' },
      },
      required: ['spaceKey'],
    },
  },
  {
    name: 'search_pages',
    description: 'Search Confluence pages by keyword',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        spaceKey: { type: 'string', description: 'Filter by space key' },
        limit: { type: 'number', description: 'Max results (default 25)' },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_page',
    description: 'Get a Confluence page by ID with content and attachments',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Page ID' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'get_page_children',
    description: 'Get child pages of a Confluence page',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Parent page ID' },
        limit: { type: 'number', description: 'Max results (default 25)' },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'list_projects',
    description: 'List all Jira projects',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max results (default 100)' },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
    },
  },
  {
    name: 'get_project',
    description: 'Get a Jira project by key',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectKey: { type: 'string', description: 'Project key (e.g., BANCSTAC)' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'search_issues',
    description: 'Search Jira issues using JQL',
    inputSchema: {
      type: 'object' as const,
      properties: {
        jql: { type: 'string', description: 'JQL query (e.g., project=BANCSTAC)' },
        limit: { type: 'number', description: 'Max results (default 100)' },
        cursor: { type: 'string', description: 'Pagination cursor (startAt number)' },
      },
      required: ['jql'],
    },
  },
  {
    name: 'get_issue',
    description: 'Get a Jira issue by key with comments and attachments',
    inputSchema: {
      type: 'object' as const,
      properties: {
        issueKey: { type: 'string', description: 'Issue key (e.g., BANCSTAC-123)' },
        includeComments: { type: 'boolean', description: 'Include comments (default true)' },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'get_issue_comments',
    description: 'Get comments for a Jira issue',
    inputSchema: {
      type: 'object' as const,
      properties: {
        issueKey: { type: 'string', description: 'Issue key' },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'download_confluence_attachment',
    description: 'Download a Confluence attachment as base64',
    inputSchema: {
      type: 'object' as const,
      properties: {
        attachmentId: { type: 'string', description: 'Attachment ID' },
      },
      required: ['attachmentId'],
    },
  },
  {
    name: 'download_jira_attachment',
    description: 'Download a Jira attachment as base64',
    inputSchema: {
      type: 'object' as const,
      properties: {
        attachmentId: { type: 'string', description: 'Attachment ID' },
      },
      required: ['attachmentId'],
    },
  },
];

const server = new Server(
  { name: 'atlassian-buddy', version: '0.1.0' },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_spaces': {
        const result = await confluence.listSpaces({
          limit: args.limit as number,
          cursor: args.cursor as string,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_space': {
        const space = await confluence.getSpace(args.spaceKey as string);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(space) }],
        };
      }

      case 'search_pages': {
        const result = await confluence.searchPages(args.query as string, args.spaceKey as string, {
          limit: args.limit as number,
          cursor: args.cursor as string,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_page': {
        const page = await confluence.getPage(args.pageId as string);
        const attachments = await confluence.getAttachments(page.id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: page.id,
                title: page.title,
                body: page.body?.storage?.value || '',
                parentId: page.parentId,
                version: page.version?.number,
                updated: page.version?.createdAt,
                attachments,
              }),
            },
          ],
        };
      }

      case 'get_page_children': {
        const result = await confluence.getPageChildren(args.pageId as string, {
          limit: args.limit as number,
          cursor: args.cursor as string,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'list_projects': {
        const result = await jira.listProjects({
          limit: args.limit as number,
          cursor: args.cursor as string,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_project': {
        const project = await jira.getProject(args.projectKey as string);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(project) }],
        };
      }

      case 'search_issues': {
        const result = await jira.searchIssues(args.jql as string, {
          limit: args.limit as number,
          cursor: args.cursor as string,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_issue': {
        const issue = await jira.getIssue(args.issueKey as string);
        const includeComments = args.includeComments !== false;
        const comments = includeComments ? await jira.getIssueComments(issue.key) : [];

        const attachments = issue.fields.attachment?.map(extractAttachmentMeta) || [];

        const description =
          issue.renderedFields?.description || extractTextFromADF(issue.fields.description);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                id: issue.id,
                key: issue.key,
                summary: issue.fields.summary,
                description,
                type: issue.fields.issuetype.name,
                status: issue.fields.status.name,
                priority: issue.fields.priority?.name,
                assignee: issue.fields.assignee?.displayName,
                reporter: issue.fields.reporter?.displayName,
                created: issue.fields.created,
                updated: issue.fields.updated,
                resolved: issue.fields.resolutiondate,
                labels: issue.fields.labels || [],
                attachments,
                comments: comments.map((c) => ({
                  id: c.id,
                  author: c.author.displayName,
                  body: c.renderedBody || extractTextFromADF(c.body),
                  created: c.created,
                })),
              }),
            },
          ],
        };
      }

      case 'get_issue_comments': {
        const comments = await jira.getIssueComments(args.issueKey as string);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                comments: comments.map((c) => ({
                  id: c.id,
                  author: c.author.displayName,
                  body: c.renderedBody || extractTextFromADF(c.body),
                  created: c.created,
                })),
              }),
            },
          ],
        };
      }

      case 'download_confluence_attachment': {
        const result = await confluence.downloadAttachment(args.attachmentId as string);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'download_jira_attachment': {
        const result = await jira.downloadAttachment(args.attachmentId as string);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      default:
        return {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
