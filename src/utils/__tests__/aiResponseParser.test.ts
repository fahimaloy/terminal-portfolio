// src/utils/__tests__/aiResponseParser.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseAiResponse,
  parseIdList,
  stripAllMarkers,
  containsAnyMarker,
} from '../aiResponseParser';

describe('parseIdList', () => {
  it('parses comma ids and drops junk', () => {
    expect(parseIdList('1, 2, nope, 3.5, 4')).toEqual([1, 2, 4]);
  });

  it('dedupes repeat ids and handles empty input', () => {
    expect(parseIdList('2,2,3, 3 ,1')).toEqual([2, 3, 1]);
    expect(parseIdList(undefined)).toEqual([]);
    expect(parseIdList('')).toEqual([]);
  });
});

describe('parseAiResponse', () => {
  it('keeps surrounding prose around a project list', () => {
    const segments = parseAiResponse(
      'See these [[PROJECT_LIST:1,2]] for proof.',
    );
    expect(segments).toEqual([
      { type: 'text', content: 'See these ' },
      { type: 'project_list', ids: [1, 2] },
      { type: 'text', content: ' for proof.' },
    ]);
  });

  it('falls back to text for malformed or unclosed single ids', () => {
    const bad = parseAiResponse(
      'Look [[PROJECT_SINGLE:abc]] and [[PROJECT_REF:',
    );
    expect(bad.some((s) => s.type === 'project_single')).toBe(false);
    expect(
      bad.map((s) => (s.type === 'text' ? s.content : '')).join(''),
    ).toContain('[[PROJECT_SINGLE:abc]]');
    expect(
      bad.map((s) => (s.type === 'text' ? s.content : '')).join(''),
    ).toContain('[[PROJECT_REF:');
  });

  it('falls back to text for a malformed skill id', () => {
    const segments = parseAiResponse('Try [[SKILL:NaN]] now');
    expect(segments.some((s) => s.type === 'skill_ref')).toBe(false);
    expect(
      segments.map((s) => (s.type === 'text' ? s.content : '')).join(''),
    ).toContain('[[SKILL:NaN]]');
  });

  it('parses skill list, timeline, and table in one pass', () => {
    const segments = parseAiResponse(
      'Skills [[SKILL_LIST:3,4]] then [[EXPERIENCE_TIMELINE]] and [[PROJECT_TABLE]]',
    );
    expect(segments).toEqual([
      { type: 'text', content: 'Skills ' },
      { type: 'skill_list', ids: [3, 4] },
      { type: 'text', content: ' then ' },
      { type: 'experience_timeline' },
      { type: 'text', content: ' and ' },
      { type: 'project_table' },
    ]);
  });

  it('returns no segments for empty or non-string input', () => {
    expect(parseAiResponse('')).toEqual([]);
  });
});

describe('stripAllMarkers / containsAnyMarker', () => {
  it('strips known markers and trims prose', () => {
    expect(stripAllMarkers('Hi [[SKILL:7]] there [[PROJECT_TABLE]]')).toBe(
      'Hi  there',
    );
  });

  it('leaves unknown or unclosed markers alone', () => {
    expect(containsAnyMarker('plain text')).toBe(false);
    expect(containsAnyMarker('broken [[PROJECT_REF:')).toBe(false);
    expect(containsAnyMarker('Skill [[SKILL:9]] here')).toBe(true);
  });
});
