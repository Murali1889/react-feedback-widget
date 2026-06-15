import { describe, it, expect } from 'vitest';
import {
  getFilteredItems,
  getStatusCounts,
  getAttentionCounts,
  initialFilters,
} from '../filtering.js';

const items = [
  { id: '1', feedback: 'submit broken', status: 'new', severity: 'high', userName: 'Murali', userEmail: 'm@x.com', url: '/checkout', video: 'data:video/x', eventLogs: [{ type: 'console', level: 'error', message: 'TypeError' }] },
  { id: '2', feedback: 'sidebar typo', status: 'open', severity: 'low', userName: 'Jordan', userEmail: 'j@x.com', url: '/home', owner: { name: 'A' } },
  { id: '3', feedback: 'dark mode wanted', status: 'resolved', severity: 'medium', userName: 'Riya', userEmail: 'r@x.com', url: '/settings' },
  { id: '4', feedback: 'form jumps on focus', status: 'in_progress', severity: 'high', userName: 'Tomas', userEmail: 't@x.com', url: '/login', eventLogs: [{ type: 'network', status: 500 }] },
];

describe('initialFilters', () => {
  it('starts empty', () => {
    const f = initialFilters();
    expect(f.search).toBe('');
    expect(f.statuses).toEqual(new Set());
    expect(f.severities).toEqual(new Set());
    expect(f.flags).toEqual(new Set());
  });
});

describe('getFilteredItems', () => {
  it('returns all items when filters are empty', () => {
    expect(getFilteredItems(items, initialFilters()).length).toBe(4);
  });

  it('search is case-insensitive across feedback/user/url', () => {
    const f = { ...initialFilters(), search: 'TYPO' };
    expect(getFilteredItems(items, f).map(i => i.id)).toEqual(['2']);
  });

  it('search matches userName and userEmail', () => {
    expect(getFilteredItems(items, { ...initialFilters(), search: 'Riya' }).map(i => i.id)).toEqual(['3']);
    expect(getFilteredItems(items, { ...initialFilters(), search: 'j@x' }).map(i => i.id)).toEqual(['2']);
  });

  it('search matches url', () => {
    expect(getFilteredItems(items, { ...initialFilters(), search: '/checkout' }).map(i => i.id)).toEqual(['1']);
  });

  it('statuses filter is OR within category', () => {
    const f = { ...initialFilters(), statuses: new Set(['new', 'open']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','2']);
  });

  it('severities filter is OR within category', () => {
    const f = { ...initialFilters(), severities: new Set(['high']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','4']);
  });

  it('categories AND together', () => {
    const f = { ...initialFilters(), statuses: new Set(['new']), severities: new Set(['high']) };
    expect(getFilteredItems(items, f).map(i => i.id)).toEqual(['1']);
  });

  it('flag withMedia matches items with video or screenshot', () => {
    const f = { ...initialFilters(), flags: new Set(['withMedia']) };
    expect(getFilteredItems(items, f).map(i => i.id)).toEqual(['1']);
  });

  it('flag hasErrors matches items with console error or failed network', () => {
    const f = { ...initialFilters(), flags: new Set(['hasErrors']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','4']);
  });

  it('flag needsOwner matches items without owner', () => {
    const f = { ...initialFilters(), flags: new Set(['needsOwner']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','3','4']);
  });

  it('multiple flags AND together', () => {
    const f = { ...initialFilters(), flags: new Set(['hasErrors', 'needsOwner']) };
    expect(getFilteredItems(items, f).map(i => i.id).sort()).toEqual(['1','4']);
  });
});

describe('getStatusCounts', () => {
  it('counts items by status', () => {
    expect(getStatusCounts(items)).toEqual({ new: 1, open: 1, in_progress: 1, resolved: 1 });
  });
});

describe('getAttentionCounts', () => {
  it('returns counts for withMedia, hasErrors, needsOwner', () => {
    expect(getAttentionCounts(items)).toEqual({ withMedia: 1, hasErrors: 2, needsOwner: 3 });
  });
});
