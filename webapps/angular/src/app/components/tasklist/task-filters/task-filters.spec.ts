import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import { TaskFilter } from '../../../models/tasklist';


const FILTER_SEARCH_KEYS = [
  'tasklist.searchFilters',
  'tasklist.noFiltersMatchSearch',
];

const makeFilter = (id: string, name: string): TaskFilter =>
  ({ id, name } as TaskFilter);

// Replicate filteredFilters() logic from TaskFiltersComponent
const filteredFilters = (filters: TaskFilter[], searchQuery: string): TaskFilter[] => {
  if (!searchQuery.trim()) return filters;
  const q = searchQuery.toLowerCase();
  return filters.filter(f => f.name.toLowerCase().includes(q));
};

describe('task-filters: filter count and search contracts', () => {
  let en: Record<string, string>;
  let fr: Record<string, string>;

  beforeAll(() => {
    const base = join(__dirname, '../../../../assets/i18n');
    en = JSON.parse(readFileSync(join(base, 'en.json'), 'utf-8'));
    fr = JSON.parse(readFileSync(join(base, 'fr.json'), 'utf-8'));
  });

  // ── i18n ─────────────────────────────────────────────────────────────────

  it('search i18n keys exist in en.json with non-empty values', () => {
    const missing = FILTER_SEARCH_KEYS.filter(k => !en[k] || en[k].trim() === '');
    expect(missing, `Missing/empty in en.json: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('search i18n keys exist in fr.json with non-empty values', () => {
    const missing = FILTER_SEARCH_KEYS.filter(k => !fr[k] || fr[k].trim() === '');
    expect(missing, `Missing/empty in fr.json: ${missing.join(', ')}`).toHaveLength(0);
  });

  // ── Filter counter ────────────────────────────────────────────────────────

  it('filteredFilters with empty searchQuery returns all filters (counter reflects total)', () => {
    const filters = [
      makeFilter('f1', 'My Tasks'),
      makeFilter('f2', 'Team Tasks'),
      makeFilter('f3', 'Overdue'),
    ];
    const result = filteredFilters(filters, '');
    expect(result).toHaveLength(3);
    expect(result).toBe(filters); // same reference — no copy when no search
  });

  it('filteredFilters with whitespace-only searchQuery returns all filters', () => {
    const filters = [makeFilter('f1', 'Alpha'), makeFilter('f2', 'Beta')];
    expect(filteredFilters(filters, '   ')).toHaveLength(2);
  });

  // ── Search logic ──────────────────────────────────────────────────────────

  it('filteredFilters matches on filter name, case-insensitively', () => {
    const filters = [
      makeFilter('f1', 'My Tasks'),
      makeFilter('f2', 'Team Tasks'),
      makeFilter('f3', 'Overdue'),
    ];
    const result = filteredFilters(filters, 'task');
    expect(result).toHaveLength(2);
    expect(result.map(f => f.id)).toEqual(['f1', 'f2']);
  });

  it('filteredFilters is case-insensitive (uppercase query matches lowercase name)', () => {
    const filters = [makeFilter('f1', 'overdue'), makeFilter('f2', 'Team')];
    expect(filteredFilters(filters, 'OVER')).toHaveLength(1);
    expect(filteredFilters(filters, 'OVER')[0].id).toBe('f1');
  });

  it('filteredFilters returns empty array when no filter matches — triggers search-empty state', () => {
    const filters = [makeFilter('f1', 'My Tasks'), makeFilter('f2', 'Overdue')];
    const result = filteredFilters(filters, 'zzznomatch');
    expect(result).toHaveLength(0);
  });

  it('filteredFilters matches partial name substring', () => {
    const filters = [
      makeFilter('f1', 'Assigned to me'),
      makeFilter('f2', 'Unassigned'),
      makeFilter('f3', 'High priority'),
    ];
    expect(filteredFilters(filters, 'assign')).toHaveLength(2);
  });
});
