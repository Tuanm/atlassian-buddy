# Atlassian Buddy

MCP server for Atlassian Confluence and Jira.

## Features

- **12 MCP tools** for Confluence and Jira operations
- Cursor-based pagination for large datasets
- Rate limiting with exponential backoff
- ADF (Atlassian Document Format) to text extraction
- Attachment metadata in page/issue responses
- Separate download tools for Confluence vs Jira attachments
- Built with Bun + TypeScript, compiled to single executable

## Requirements

- Bun 1.0+
- Atlassian API token

## Installation

```bash
bun install
bun run build
```

This creates `dist/atlassian-buddy` executable (~97MB).

## Configuration

Required environment variables:

| Variable | Description |
|----------|-------------|
| `ATLASSIAN_API_TOKEN` | Atlassian API token (format: `email:api_token`) |
| `CONFLUENCE_BASE_URL` | Confluence base URL (Cloud: `https://yoursite.atlassian.net/wiki`, Server: `https://confluence.yourcompany.com`) |
| `JIRA_BASE_URL` | Jira base URL (e.g., `https://yoursite.atlassian.net`) |

## Claude Code Integration

**Global config** - `~/.claude.json`:
```json
{
  "mcpServers": {
    "atlassian-buddy": {
      "type": "stdio",
      "command": "/absolute/path/to/atlassian-buddy/dist/atlassian-buddy",
      "args": [],
      "env": {
        "ATLASSIAN_API_TOKEN": "your-email@domain.com:your-api-token",
        "CONFLUENCE_BASE_URL": "https://yoursite.atlassian.net/wiki",
        "JIRA_BASE_URL": "https://yoursite.atlassian.net"
      }
    }
  }
}
```

**Project config** - `.mcp.json` (can be git-shared):
```json
{
  "mcpServers": {
    "atlassian-buddy": {
      "type": "stdio",
      "command": "/absolute/path/to/atlassian-buddy/dist/atlassian-buddy",
      "args": [],
      "env": {}
    }
  }
}
```

Env var expansion in `env` supports `${VAR}` and `${VAR:-default}` syntax. For project configs, use `${VAR}` to reference system env vars set elsewhere. Restart Claude Code to load the MCP server.

## OpenCode Integration

**Global config** - `~/.config/opencode/opencode.json`:
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "atlassian-buddy": {
      "type": "local",
      "command": ["/absolute/path/to/atlassian-buddy/dist/atlassian-buddy"],
      "environment": {
        "ATLASSIAN_API_TOKEN": "your-email@domain.com:your-api-token",
        "CONFLUENCE_BASE_URL": "https://yoursite.atlassian.net/wiki",
        "JIRA_BASE_URL": "https://yoursite.atlassian.net"
      }
    }
  }
}
```

**Project config** - `opencode.json` (can be git-shared):
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "atlassian-buddy": {
      "type": "local",
      "command": ["/absolute/path/to/atlassian-buddy/dist/atlassian-buddy"],
      "environment": {}
    }
  }
}
```

Restart OpenCode to load the MCP server.

## Tools

### Confluence

| Tool | Arguments | Description |
|------|-----------|-------------|
| `list_confluence_spaces` | `limit?`, `cursor?` | List all Confluence spaces |
| `get_confluence_space` | `spaceKey` | Get Confluence space by key |
| `search_confluence_pages` | `query`, `spaceKey?`, `limit?`, `cursor?` | Search pages by keyword |
| `get_confluence_page` | `pageId`, `localSave?` | Get page with body, attachments; optionally save to disk |
| `get_confluence_page_children` | `pageId`, `limit?`, `cursor?`, `localSave?` | Get child pages; optionally save to disk |
| `get_confluence_page_versions` | `pageId`, `limit?`, `cursor?`, `localSave?` | Get page version history |
| `download_confluence_attachment` | `attachmentId`, `downloadPath` | Download attachment and save to local path |

### Jira

| Tool | Arguments | Description |
|------|-----------|-------------|
| `list_jira_projects` | `limit?`, `cursor?` | List all Jira projects |
| `get_jira_project` | `projectKey` | Get Jira project by key |
| `search_jira_issues` | `query?`, `jql?`, `limit?`, `cursor?` | Search issues using JQL or fuzzy search |
| `get_jira_issue` | `issueKey`, `includeComments?`, `localSave?` | Get issue with comments/attachments; optionally save to disk |
| `get_jira_issue_comments` | `issueKey`, `localSave?` | Get issue comments; optionally save to disk |
| `get_jira_issue_changelog` | `issueKey`, `localSave?` | Get issue change history |
| `download_jira_attachment` | `attachmentId`, `downloadPath` | Download attachment and save to local path |

## Usage Examples

```javascript
// List all spaces
await tool("list_confluence_spaces", { limit: 25 })

// Search pages in a specific space
await tool("search_confluence_pages", {
  query: "architecture",
  spaceKey: "TEAM",
  limit: 10
})

// Get a specific page with attachments
await tool("get_confluence_page", { pageId: "123456789" })

// Get page children
await tool("get_confluence_page_children", { pageId: "123456789" })

// List projects
await tool("list_jira_projects")

// Search issues with JQL
await tool("search_jira_issues", {
  jql: "project=TEAM AND assignee=currentUser() AND status='In Progress'",
  limit: 50
})

// Get a specific issue with comments
await tool("get_jira_issue", { issueKey: "TEAM-123", includeComments: true })

// Download an attachment to local path
const attachment = await tool("download_jira_attachment", { 
  attachmentId: "10001", 
  downloadPath: "/tmp/screenshot.png" 
})
// Returns: { filename: "screenshot.png", mimeType: "image/png", path: "/tmp/screenshot.png" }
```

## Development

```bash
bun install        # Install dependencies
bun run dev       # Run directly (requires env vars set)
bun run build     # Build executable to dist/atlassian-buddy
bun test          # Run unit tests
bun run check     # Lint with Biome
bun run format    # Format code
```

## Architecture

```
src/
├── index.ts           # MCP server entry
├── api/
│   ├── client.ts     # Base AtlassianClient (auth, rate limiting)
│   ├── confluence.ts  # Confluence API client
│   └── jira.ts       # Jira API client + ADF extractor
└── types/
    ├── confluence.ts  # Confluence type definitions
    ├── jira.ts       # Jira type definitions
    └── mcp.ts        # MCP tool schemas
```

## License

MIT
