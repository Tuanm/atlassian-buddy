import { describe, expect, test } from 'bun:test';

type JqlQueryOptions = {
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
};

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

describe('buildJqlQuery', () => {
  describe('empty options', () => {
    test('returns empty string when no options provided', () => {
      expect(buildJqlQuery({})).toBe('');
    });

    test('returns empty string when options is undefined', () => {
      expect(buildJqlQuery({})).toBe('');
    });

    test('returns empty string when all arrays are empty', () => {
      expect(
        buildJqlQuery({
          issueTypes: [],
          statuses: [],
          assignees: [],
          labels: [],
        })
      ).toBe('');
    });
  });

  describe('project filter', () => {
    test('single project', () => {
      expect(buildJqlQuery({ project: 'TEAM' })).toBe('project = TEAM');
    });

    test('project with spaces', () => {
      expect(buildJqlQuery({ project: 'BANC STAC' })).toBe('project = BANC STAC');
    });

    test('project with hyphen', () => {
      expect(buildJqlQuery({ project: 'MY-PROJECT' })).toBe('project = MY-PROJECT');
    });
  });

  describe('issueTypes filter', () => {
    test('single issue type', () => {
      expect(buildJqlQuery({ issueTypes: ['Bug'] })).toBe('type IN ("Bug")');
    });

    test('multiple issue types', () => {
      expect(buildJqlQuery({ issueTypes: ['Bug', 'Task', 'Story'] })).toBe(
        'type IN ("Bug", "Task", "Story")'
      );
    });

    test('single type without array wrapper', () => {
      expect(buildJqlQuery({ issueTypes: ['Bug'] })).toBe('type IN ("Bug")');
    });
  });

  describe('statuses filter', () => {
    test('single status', () => {
      expect(buildJqlQuery({ statuses: ['To Do'] })).toBe('status IN ("To Do")');
    });

    test('multiple statuses', () => {
      expect(buildJqlQuery({ statuses: ['To Do', 'In Progress', 'Done'] })).toBe(
        'status IN ("To Do", "In Progress", "Done")'
      );
    });

    test('status with spaces', () => {
      expect(buildJqlQuery({ statuses: ['In Review'] })).toBe('status IN ("In Review")');
    });
  });

  describe('assignees filter', () => {
    test('single assignee', () => {
      expect(buildJqlQuery({ assignees: ['john.doe'] })).toBe('assignee IN ("john.doe")');
    });

    test('multiple assignees', () => {
      expect(buildJqlQuery({ assignees: ['alice', 'bob', 'charlie'] })).toBe(
        'assignee IN ("alice", "bob", "charlie")'
      );
    });

    test('display name with spaces', () => {
      expect(buildJqlQuery({ assignees: ['John Doe'] })).toBe('assignee IN ("John Doe")');
    });
  });

  describe('reporters filter', () => {
    test('single reporter', () => {
      expect(buildJqlQuery({ reporters: ['jane.doe'] })).toBe('reporter IN ("jane.doe")');
    });

    test('multiple reporters', () => {
      expect(buildJqlQuery({ reporters: ['user1', 'user2'] })).toBe(
        'reporter IN ("user1", "user2")'
      );
    });
  });

  describe('priorities filter', () => {
    test('single priority', () => {
      expect(buildJqlQuery({ priorities: ['High'] })).toBe('priority IN ("High")');
    });

    test('multiple priorities', () => {
      expect(buildJqlQuery({ priorities: ['Highest', 'High', 'Medium', 'Low', 'Lowest'] })).toBe(
        'priority IN ("Highest", "High", "Medium", "Low", "Lowest")'
      );
    });
  });

  describe('labels filter', () => {
    test('single label', () => {
      expect(buildJqlQuery({ labels: ['frontend'] })).toBe('labels IN ("frontend")');
    });

    test('multiple labels', () => {
      expect(buildJqlQuery({ labels: ['bug', 'urgent', 'production'] })).toBe(
        'labels IN ("bug", "urgent", "production")'
      );
    });

    test('label with hyphen', () => {
      expect(buildJqlQuery({ labels: ['user-facing'] })).toBe('labels IN ("user-facing")');
    });
  });

  describe('components filter', () => {
    test('single component', () => {
      expect(buildJqlQuery({ components: ['Authentication'] })).toBe(
        'component IN ("Authentication")'
      );
    });

    test('multiple components', () => {
      expect(buildJqlQuery({ components: ['UI', 'API', 'Database'] })).toBe(
        'component IN ("UI", "API", "Database")'
      );
    });
  });

  describe('fixVersions filter', () => {
    test('single fix version', () => {
      expect(buildJqlQuery({ fixVersions: ['1.0.0'] })).toBe('fixVersion IN ("1.0.0")');
    });

    test('multiple fix versions', () => {
      expect(buildJqlQuery({ fixVersions: ['1.0.0', '1.1.0', '2.0.0'] })).toBe(
        'fixVersion IN ("1.0.0", "1.1.0", "2.0.0")'
      );
    });

    test('semantic version with v prefix', () => {
      expect(buildJqlQuery({ fixVersions: ['v2.0.0'] })).toBe('fixVersion IN ("v2.0.0")');
    });
  });

  describe('date filters', () => {
    test('createdAfter with date only', () => {
      expect(buildJqlQuery({ createdAfter: '2024-01-01' })).toBe('created >= 2024-01-01');
    });

    test('createdBefore with date only', () => {
      expect(buildJqlQuery({ createdBefore: '2024-12-31' })).toBe('created <= 2024-12-31');
    });

    test('createdAfter with datetime', () => {
      expect(buildJqlQuery({ createdAfter: '2024-01-01 00:00' })).toBe(
        'created >= 2024-01-01 00:00'
      );
    });

    test('updatedAfter with date only', () => {
      expect(buildJqlQuery({ updatedAfter: '2024-06-15' })).toBe('updated >= 2024-06-15');
    });

    test('updatedBefore with date only', () => {
      expect(buildJqlQuery({ updatedBefore: '2024-06-30' })).toBe('updated <= 2024-06-30');
    });

    test('date range combined', () => {
      expect(
        buildJqlQuery({
          createdAfter: '2024-01-01',
          createdBefore: '2024-12-31',
        })
      ).toBe('created >= 2024-01-01 AND created <= 2024-12-31');
    });

    test('all date filters combined', () => {
      expect(
        buildJqlQuery({
          createdAfter: '2024-01-01',
          createdBefore: '2024-12-31',
          updatedAfter: '2024-06-01',
          updatedBefore: '2024-06-30',
        })
      ).toBe(
        'created >= 2024-01-01 AND created <= 2024-12-31 AND updated >= 2024-06-01 AND updated <= 2024-06-30'
      );
    });
  });

  describe('textSearch filter', () => {
    test('textSearch with default fields (summary, description)', () => {
      expect(buildJqlQuery({ textSearch: 'login bug' })).toBe(
        '(summary ~ "login bug" OR description ~ "login bug")'
      );
    });

    test('textSearch with custom textFields', () => {
      expect(
        buildJqlQuery({
          textSearch: 'performance',
          textFields: ['summary', 'environment'],
        })
      ).toBe('(summary ~ "performance" OR environment ~ "performance")');
    });

    test('textSearch with single textField', () => {
      expect(
        buildJqlQuery({
          textSearch: 'urgent',
          textFields: ['summary'],
        })
      ).toBe('(summary ~ "urgent")');
    });

    test('textSearch with all textFields', () => {
      expect(
        buildJqlQuery({
          textSearch: 'regression',
          textFields: ['summary', 'description', 'environment'],
        })
      ).toBe(
        '(summary ~ "regression" OR description ~ "regression" OR environment ~ "regression")'
      );
    });
  });

  describe('orderBy filter', () => {
    test('orderBy created DESC (default)', () => {
      expect(buildJqlQuery({ orderBy: 'created' })).toBe('created DESC');
    });

    test('orderBy created ASC', () => {
      expect(buildJqlQuery({ orderBy: 'created', orderDirection: 'ASC' })).toBe('created ASC');
    });

    test('orderBy updated', () => {
      expect(buildJqlQuery({ orderBy: 'updated' })).toBe('updated DESC');
    });

    test('orderBy priority', () => {
      expect(buildJqlQuery({ orderBy: 'priority' })).toBe('priority DESC');
    });

    test('orderBy status', () => {
      expect(buildJqlQuery({ orderBy: 'status' })).toBe('status DESC');
    });

    test('orderBy summary', () => {
      expect(buildJqlQuery({ orderBy: 'summary' })).toBe('summary DESC');
    });
  });

  describe('complex queries', () => {
    test('project with multiple filters', () => {
      expect(
        buildJqlQuery({
          project: 'TEAM',
          issueTypes: ['Bug', 'Task'],
          statuses: ['In Progress', 'To Do'],
          priorities: ['High', 'Highest'],
        })
      ).toBe(
        'project = TEAM AND type IN ("Bug", "Task") AND status IN ("In Progress", "To Do") AND priority IN ("High", "Highest")'
      );
    });

    test('full query with all filters', () => {
      expect(
        buildJqlQuery({
          project: 'PROD',
          issueTypes: ['Bug'],
          statuses: ['Done'],
          assignees: ['dev1', 'dev2'],
          labels: ['release-blocker'],
          createdAfter: '2024-01-01',
          textSearch: 'critical',
          orderBy: 'updated',
          orderDirection: 'ASC',
        })
      ).toBe(
        'project = PROD AND type IN ("Bug") AND status IN ("Done") AND assignee IN ("dev1", "dev2") AND labels IN ("release-blocker") AND created >= 2024-01-01 AND (summary ~ "critical" OR description ~ "critical") ORDER BY updated ASC'
      );
    });

    test('query with component and fixVersion', () => {
      expect(
        buildJqlQuery({
          project: 'PLATFORM',
          components: ['Backend', 'Database'],
          fixVersions: ['v2.0.0'],
          orderBy: 'created',
        })
      ).toBe(
        'project = PLATFORM AND component IN ("Backend", "Database") AND fixVersion IN ("v2.0.0") ORDER BY created DESC'
      );
    });

    test('query with reporter and multiple labels', () => {
      expect(
        buildJqlQuery({
          project: 'TEAM',
          reporters: ['product.manager'],
          labels: ['enhancement', 'user-request'],
          orderBy: 'priority',
          orderDirection: 'DESC',
        })
      ).toBe(
        'project = TEAM AND reporter IN ("product.manager") AND labels IN ("enhancement", "user-request") ORDER BY priority DESC'
      );
    });

    test('date range with orderBy', () => {
      expect(
        buildJqlQuery({
          createdAfter: '2024-01-01',
          createdBefore: '2024-12-31',
          orderBy: 'updated',
          orderDirection: 'ASC',
        })
      ).toBe('created >= 2024-01-01 AND created <= 2024-12-31 ORDER BY updated ASC');
    });
  });

  describe('edge cases', () => {
    test('special characters in text search', () => {
      expect(buildJqlQuery({ textSearch: 'test"injection' })).toBe(
        '(summary ~ "test"injection" OR description ~ "test"injection")'
      );
    });

    test('orderBy without project or filters', () => {
      expect(buildJqlQuery({ orderBy: 'priority' })).toBe('priority DESC');
    });

    test('multiple filters with empty arrays ignored', () => {
      expect(
        buildJqlQuery({
          project: 'TEAM',
          issueTypes: [],
          statuses: [],
          assignees: ['user1'],
        })
      ).toBe('project = TEAM AND assignee IN ("user1")');
    });
  });
});
