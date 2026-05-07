import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceClient } from './api/confluence';
import { extractAttachmentMeta, extractTextFromADF, JiraClient } from './api/jira';
import {
  buildConfluencePagePath,
  buildJiraIssuePath,
  extractDomain,
  writeJson,
  writeText,
} from './utils/storage';

interface JqlQueryOptions {
  project?: string;
  issueTypes?: string[];
  statuses?: string[];
  assignees?: string[];
  reporters?: string[];
  priorities?: string[];
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  textSearch?: string;
  textFields?: ('summary' | 'description' | 'environment')[];
  orderBy?: 'created' | 'updated' | 'priority' | 'status' | 'summary';
  orderDirection?: 'ASC' | 'DESC';
}

function buildJqlQuery(options: JqlQueryOptions): string {
  const conditions: string[] = [];

  if (options.project) {
    conditions.push(`project = ${options.project}`);
  }

  if (options.issueTypes?.length) {
    const types = options.issueTypes.map((t) => `"${t}"`).join(', ');
    conditions.push(`type IN (${types})`);
  }

  if (options.statuses?.length) {
    const statuses = options.statuses.map((s) => `"${s}"`).join(', ');
    conditions.push(`status IN (${statuses})`);
  }

  if (options.assignees?.length) {
    const assignees = options.assignees.map((a) => `"${a}"`).join(', ');
    conditions.push(`assignee IN (${assignees})`);
  }

  if (options.reporters?.length) {
    const reporters = options.reporters.map((r) => `"${r}"`).join(', ');
    conditions.push(`reporter IN (${reporters})`);
  }

  if (options.priorities?.length) {
    const priorities = options.priorities.map((p) => `"${p}"`).join(', ');
    conditions.push(`priority IN (${priorities})`);
  }

  if (options.labels?.length) {
    const labels = options.labels.map((l) => `"${l}"`).join(', ');
    conditions.push(`labels IN (${labels})`);
  }

  if (options.components?.length) {
    const components = options.components.map((c) => `"${c}"`).join(', ');
    conditions.push(`component IN (${components})`);
  }

  if (options.fixVersions?.length) {
    const versions = options.fixVersions.map((v) => `"${v}"`).join(', ');
    conditions.push(`fixVersion IN (${versions})`);
  }

  if (options.createdAfter) {
    conditions.push(`created >= ${options.createdAfter}`);
  }

  if (options.createdBefore) {
    conditions.push(`created <= ${options.createdBefore}`);
  }

  if (options.updatedAfter) {
    conditions.push(`updated >= ${options.updatedAfter}`);
  }

  if (options.updatedBefore) {
    conditions.push(`updated <= ${options.updatedBefore}`);
  }

  if (options.textSearch) {
    const fields = options.textFields || ['summary', 'description'];
    const textConditions = fields.map((f) => `${f} ~ "${options.textSearch}"`);
    conditions.push(`(${textConditions.join(' OR ')})`);
  }

  let jql = conditions.length > 0 ? conditions.join(' AND ') : '';

  if (options.orderBy) {
    const orderField = {
      created: 'created',
      updated: 'updated',
      priority: 'priority',
      status: 'status',
      summary: 'summary',
    }[options.orderBy];
    const direction = options.orderDirection === 'ASC' ? 'ASC' : 'DESC';
    jql += `${jql ? ' ORDER BY ' : ''}${orderField} ${direction}`;
  }

  return jql;
}

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
    name: 'list_confluence_spaces',
    description:
      'List all Confluence spaces the user has access to. Use this to discover available spaces before searching for pages.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max results per page (default 25, max 100)' },
        cursor: { type: 'string', description: 'Pagination cursor from previous response' },
      },
    },
  },
  {
    name: 'get_confluence_space',
    description:
      'Get details of a specific Confluence space by its key (e.g., "TEAM", "BANCSTAC"). Returns space metadata and permissions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        spaceKey: { type: 'string', description: 'Space key (e.g., BANCSTAC, TEAM)' },
      },
      required: ['spaceKey'],
    },
  },
  {
    name: 'search_confluence_pages',
    description:
      'Search Confluence pages by text query within a space or across all spaces. Returns matching pages with their IDs and titles.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Text to search for in page titles and content' },
        spaceKey: { type: 'string', description: 'Restrict search to a specific space key' },
        limit: { type: 'number', description: 'Max results (default 25)' },
        cursor: { type: 'string', description: 'Pagination cursor from previous response' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_confluence_page',
    description:
      'Get full details of a Confluence page including its content body, metadata, version, and list of attachments. Use attachment IDs with download tools to save files.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Page ID (numeric or UUID string)' },
        localSave: {
          type: 'boolean',
          description:
            'If true, saves page data to ~/.atlassian-buddy/wiki/{domain}/{spaceId}/{pageId}/ (default false)',
          default: false,
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'get_confluence_page_children',
    description:
      'Get all direct child pages of a Confluence page. Use to navigate page hierarchies or build a table of contents.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Parent page ID' },
        limit: { type: 'number', description: 'Max results per page (default 25)' },
        cursor: { type: 'string', description: 'Pagination cursor from previous response' },
        localSave: {
          type: 'boolean',
          description:
            'If true, saves children data to ~/.atlassian-buddy/wiki/{domain}/{parentSpaceId}/{parentPageId}/children.json (default false)',
          default: false,
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'get_confluence_page_tree',
    description:
      'Get hierarchical page tree starting from a page. Returns nested structure of pages and their children up to specified depth. Useful for understanding page organization or building navigation.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Root page ID to start tree from' },
        depth: {
          type: 'number',
          description: 'How many levels deep to fetch (default 2, max 5)',
          default: 2,
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'get_confluence_page_versions',
    description:
      'Get version history of a Confluence page. Returns all previous versions with author, timestamp, and optional version message. Use to track changes and restore previous content.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Page ID' },
        limit: { type: 'number', description: 'Max results per page (default 25)' },
        cursor: { type: 'string', description: 'Pagination cursor from previous response' },
        localSave: {
          type: 'boolean',
          description:
            'If true, saves versions to ~/.atlassian-buddy/wiki/{domain}/{spaceId}/{pageId}/versions/ (default false)',
          default: false,
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'get_confluence_page_version',
    description:
      'Get a specific version of a Confluence page including its content body at that version. Use to view or restore previous content.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pageId: { type: 'string', description: 'Page ID' },
        versionNumber: { type: 'number', description: 'Version number to retrieve' },
        localSave: {
          type: 'boolean',
          description:
            'If true, saves version data to ~/.atlassian-buddy/wiki/{domain}/{spaceId}/{pageId}/versions/{versionNumber}.json (default false)',
          default: false,
        },
      },
      required: ['pageId', 'versionNumber'],
    },
  },
  {
    name: 'list_jira_projects',
    description:
      'List all Jira projects the user has access to. Each project contains issues and has a unique key (e.g., "TEAM", "BANCSTAC").',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max results (default 100)' },
        cursor: { type: 'string', description: 'Pagination cursor from previous response' },
      },
    },
  },
  {
    name: 'get_jira_project',
    description:
      'Get details of a specific Jira project by its key. Returns project info, issue types, and workflow statuses.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectKey: { type: 'string', description: 'Project key (e.g., BANCSTAC, TEAM)' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'search_jira_issues',
    description:
      'Search Jira issues using JQL or free-text fuzzy search. Use `query` for simple fuzzy text search across summary, description, and environment fields. Use `jql` for advanced filtering with full JQL syntax.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description:
            'Free-text fuzzy search across issue summary, description, and environment (e.g., "login bug", "performance issue")',
        },
        jql: {
          type: 'string',
          description:
            'JQL query for advanced filtering (e.g., project=TEAM AND status="In Progress" ORDER BY created DESC). Ignored if `query` is provided.',
        },
        limit: { type: 'number', description: 'Max results (default 100)' },
        cursor: {
          type: 'string',
          description: 'Pagination cursor (startAt number) from previous response',
        },
      },
    },
  },
  {
    name: 'get_jira_issue',
    description:
      'Get full details of a Jira issue including description, status, assignee, priority, comments, and attachments. Use attachment IDs with download tools to save files.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        issueKey: { type: 'string', description: 'Issue key (e.g., BANCSTAC-123)' },
        includeComments: {
          type: 'boolean',
          description: 'Include comments in response (default true)',
        },
        localSave: {
          type: 'boolean',
          description:
            'If true, saves issue data to ~/.atlassian-buddy/jira/{domain}/{projectKey}/{issueKey}/ (default false)',
          default: false,
        },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'get_jira_issue_comments',
    description:
      'Get all comments on a Jira issue. Returns author, body, and creation timestamp for each comment.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        issueKey: { type: 'string', description: 'Issue key (e.g., BANCSTAC-123)' },
        localSave: {
          type: 'boolean',
          description:
            'If true, saves comments to ~/.atlassian-buddy/jira/{domain}/{projectKey}/{issueKey}/comments.json (default false)',
          default: false,
        },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'get_jira_issue_changelog',
    description:
      'Get change history of a Jira issue. Returns all field changes (status, assignee, priority, etc.) with author and timestamp. Use to track issue timeline and understand what changed.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        issueKey: { type: 'string', description: 'Issue key (e.g., BANCSTAC-123)' },
        localSave: {
          type: 'boolean',
          description:
            'If true, saves changelog to ~/.atlassian-buddy/jira/{domain}/{projectKey}/{issueKey}/changelog.json (default false)',
          default: false,
        },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'build_jql_query',
    description:
      'Build a JQL query string from options. Use this to construct proper JQL queries for searching Jira issues. Returns a JQL string ready to use with search_jira_issues tool.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project: { type: 'string', description: 'Project key (e.g., TEAM, BANCSTAC)' },
        issueTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Issue types (e.g., Bug, Task, Story, Epic)',
        },
        statuses: {
          type: 'array',
          items: { type: 'string' },
          description: 'Statuses (e.g., "To Do", "In Progress", "Done")',
        },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Assignee usernames or display names',
        },
        reporters: {
          type: 'array',
          items: { type: 'string' },
          description: 'Reporter usernames or display names',
        },
        priorities: {
          type: 'array',
          items: { type: 'string' },
          description: 'Priorities (e.g., Highest, High, Medium, Low, Lowest)',
        },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels to filter by',
        },
        components: {
          type: 'array',
          items: { type: 'string' },
          description: 'Components to filter by',
        },
        fixVersions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Fix versions to filter by',
        },
        createdAfter: {
          type: 'string',
          description: 'Created date after (YYYY-MM-DD or YYYY-MM-DD HH:mm format)',
        },
        createdBefore: {
          type: 'string',
          description: 'Created date before (YYYY-MM-DD or YYYY-MM-DD HH:mm format)',
        },
        updatedAfter: {
          type: 'string',
          description: 'Updated date after (YYYY-MM-DD or YYYY-MM-DD HH:mm format)',
        },
        updatedBefore: {
          type: 'string',
          description: 'Updated date before (YYYY-MM-DD or YYYY-MM-DD HH:mm format)',
        },
        textSearch: {
          type: 'string',
          description: 'Free-text search across summary, description, environment',
        },
        textFields: {
          type: 'array',
          items: { type: 'string', enum: ['summary', 'description', 'environment'] },
          description: 'Which fields to search in (default: summary, description)',
        },
        orderBy: {
          type: 'string',
          enum: ['created', 'updated', 'priority', 'status', 'summary'],
          description: 'Field to order by (default: created)',
        },
        orderDirection: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          description: 'Sort direction (default: DESC)',
          default: 'DESC',
        },
      },
    },
  },
  {
    name: 'download_confluence_attachment',
    description:
      'Download a Confluence attachment and save it to a local file path. Returns metadata including filename, MIME type, and the path where the file was saved.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        attachmentId: { type: 'string', description: 'Attachment ID (found in get_page response)' },
        downloadPath: {
          type: 'string',
          description: 'Destination file path on local machine (e.g., /tmp/document.pdf)',
        },
      },
      required: ['attachmentId', 'downloadPath'],
    },
  },
  {
    name: 'download_jira_attachment',
    description:
      'Download a Jira attachment and save it to a local file path. Returns metadata including filename, MIME type, and the path where the file was saved.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        attachmentId: {
          type: 'string',
          description: 'Attachment ID (found in get_issue response)',
        },
        downloadPath: {
          type: 'string',
          description: 'Destination file path on local machine (e.g., /tmp/screenshot.png)',
        },
      },
      required: ['attachmentId', 'downloadPath'],
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
      case 'list_confluence_spaces': {
        const result = await confluence.listSpaces({
          limit: args.limit as number,
          cursor: args.cursor as string,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_confluence_space': {
        const space = await confluence.getSpace(args.spaceKey as string);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(space) }],
        };
      }

      case 'get_confluence_page_tree': {
        const depth = Math.min(Math.max((args.depth as number) || 2, 1), 5);
        const tree = await confluence.getPageTree(args.pageId as string, depth);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(tree) }],
        };
      }

      case 'search_confluence_pages': {
        const result = await confluence.searchPages(args.query as string, args.spaceKey as string, {
          limit: args.limit as number,
          cursor: args.cursor as string,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_confluence_page': {
        const page = await confluence.getPage(args.pageId as string);
        const attachments = await confluence.getAttachments(page.id);
        const result = {
          id: page.id,
          title: page.title,
          body: page.body?.storage?.value || '',
          parentId: page.parentId,
          version: page.version?.number,
          updated: page.version?.createdAt,
          attachments,
        };

        if (args.localSave) {
          const domain = extractDomain(CONFLUENCE_BASE_URL);
          const basePath = buildConfluencePagePath(domain, page.spaceId, page.id);
          writeJson(`${basePath}/metadata.json`, {
            id: page.id,
            title: page.title,
            parentId: page.parentId,
            version: page.version?.number,
            updated: page.version?.createdAt,
            spaceId: page.spaceId,
          });
          writeText(`${basePath}/body.html`, page.body?.storage?.value || '');
          writeJson(`${basePath}/attachments.json`, attachments);
          result.savedTo = basePath;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'get_confluence_page_children': {
        const result = await confluence.getPageChildren(args.pageId as string, {
          limit: args.limit as number,
          cursor: args.cursor as string,
        });

        if (args.localSave) {
          const parentPage = await confluence.getPage(args.pageId as string);
          const domain = extractDomain(CONFLUENCE_BASE_URL);
          const basePath = buildConfluencePagePath(domain, parentPage.spaceId, parentPage.id);
          writeJson(`${basePath}/children.json`, result);
          result.savedTo = `${basePath}/children.json`;
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_confluence_page_versions': {
        let result: Record<string, unknown>;

        if (args.localSave) {
          const allVersions = await confluence.getAllPageVersions(args.pageId as string);
          const page = await confluence.getPage(args.pageId as string);
          const domain = extractDomain(CONFLUENCE_BASE_URL);
          const basePath = buildConfluencePagePath(domain, page.spaceId, page.id);
          result = { results: allVersions, hasMore: false };
          writeJson(`${basePath}/versions.json`, result);
          result.savedTo = `${basePath}/versions.json`;
        } else {
          result = (await confluence.getPageVersions(args.pageId as string, {
            limit: args.limit as number,
            cursor: args.cursor as string,
          })) as Record<string, unknown>;
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_confluence_page_version': {
        const versionDetail = await confluence.getPageVersion(
          args.pageId as string,
          args.versionNumber as number
        );
        let result = versionDetail;

        if (args.localSave) {
          const page = await confluence.getPage(args.pageId as string);
          const domain = extractDomain(CONFLUENCE_BASE_URL);
          const basePath = buildConfluencePagePath(domain, page.spaceId, page.id);
          writeJson(`${basePath}/versions/${args.versionNumber}.json`, result);
          result = { ...result, savedTo: `${basePath}/versions/${args.versionNumber}.json` };
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'list_jira_projects': {
        const result = await jira.listProjects({
          limit: args.limit as number,
          cursor: args.cursor as string,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_jira_project': {
        const project = await jira.getProject(args.projectKey as string);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(project) }],
        };
      }

      case 'search_jira_issues': {
        const result = await jira.searchIssues(
          args.query as string | undefined,
          args.jql as string | undefined,
          {
            limit: args.limit as number,
            cursor: args.cursor as string,
          }
        );
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'get_jira_issue': {
        const issue = await jira.getIssue(args.issueKey as string);
        const includeComments = args.includeComments !== false;
        const comments = includeComments ? await jira.getIssueComments(issue.key) : [];

        const attachments = issue.fields.attachment?.map(extractAttachmentMeta) || [];

        const description =
          issue.renderedFields?.description || extractTextFromADF(issue.fields.description);

        const result = {
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
        };

        if (args.localSave) {
          const domain = extractDomain(JIRA_BASE_URL);
          const projectKey = issue.fields.project.key;
          const basePath = buildJiraIssuePath(domain, projectKey, issue.key);
          writeJson(`${basePath}/metadata.json`, {
            id: issue.id,
            key: issue.key,
            summary: issue.fields.summary,
            type: issue.fields.issuetype.name,
            status: issue.fields.status.name,
            priority: issue.fields.priority?.name,
            assignee: issue.fields.assignee?.displayName,
            reporter: issue.fields.reporter?.displayName,
            created: issue.fields.created,
            updated: issue.fields.updated,
            resolved: issue.fields.resolutiondate,
            labels: issue.fields.labels || [],
          });
          writeText(`${basePath}/description.html`, description);
          writeJson(`${basePath}/attachments.json`, attachments);
          writeJson(`${basePath}/comments.json`, result.comments);
          result.savedTo = basePath;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'get_jira_issue_comments': {
        const issue = await jira.getIssue(args.issueKey as string);
        const comments = await jira.getIssueComments(args.issueKey as string);
        const result = {
          comments: comments.map((c) => ({
            id: c.id,
            author: c.author.displayName,
            body: c.renderedBody || extractTextFromADF(c.body),
            created: c.created,
          })),
        };

        if (args.localSave) {
          const domain = extractDomain(JIRA_BASE_URL);
          const projectKey = issue.fields.project.key;
          const basePath = buildJiraIssuePath(domain, projectKey, issue.key);
          writeJson(`${basePath}/comments.json`, result);
          result.savedTo = `${basePath}/comments.json`;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'get_jira_issue_changelog': {
        const issue = await jira.getIssue(args.issueKey as string);
        const changelog = await jira.getIssueChangelog(args.issueKey as string);
        const result = { changelog };

        if (args.localSave) {
          const domain = extractDomain(JIRA_BASE_URL);
          const projectKey = issue.fields.project.key;
          const basePath = buildJiraIssuePath(domain, projectKey, issue.key);
          writeJson(`${basePath}/changelog.json`, result);
          result.savedTo = `${basePath}/changelog.json`;
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case 'build_jql_query': {
        const jql = buildJqlQuery({
          project: args.project as string,
          issueTypes: args.issueTypes as string[] | undefined,
          statuses: args.statuses as string[] | undefined,
          assignees: args.assignees as string[] | undefined,
          reporters: args.reporters as string[] | undefined,
          priorities: args.priorities as string[] | undefined,
          labels: args.labels as string[] | undefined,
          components: args.components as string[] | undefined,
          fixVersions: args.fixVersions as string[] | undefined,
          createdAfter: args.createdAfter as string | undefined,
          createdBefore: args.createdBefore as string | undefined,
          updatedAfter: args.updatedAfter as string | undefined,
          updatedBefore: args.updatedBefore as string | undefined,
          textSearch: args.textSearch as string | undefined,
          textFields: args.textFields as ('summary' | 'description' | 'environment')[] | undefined,
          orderBy: args.orderBy as
            | 'created'
            | 'updated'
            | 'priority'
            | 'status'
            | 'summary'
            | undefined,
          orderDirection: args.orderDirection as 'ASC' | 'DESC' | undefined,
        });
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ jql }) }],
        };
      }

      case 'download_confluence_attachment': {
        const result = await confluence.downloadAttachment(
          args.attachmentId as string,
          args.downloadPath as string | undefined
        );
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        };
      }

      case 'download_jira_attachment': {
        const result = await jira.downloadAttachment(
          args.attachmentId as string,
          args.downloadPath as string | undefined
        );
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
