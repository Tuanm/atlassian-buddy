import { describe, expect, test } from 'bun:test';
import { extractTextFromADF } from '../api/jira';

describe('extractTextFromADF', () => {
  test('returns empty string for null/undefined', () => {
    expect(extractTextFromADF(null)).toBe('');
    expect(extractTextFromADF(undefined)).toBe('');
  });

  test('returns string for primitive values', () => {
    expect(extractTextFromADF('hello')).toBe('hello');
    expect(extractTextFromADF(123)).toBe('123');
  });

  test('extracts text from doc with paragraphs', () => {
    const adf = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello ' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'World' }],
        },
      ],
    };
    expect(extractTextFromADF(adf)).toBe('Hello \n\nWorld');
  });

  test('extracts text from heading', () => {
    const adf = {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Title' }],
    };
    expect(extractTextFromADF(adf)).toBe('## Title');
  });

  test('extracts text from code block', () => {
    const adf = {
      type: 'codeBlock',
      content: [{ type: 'text', text: 'const x = 1;' }],
    };
    expect(extractTextFromADF(adf)).toBe('```\nconst x = 1;\n```');
  });

  test('handles nested content', () => {
    const adf = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Line 1' },
            { type: 'text', text: ' and line 2' },
          ],
        },
      ],
    };
    expect(extractTextFromADF(adf)).toBe('Line 1 and line 2');
  });
});
