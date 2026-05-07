import { describe, expect, test } from 'bun:test';
import type {
  ConfluenceAttachment,
  ConfluencePage,
  ConfluencePageTree,
  ConfluencePageVersion,
  ConfluencePageVersionDetail,
  ConfluenceSpace,
} from '../types/confluence';

describe('ConfluenceSpace', () => {
  test('minimal space', () => {
    const space: ConfluenceSpace = {
      id: '123',
      key: 'TEAM',
      name: 'Team Space',
      type: 'global',
    };
    expect(space.id).toBe('123');
    expect(space.key).toBe('TEAM');
    expect(space.name).toBe('Team Space');
    expect(space.type).toBe('global');
    expect(space.description).toBeUndefined();
    expect(space.homepageId).toBeUndefined();
  });

  test('personal space', () => {
    const space: ConfluenceSpace = {
      id: '456',
      key: '~user123',
      name: 'Personal Space',
      type: 'personal',
    };
    expect(space.type).toBe('personal');
  });

  test('space with description', () => {
    const space: ConfluenceSpace = {
      id: '789',
      key: 'PROJ',
      name: 'Project Space',
      type: 'global',
      description: {
        plain: { value: 'This is a project documentation space' },
      },
      homepageId: '111',
    };
    expect(space.description?.plain.value).toBe('This is a project documentation space');
    expect(space.homepageId).toBe('111');
  });
});

describe('ConfluencePage', () => {
  test('minimal page', () => {
    const page: ConfluencePage = {
      id: '123',
      title: 'My Page',
      spaceId: '456',
      status: 'current',
    };
    expect(page.id).toBe('123');
    expect(page.title).toBe('My Page');
    expect(page.spaceId).toBe('456');
    expect(page.status).toBe('current');
    expect(page.body).toBeUndefined();
    expect(page.parentId).toBeUndefined();
  });

  test('page with body', () => {
    const page: ConfluencePage = {
      id: '123',
      title: 'Page with Content',
      spaceId: '456',
      status: 'current',
      body: {
        storage: {
          value: '<p>Hello World</p>',
          representation: 'storage',
        },
      },
    };
    expect(page.body?.storage.value).toBe('<p>Hello World</p>');
    expect(page.body?.storage.representation).toBe('storage');
  });

  test('page with version', () => {
    const page: ConfluencePage = {
      id: '123',
      title: 'Versioned Page',
      spaceId: '456',
      status: 'current',
      version: {
        number: 5,
        createdAt: '2024-01-15T10:30:00Z',
      },
    };
    expect(page.version?.number).toBe(5);
    expect(page.version?.createdAt).toBe('2024-01-15T10:30:00Z');
  });

  test('page with parent', () => {
    const page: ConfluencePage = {
      id: '789',
      title: 'Child Page',
      spaceId: '456',
      status: 'current',
      parentId: 'parent123',
    };
    expect(page.parentId).toBe('parent123');
  });

  test('archived page', () => {
    const page: ConfluencePage = {
      id: '123',
      title: 'Archived Page',
      spaceId: '456',
      status: 'archived',
    };
    expect(page.status).toBe('archived');
  });

  test('deleted page', () => {
    const page: ConfluencePage = {
      id: '123',
      title: 'Deleted Page',
      spaceId: '456',
      status: 'deleted',
    };
    expect(page.status).toBe('deleted');
  });

  test('page with webui link', () => {
    const page: ConfluencePage = {
      id: '123',
      title: 'Page',
      spaceId: '456',
      status: 'current',
      _links: {
        webui: '/spaces/TEAM/pages/123',
      },
    };
    expect(page._links?.webui).toBe('/spaces/TEAM/pages/123');
  });
});

describe('ConfluenceAttachment', () => {
  test('minimal attachment', () => {
    const att: ConfluenceAttachment = {
      id: 'att1',
      title: 'document.pdf',
      mediaType: 'application/pdf',
      fileSize: 1024,
    };
    expect(att.id).toBe('att1');
    expect(att.title).toBe('document.pdf');
    expect(att.mediaType).toBe('application/pdf');
    expect(att.fileSize).toBe(1024);
    expect(att.downloadLink).toBeUndefined();
  });

  test('attachment with download link', () => {
    const att: ConfluenceAttachment = {
      id: 'att2',
      title: 'image.png',
      mediaType: 'image/png',
      fileSize: 2048,
      downloadLink: 'https://example.com/download/att2',
      pageId: 'page123',
    };
    expect(att.downloadLink).toBe('https://example.com/download/att2');
    expect(att.pageId).toBe('page123');
  });

  test('attachment with _links', () => {
    const att: ConfluenceAttachment = {
      id: 'att3',
      title: 'video.mp4',
      mediaType: 'video/mp4',
      fileSize: 1024 * 1024 * 10,
      _links: {
        download: '/wiki/download/att3',
      },
    };
    expect(att._links?.download).toBe('/wiki/download/att3');
  });
});

describe('ConfluencePageVersion', () => {
  test('minimal version', () => {
    const version: ConfluencePageVersion = {
      id: 'ver1',
      number: 1,
      author: {
        type: 'user',
        accountId: 'user123',
        displayName: 'John Doe',
      },
      createdAt: '2024-01-01T00:00:00Z',
    };
    expect(version.id).toBe('ver1');
    expect(version.number).toBe(1);
    expect(version.message).toBeUndefined();
  });

  test('version with message', () => {
    const version: ConfluencePageVersion = {
      id: 'ver2',
      number: 2,
      message: 'Updated introduction section',
      author: {
        type: 'user',
        accountId: 'user456',
        displayName: 'Jane Smith',
      },
      createdAt: '2024-01-15T12:30:00Z',
    };
    expect(version.message).toBe('Updated introduction section');
  });

  test('version detail extends version', () => {
    const detail: ConfluencePageVersionDetail = {
      id: 'ver3',
      number: 3,
      author: {
        type: 'user',
        accountId: 'user789',
        displayName: 'Bob Wilson',
      },
      createdAt: '2024-02-01T08:00:00Z',
      body: {
        storage: {
          value: '<p>Version 3 content</p>',
          representation: 'storage',
        },
      },
    };
    expect(detail.number).toBe(3);
    expect(detail.body?.storage.value).toBe('<p>Version 3 content</p>');
  });
});

describe('ConfluencePageTree', () => {
  test('leaf node', () => {
    const tree: ConfluencePageTree = {
      id: 'page1',
      title: 'Leaf Page',
      children: [],
    };
    expect(tree.id).toBe('page1');
    expect(tree.title).toBe('Leaf Page');
    expect(tree.children).toEqual([]);
  });

  test('node with children', () => {
    const tree: ConfluencePageTree = {
      id: 'parent',
      title: 'Parent Page',
      children: [
        {
          id: 'child1',
          title: 'Child 1',
          children: [],
        },
        {
          id: 'child2',
          title: 'Child 2',
          children: [],
        },
      ],
    };
    expect(tree.children.length).toBe(2);
    expect(tree.children[0].title).toBe('Child 1');
    expect(tree.children[1].title).toBe('Child 2');
  });

  test('nested tree', () => {
    const tree: ConfluencePageTree = {
      id: 'root',
      title: 'Root',
      children: [
        {
          id: 'level1',
          title: 'Level 1',
          children: [
            {
              id: 'level2',
              title: 'Level 2',
              children: [
                {
                  id: 'level3',
                  title: 'Level 3',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(tree.children[0].children[0].children[0].title).toBe('Level 3');
  });
});
