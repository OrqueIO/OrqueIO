import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Regression guard: every i18n key referenced in the batch view module
 * (batch-runtime-list, batch-history-list, batch-detail, batch-jobs-list)
 * must exist in en.json with exact casing and a non-empty value.
 */

const RUNTIME_LIST_KEYS = [
  'BATCHES_PROGRESS_IN',
  'BATCHES_PROGRESS_NO_RUNNING',
  'BATCHES_PROGRESS_ID',
  'BATCHES_PROGRESS_TYPE',
  'BATCHES_PROGRESS_USER',
  'BATCHES_PROGRESS_START_TIME',
  'BATCHES_PROGRESS_FAIL_JOBS',
  'BATCHES_PROGRESS_PROGRESS',
  'LOADING',
  'ERROR_LOADING_DATA',
];

const HISTORY_LIST_KEYS = [
  'BATCHES_PROGRESS_END',
  'BATCHES_PROGRESS_NO_FINISHED',
  'BATCHES_PROGRESS_ID',
  'BATCHES_PROGRESS_TYPE',
  'BATCHES_PROGRESS_START_TIME',
  'BATCHES_PROGRESS_END_TIME',
  'BATCHES_LOAD_ENDED',
  'BATCHES_HISTORY_ALL_TYPES',
  'BATCHES_DURATION',
  'BATCHES_FILTER_TYPE',
  'LOADING',
  'ERROR_LOADING_DATA',
];

const DETAIL_KEYS = [
  'BATCHES_SELECT_BATCH',
  'BATCHES_PROGRESS_COMPLETED',
  'BATCHES_PROGRESS_IN_PROGRESS',
  'BATCHES_PROGRESS_BATCH_DETAILS',
  'BATCHES_PROGRESS_TOOLTIP_ACTIVATE_BATCH',
  'BATCHES_PROGRESS_TOOLTIP_SUSPEND_BATCH',
  'BATCHES_PROGRESS_TOOLTIP_INCREMENT_NUMBER',
  'BATCHES_PROGRESS_TOOLTIP_DELETE_BATCH',
  'BATCHES_PROGRESS_PROPERTY',
  'BATCHES_PROGRESS_VALUE',
  'BATCHES_PROGRESS_FAILED_LABEL',
  'BATCHES_DELETE_BATCH_TITLE',
  'BATCHES_DELETE_BATCH_MESSAGE',
  'BATCHES_TECHNICAL_DETAILS',
  'DELETE',
  'CANCEL',
  'LOADING',
];

const BATCH_TYPE_LABEL_KEYS = [
  'BATCH_TYPE_MIGRATION',
  'BATCH_TYPE_MODIFICATION',
  'BATCH_TYPE_DELETION',
  'BATCH_TYPE_SUSPENSION',
  'BATCH_TYPE_SET_JOB_RETRIES',
  'BATCH_TYPE_SET_EXTERNAL_TASK_RETRIES',
  'BATCH_TYPE_SET_REMOVAL_TIME',
  'BATCH_TYPE_DECISION_SET_REMOVAL_TIME',
  'BATCH_TYPE_BATCH_SET_REMOVAL_TIME',
  'BATCH_TYPE_SET_VARIABLES',
  'BATCH_TYPE_CORRELATE_MESSAGE',
];

const JOBS_LIST_KEYS = [
  'BATCHES_FAILED_JOBS',
  'BATCHES_NO_FAILED_JOBS',
  'BATCHES_PROGRESS_ID',
  'BATCHES_PROGRESS_EXCEPTION',
  'BATCHES_PROGRESS_ACTIONS',
  'BATCHES_VIEW_STACKTRACE',
  'BATCHES_RETRY_JOB',
  'BATCHES_DELETE_JOB',
  'LOADING',
];

const ALL_KEYS = [
  ...new Set([
    ...RUNTIME_LIST_KEYS,
    ...HISTORY_LIST_KEYS,
    ...DETAIL_KEYS,
    ...JOBS_LIST_KEYS,
    ...BATCH_TYPE_LABEL_KEYS,
  ]),
];

describe('i18n coverage: batch view module', () => {
  let en: Record<string, string>;
  let fr: Record<string, string>;

  beforeAll(() => {
    const base = join(__dirname, '../../../../assets/i18n');
    en = JSON.parse(readFileSync(join(base, 'en.json'), 'utf-8'));
    fr = JSON.parse(readFileSync(join(base, 'fr.json'), 'utf-8'));
  });

  it('en.json is loadable', () => {
    expect(typeof en).toBe('object');
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });

  it('fr.json is loadable', () => {
    expect(typeof fr).toBe('object');
    expect(Object.keys(fr).length).toBeGreaterThan(0);
  });

  it('all batch view keys exist in en.json', () => {
    const missing = ALL_KEYS.filter(k => !Object.prototype.hasOwnProperty.call(en, k));
    expect(missing, `Missing in en.json: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('all batch view keys exist in fr.json', () => {
    const missing = ALL_KEYS.filter(k => !Object.prototype.hasOwnProperty.call(fr, k));
    expect(missing, `Missing in fr.json: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('all batch view keys resolve to non-empty strings in en.json', () => {
    const empty = ALL_KEYS.filter(k => !en[k] || en[k].trim() === '');
    expect(empty, `Empty translations in en.json: ${empty.join(', ')}`).toHaveLength(0);
  });

  it('all batch view keys resolve to non-empty strings in fr.json', () => {
    const empty = ALL_KEYS.filter(k => !fr[k] || fr[k].trim() === '');
    expect(empty, `Empty translations in fr.json: ${empty.join(', ')}`).toHaveLength(0);
  });

  it('runtime list keys are all present', () => {
    const missing = RUNTIME_LIST_KEYS.filter(k => !en[k]);
    expect(missing, `Missing runtime list keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('history list keys are all present', () => {
    const missing = HISTORY_LIST_KEYS.filter(k => !en[k]);
    expect(missing, `Missing history list keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('detail panel keys are all present', () => {
    const missing = DETAIL_KEYS.filter(k => !en[k]);
    expect(missing, `Missing detail panel keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('jobs list keys are all present', () => {
    const missing = JOBS_LIST_KEYS.filter(k => !en[k]);
    expect(missing, `Missing jobs list keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('batch type label keys are all present in en.json', () => {
    const missing = BATCH_TYPE_LABEL_KEYS.filter(k => !en[k]);
    expect(missing, `Missing batch type label keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('batch type label keys are all present in fr.json', () => {
    const missing = BATCH_TYPE_LABEL_KEYS.filter(k => !fr[k]);
    expect(missing, `Missing batch type label keys in fr.json: ${missing.join(', ')}`).toHaveLength(0);
  });

});
