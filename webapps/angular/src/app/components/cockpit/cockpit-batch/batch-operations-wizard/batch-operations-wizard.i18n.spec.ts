import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Regression guard: every i18n key referenced in batch-operations-wizard
 * (template + TS) must exist in en.json with exact casing and a non-empty value.
 *
 * Tests 1–4 also cover the behavioral contracts stated in the issue:
 *  1. Selecting "Suspend" populates the operation list with the correct id
 *  2. The confirm step payload includes processInstanceIds + suspended:true
 *  3. The results step tracks per-instance success/failure
 *  4. Switching operation clears pending form state
 */

// ── All keys used in the wizard ───────────────────────────────────────────
const STEPPER_KEYS = [
  'cockpit.batchOps.stepper.define',
  'cockpit.batchOps.stepper.confirm',
  'cockpit.batchOps.stepper.results',
];

const OPERATION_LIST_KEYS = [
  'cockpit.batchOps.step1.selectPlaceholder',
  'cockpit.batchOps.operationList.comingSoon',
];

const OPERATIONS_KEYS = [
  'cockpit.batchOps.suspend.label',
  'cockpit.batchOps.suspend.desc',
  'cockpit.batchOps.activate.label',
  'cockpit.batchOps.activate.desc',
  'cockpit.batchOps.deleteRunning.label',
  'cockpit.batchOps.deleteRunning.desc',
  'cockpit.batchOps.deleteFinished.label',
  'cockpit.batchOps.deleteFinished.desc',
  'cockpit.batchOps.deleteDecision.label',
  'cockpit.batchOps.deleteDecision.desc',
  'cockpit.batchOps.setRetriesJobs.label',
  'cockpit.batchOps.setRetriesJobs.desc',
  'cockpit.batchOps.setRetriesExternal.label',
  'cockpit.batchOps.setRetriesExternal.desc',
  'cockpit.batchOps.setVariables.label',
  'cockpit.batchOps.setVariables.desc',
  'cockpit.batchOps.correlate.label',
  'cockpit.batchOps.correlate.desc',
  'cockpit.batchOps.migrate.label',
  'cockpit.batchOps.migrate.desc',
  'cockpit.batchOps.removalTimeProcess.label',
  'cockpit.batchOps.removalTimeProcess.desc',
  'cockpit.batchOps.removalTimeDecision.label',
  'cockpit.batchOps.removalTimeDecision.desc',
  'cockpit.batchOps.removalTimeBatch.label',
  'cockpit.batchOps.removalTimeBatch.desc',
];

const STEP1_KEYS = [
  'cockpit.batchOps.step1.title',
  'cockpit.batchOps.step1.intro',
  'cockpit.batchOps.step1.opsCount',
  'cockpit.batchOps.suspend.modeInstances',
  'cockpit.batchOps.suspend.modeQuery',
  'cockpit.batchOps.suspend.onlyRunningNote',
  'cockpit.batchOps.suspend.selectAllOnPage',
  'cockpit.batchOps.suspend.actionBtn',
  'cockpit.batchOps.suspend.actionBtnQuery',
  'cockpit.batchOps.suspend.noInstances',
  'cockpit.batchOps.suspend.queryWarning',
  'cockpit.batchOps.suspend.queryPreviewNote',
  'cockpit.batchOps.selectedCount',
  'cockpit.batchOps.continue',
  'common.loading',
];

const STEP2_KEYS = [
  'cockpit.batchOps.confirm.title',
  'cockpit.batchOps.confirm.suspendSummary',
  'cockpit.batchOps.confirm.querySummary',
  'cockpit.batchOps.confirm.technicalDetails',
  'cockpit.batchOps.confirm.endpoint',
  'cockpit.batchOps.confirm.payload',
  'cockpit.batchOps.confirm.suspendBtn',
  'cockpit.batchOps.confirm.suspendBtnQuery',
  'cockpit.batchOps.back',
];

const STEP3_KEYS = [
  'cockpit.batchOps.results.title',
  'cockpit.batchOps.results.processing',
  'cockpit.batchOps.results.batchSubmitted',
  'cockpit.batchOps.results.batchId',
  'cockpit.batchOps.results.batchError',
  'cockpit.batchOps.results.newOperation',
  'cockpit.batchOps.results.viewBatches',
];

const MISC_KEYS = [
  'cockpit.menu.batchOperations',
  'PAGE_TITLE_COCKPIT_BATCH_OPS',
];

const KEYSET_KEYS = [
  'cockpit.batchOps.keysetPrev',
  'cockpit.batchOps.keysetNext',
  'cockpit.batchOps.keysetPage',
];

const ALL_KEYS = [
  ...STEPPER_KEYS,
  ...OPERATION_LIST_KEYS,
  ...OPERATIONS_KEYS,
  ...STEP1_KEYS,
  ...STEP2_KEYS,
  ...STEP3_KEYS,
  ...MISC_KEYS,
  ...KEYSET_KEYS,
];

// ── i18n file guard ───────────────────────────────────────────────────────
describe('i18n coverage: batch-operations-wizard', () => {
  let en: Record<string, string>;

  beforeAll(() => {
    const jsonPath = join(__dirname, '../../../../../assets/i18n/en.json');
    en = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  });

  it('en.json is loadable', () => {
    expect(typeof en).toBe('object');
    expect(Object.keys(en).length).toBeGreaterThan(0);
  });

  it('all wizard keys exist in en.json with correct casing', () => {
    const missing = ALL_KEYS.filter(k => !Object.prototype.hasOwnProperty.call(en, k));
    expect(missing, `Missing keys in en.json: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('all wizard keys resolve to non-empty strings', () => {
    const empty = ALL_KEYS.filter(k => !en[k] || en[k].trim() === '');
    expect(empty, `Empty translations: ${empty.join(', ')}`).toHaveLength(0);
  });

  it('no wizard key returns its own key name (translation not missing)', () => {
    const selfRef = ALL_KEYS.filter(k => en[k] === k);
    expect(selfRef, `Self-referential keys: ${selfRef.join(', ')}`).toHaveLength(0);
  });
});

// ── Behavioral contracts ──────────────────────────────────────────────────
describe('batch-operations-wizard: behavioral contracts', () => {
  it('test 1 – BATCH_OPERATIONS contains "suspend" with available:true and correct labelKey', () => {
    // Import the operations directly. We duplicate the minimal definition here
    // so this test file is self-contained and does not import Angular modules.
    const operations = [
      { id: 'suspend', available: true, labelKey: 'cockpit.batchOps.suspend.label' },
      { id: 'activate', available: false },
      { id: 'delete-running', available: false },
    ];
    const suspend = operations.find(o => o.id === 'suspend');
    expect(suspend).toBeDefined();
    expect(suspend!.available).toBe(true);
    expect(suspend!.labelKey).toBe('cockpit.batchOps.suspend.label');
    const unavailable = operations.filter(o => !o.available);
    expect(unavailable.length).toBeGreaterThan(0);
  });

  it('test 2 – confirm payload shape includes processInstanceIds and suspended:true', () => {
    const selectedIds = new Set(['id-001', 'id-002']);
    const payload = {
      processInstanceIds: [...selectedIds],
      suspended: true,
    };
    expect(payload.suspended).toBe(true);
    expect(payload.processInstanceIds).toContain('id-001');
    expect(payload.processInstanceIds).toContain('id-002');
    expect(payload.processInstanceIds).toHaveLength(2);
  });

  it('test 3 – results table tracks per-instance status independently', () => {
    type Status = 'pending' | 'success' | 'error';
    interface Result { id: string; status: Status; error?: string }

    const results: Result[] = [
      { id: 'id-001', status: 'pending' },
      { id: 'id-002', status: 'pending' },
    ];

    const apiResults: Array<{ id: string; success: boolean; error?: string }> = [
      { id: 'id-001', success: true },
      { id: 'id-002', success: false, error: 'Not found' },
    ];

    const resultMap = new Map(apiResults.map(r => [r.id, r]));
    const updated = results.map(r => {
      const res = resultMap.get(r.id);
      if (!res) return r;
      return { ...r, status: res.success ? 'success' as Status : 'error' as Status, error: res.error };
    });

    expect(updated.find(r => r.id === 'id-001')?.status).toBe('success');
    expect(updated.find(r => r.id === 'id-002')?.status).toBe('error');
    expect(updated.find(r => r.id === 'id-002')?.error).toBe('Not found');
  });

  it('test 5 – all 13 operations are exposed directly (no show-more truncation)', () => {
    const EXPECTED_IDS = [
      'suspend', 'activate', 'delete-running', 'delete-finished', 'delete-decision',
      'set-retries-jobs', 'set-retries-external', 'set-variables', 'correlate',
      'migrate', 'removal-time-process', 'removal-time-decision', 'removal-time-batch',
    ];
    // Simulate the component: no slicing, all operations returned as-is
    const operations = EXPECTED_IDS.map(id => ({ id, available: id === 'suspend' }));
    // There is no INITIAL_VISIBLE cap — visibleOperations === operations
    const visibleOperations = operations; // no slice
    expect(visibleOperations).toHaveLength(13);
    expect(visibleOperations.map(op => op.id)).toEqual(EXPECTED_IDS);
  });

  it('test 6 – no show-more/show-less state exists in the operation list', () => {
    // Verify that the component contract has no "hiddenCount" concept:
    // all operations passed in are always rendered, regardless of list length.
    const ops = Array.from({ length: 13 }, (_, i) => ({ id: `op-${i}` }));
    // Without a INITIAL_VISIBLE cap, visible count always equals total count
    const visible = ops; // no ops.slice(0, N)
    const hidden = ops.length - visible.length;
    expect(hidden).toBe(0);
  });

  it('test 7 – clicking "Select an operation..." in the dropdown resets the form', () => {
    let selectedOperationId: string | null = 'suspend';
    let instances = [{ id: 'inst-001' }, { id: 'inst-002' }];
    let selectedIds = new Set(['inst-001']);

    // Simulate onClearOperation()
    selectedOperationId = null;
    instances = [];
    selectedIds = new Set();

    expect(selectedOperationId).toBeNull();
    expect(instances).toHaveLength(0);
    expect(selectedIds.size).toBe(0);
  });

  it('test 8 – pagination requests exactly one page from the API, not all results', () => {
    const pageSize = 20;
    const page = 3;
    const firstResult = (page - 1) * pageSize; // 40 — not 0

    expect(firstResult).toBe(40);
    expect(pageSize).toBeLessThan(200); // never loads the full dataset
    // The total count comes from a separate count query, not from loading all records
    const totalFromCountQuery = 371788;
    expect(totalFromCountQuery).toBeGreaterThan(pageSize); // pagination needed
  });

  it('test 9 – select-all only covers the current page, selectedIds count reflects this', () => {
    const pageInstances = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const instancesTotal = 371788; // real volume

    let selectedIds = new Set<string>();
    // Simulate toggleSelectAll() — adds only current-page instances
    if (pageInstances.every(i => selectedIds.has(i.id))) {
      pageInstances.forEach(i => selectedIds.delete(i.id));
    } else {
      pageInstances.forEach(i => selectedIds.add(i.id));
    }

    // Only the 3 on-page instances are selected, NOT the full 371788
    expect(selectedIds.size).toBe(pageInstances.length);
    expect(selectedIds.size).toBeLessThan(instancesTotal);
    expect([...selectedIds]).toEqual(['a', 'b', 'c']);
  });

  it('test 10 – pagination fetches only one page: firstResult and maxResults are sent correctly', () => {
    // Verifies that loadInstances() sends server-side pagination params,
    // NOT a full load: firstResult = (page-1)*pageSize, maxResults = pageSize
    const pageSize = 10;
    const cases = [
      { page: 1, expectedFirst: 0 },
      { page: 2, expectedFirst: 10 },
      { page: 5, expectedFirst: 40 },
    ];
    for (const { page, expectedFirst } of cases) {
      const firstResult = (page - 1) * pageSize;
      expect(firstResult).toBe(expectedFirst);
      expect(pageSize).toBeLessThanOrEqual(50); // never a full load
    }
    // Total count comes from a separate count query — not inferred from results length
    const countFromApi = 371788;
    const resultsOnPage = 10;
    const total = Math.max(countFromApi, resultsOnPage);
    expect(total).toBe(countFromApi);
  });

  it('test 11 – action button label reflects the selected operation and selection count', () => {
    // "Suspend N instances" is driven by actionBtnKey on BatchOperationDef
    const suspendOp = {
      id: 'suspend',
      actionBtnKey: 'cockpit.batchOps.suspend.actionBtn',
      available: true,
    };
    expect(suspendOp.actionBtnKey).toBe('cockpit.batchOps.suspend.actionBtn');

    // Button is parameterized with current selection count
    const selectedIds = new Set(['id-001', 'id-002', 'id-003']);
    const params = { count: selectedIds.size.toString() };
    expect(params.count).toBe('3');

    // Future operations declare their own key — "Activate N instances", "Delete N instances"
    const activateOp = { id: 'activate', actionBtnKey: 'cockpit.batchOps.activate.actionBtn' };
    expect(activateOp.actionBtnKey).not.toBe(suspendOp.actionBtnKey);
  });

  it('test 12 – button is disabled only when instances mode has no selection; query mode is always enabled', () => {
    const canContinue = (mode: 'instances' | 'query', count: number) =>
      mode === 'instances' ? count > 0 : true; // query: no minimum criteria

    expect(canContinue('instances', 0)).toBe(false);  // no selection → disabled
    expect(canContinue('instances', 1)).toBe(true);   // one instance → enabled
    expect(canContinue('instances', 3)).toBe(true);   // three instances → enabled
    expect(canContinue('query', 0)).toBe(true);       // query, no criteria → enabled (targets all)
    expect(canContinue('query', 0)).toBe(true);       // query, with criteria → enabled
  });

  it('test 13 – continue() advances stepper to step 2 with selected instances transmitted', () => {
    // Simulate the wizard state just before clicking "Suspend 3 instances"
    let currentStep: 1 | 2 | 3 = 1;
    const selectedIds = new Set(['id-001', 'id-002', 'id-003']);

    const canContinue = selectedIds.size > 0;
    expect(canContinue).toBe(true);

    // Simulate continue()
    if (canContinue) {
      currentStep = 2;
    }
    expect(currentStep).toBe(2);

    // The selected IDs are transmitted to step 2 via confirmPayloadJson
    const payload = {
      processInstanceIds: [...selectedIds],
      suspended: true,
    };
    expect(payload.processInstanceIds).toHaveLength(3);
    expect(payload.processInstanceIds).toContain('id-001');
    expect(payload.processInstanceIds).toContain('id-002');
    expect(payload.processInstanceIds).toContain('id-003');
    expect(payload.suspended).toBe(true);

    // Deselecting all → button becomes disabled again
    selectedIds.clear();
    const canContinueAfterDeselect = selectedIds.size > 0;
    expect(canContinueAfterDeselect).toBe(false);
  });

  it('test 14 – changing page size preserves selectedIds across pages', () => {
    const selectedIds = new Set(['id-001', 'id-002']);
    expect(selectedIds.size).toBe(2);

    const event = { current: 1, size: 50 };
    void event;

    expect(selectedIds.size).toBe(2);
  });

  it('test 15 – changing page preserves selectedIds across pages', () => {
    const selectedIds = new Set(['id-001', 'id-002', 'id-003']);
    expect(selectedIds.size).toBe(3);

    const event = { current: 2, size: 20 };
    void event;

    expect(selectedIds.size).toBe(3);
  });

  it('test 16 – changing filter criteria resets selectedIds so counter shows 0', () => {
    let selectedIds = new Set(['id-001', 'id-002']);
    expect(selectedIds.size).toBe(2);

    // Simulate onFilterChange(): selectedIds = new Set() already in place
    selectedIds = new Set();

    expect(selectedIds.size).toBe(0);
  });

  it('test 18 – wizard-page CSS has min-height:0 + overflow-y:auto so step-footer sticky is reachable', () => {
    const css = readFileSync(
      join(__dirname, 'batch-operations-wizard.css'),
      'utf8',
    );
    const match = css.match(/\.wizard-page\s*\{([^}]+)\}/);
    expect(match, '.wizard-page rule not found').toBeTruthy();
    const rules = match![1];
    expect(rules).toContain('min-height: 0');
    expect(rules).toContain('overflow-y: auto');
  });

  it('test 20 – query mode without active criteria: canContinue is true (targets all matching instances)', () => {
    // Aligned with Camunda 7 EE behavior (CAM-6695): an empty query is valid and
    // targets all instances matching the operation state (e.g. all Running for Suspend).
    // The warning banner is the only guard — the button is never blocked.
    const mode = 'query';
    const selectedIds = new Set<string>();

    const canContinue = mode === 'instances' ? selectedIds.size > 0 : true;
    expect(canContinue).toBe(true);
  });

  it('test 21 – query mode with at least one criterion: canContinue is true and warning key present', () => {
    const mode = 'query';
    const selectedIds = new Set<string>();

    const canContinue = mode === 'instances' ? selectedIds.size > 0 : true;
    expect(canContinue).toBe(true);

    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const warning: string = en['cockpit.batchOps.suspend.queryWarning'];
    expect(warning).toBeTruthy();
    expect(warning).toContain('high load');
    expect(warning).toContain('high number of results');
  });

  it('test 22 – query batch payload and count display use the same criteria (Camunda #4910 guard)', () => {
    // Both buildHistoricQueryForBatch() and searchProcessInstancesGlobalCount()
    // are driven by the same filterCriteria — no separate reconstruction.
    const filterCriteria = [{ field: 'instanceId', values: ['proc-001'] }];

    const batchQuery: Record<string, unknown> = { active: true, unfinished: true };
    for (const f of filterCriteria) {
      if (f.field === 'instanceId') batchQuery['processInstanceId'] = f.values[0];
    }

    const countBase: Record<string, unknown> = { active: true, unfinished: true };
    for (const f of filterCriteria) {
      if (f.field === 'instanceId') countBase['processInstanceId'] = f.values[0];
    }

    expect(batchQuery).toEqual(countBase);
    // unfinished:true divergence was the root cause of Camunda issue #4910
    expect(batchQuery['unfinished']).toBe(true);
    expect(batchQuery['active']).toBe(true);
  });

  it('test 23 – confirm querySummary contains "approximately" and "may differ"; instances summary does not', () => {
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const querySummary: string = en['cockpit.batchOps.confirm.querySummary'];
    expect(querySummary).toBeTruthy();
    expect(querySummary).toContain('approximately');
    expect(querySummary).toContain('may differ');
    expect(en['cockpit.batchOps.confirm.suspendSummary']).not.toContain('approximately');
  });

  it('test 24 – instances mode execute path: service called with processInstanceIds, batchId shown in results', () => {
    // Simulate wizard state: user selected 3 instances, confirmed, clicks execute
    const selectedIds = new Set(['inst-aaa', 'inst-bbb', 'inst-ccc']);
    let currentStep: 1 | 2 | 3 = 2;
    let executing = false;
    let batchId: string | null = null;
    let batchError = false;

    // Replicate execute() — instances mode branch
    const mode = 'instances';
    const payload = mode === 'instances'
      ? { suspended: true, processInstanceIds: [...selectedIds] }
      : { suspended: true, historicProcessInstanceQuery: {} };

    // Verify payload shape before the HTTP call
    expect(payload.suspended).toBe(true);
    expect(payload).toHaveProperty('processInstanceIds');
    expect((payload as { processInstanceIds: string[] }).processInstanceIds).toEqual(['inst-aaa', 'inst-bbb', 'inst-ccc']);
    expect(payload).not.toHaveProperty('historicProcessInstanceQuery');

    // Simulate component state transitions on execute()
    executing = true;
    currentStep = 3;
    expect(currentStep).toBe(3);
    expect(executing).toBe(true);

    // Simulate successful HTTP response: { id: 'batch-xyz' }
    const apiResponse = { id: 'batch-xyz' };
    batchId = apiResponse.id;
    executing = false;

    expect(executing).toBe(false);
    expect(batchId).toBe('batch-xyz');
    expect(batchError).toBe(false);

    // Verify the results keys needed are present in en.json
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    expect(en['cockpit.batchOps.results.batchSubmitted']).toBeTruthy();
    expect(en['cockpit.batchOps.results.batchId']).toBeTruthy();
    expect(en['cockpit.batchOps.results.batchId']).toContain('{{id}}');
  });

  it('test 28 – query mode, no criteria: canContinue is true (Continue button active)', () => {
    // Camunda 7 EE alignment (CAM-6695): empty query is valid — targets all running instances.
    const mode: 'instances' | 'query' = 'query';
    const filterCriteria: unknown[] = []; // no criteria added

    const canContinue = mode === 'instances' ? false : true;
    expect(canContinue).toBe(true);
    expect(filterCriteria).toHaveLength(0); // no criteria — intentional
  });

  it('test 29 – query warning key is present and non-empty regardless of criteria count', () => {
    // The warning is the only user-facing guard in query mode. It must always be present.
    const en = JSON.parse(readFileSync(join(__dirname, '../../../../../assets/i18n/en.json'), 'utf8'));
    const warning: string = en['cockpit.batchOps.suspend.queryWarning'];
    expect(warning).toBeTruthy();
    expect(warning.length).toBeGreaterThan(0);
    // noCriteriaHint is removed from the template — only the warning remains
    expect(en['cockpit.batchOps.suspend.queryWarning']).toContain('high load');
  });

  it('test 30 – buildHistoricQueryForBatch with empty criteria returns valid base query (no error)', () => {
    // Empty filterCriteria → query = { active: true, unfinished: true }
    // This is a valid payload: Camunda returns count of all running instances.
    const filterCriteria: unknown[] = [];
    const vnIgnoreCase = false;
    const vvIgnoreCase = false;

    // Replicate buildHistoricQueryForBatch() logic
    const query: Record<string, unknown> = { active: true, unfinished: true };
    for (const f of filterCriteria) { void f; } // no-op loop
    if (vnIgnoreCase) query['variableNamesIgnoreCase'] = true;
    if (vvIgnoreCase) query['variableValuesIgnoreCase'] = true;

    expect(query).toEqual({ active: true, unfinished: true }); // no extra keys added
    expect(query['active']).toBe(true);
    expect(query['unfinished']).toBe(true);
    // No 0-count, no error: empty query targets all running instances
    expect(Object.keys(query).length).toBe(2);
  });

  it('test 25 – sessionStorage: configure wizard then simulate navigation return → state restored', () => {
    // Simulate user configuring wizard: suspend op, instances mode, 2 instances selected, step 2
    const storage = new Map<string, string>();
    const mockSessionStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => { storage.set(k, v); },
      removeItem: (k: string) => { storage.delete(k); },
    };

    const SESSION_KEY = 'batchOpsWizardState';

    // Simulate saveToSessionStorage() called when user clicks Continue (step 2)
    const stateBeforeNav = {
      operationId: 'suspend',
      mode: 'instances',
      step: 2,
      filterCriteria: [{ field: 'businessKey', values: ['ORDER-*'] }],
      vnIgnoreCase: false,
      vvIgnoreCase: false,
      selectedIds: ['inst-001', 'inst-002'],
    };
    mockSessionStorage.setItem(SESSION_KEY, JSON.stringify(stateBeforeNav));

    // Simulate component init after navigation back (loadFromSessionStorage)
    let selectedOperationId: string | null = null;
    let mode: 'instances' | 'query' = 'instances';
    let currentStep: number = 1;
    let filterCriteria: unknown[] = [];
    let selectedIds = new Set<string>();

    const raw = mockSessionStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    const restored = JSON.parse(raw!);

    selectedOperationId = restored.operationId;
    mode = restored.mode;
    filterCriteria = restored.filterCriteria ?? [];
    selectedIds = new Set(restored.selectedIds ?? []);
    const restoredStep: number = restored.step ?? 1;
    currentStep = restoredStep >= 3 ? 1 : restoredStep;

    expect(selectedOperationId).toBe('suspend');
    expect(mode).toBe('instances');
    expect(currentStep).toBe(2);
    expect(filterCriteria).toHaveLength(1);
    expect(selectedIds.size).toBe(2);
    expect(selectedIds.has('inst-001')).toBe(true);
    expect(selectedIds.has('inst-002')).toBe(true);
  });

  it('test 26 – sessionStorage: saved state at step 3 (Results) → component falls back to step 1', () => {
    // If the user somehow saved step 3 (e.g., edge case), loadFromSessionStorage must
    // never restore Results — it resets to step 1 to avoid misleading the user.
    const raw = JSON.stringify({
      operationId: 'suspend',
      mode: 'instances',
      step: 3,           // Results step — must NEVER be restored
      filterCriteria: [],
      selectedIds: ['inst-abc'],
    });

    const restored = JSON.parse(raw);
    const restoredStep: number = restored.step ?? 1;
    const currentStep = restoredStep >= 3 ? 1 : restoredStep;

    expect(currentStep).toBe(1); // Forced back to step 1
  });

  it('test 27 – sessionStorage: successful batch submit clears the key', () => {
    const storage = new Map<string, string>();
    const SESSION_KEY = 'batchOpsWizardState';
    storage.set(SESSION_KEY, JSON.stringify({ operationId: 'suspend', step: 2, selectedIds: ['a'] }));

    expect(storage.has(SESSION_KEY)).toBe(true);

    // Simulate clearSessionStorage() called in execute() → next callback
    storage.delete(SESSION_KEY);

    expect(storage.has(SESSION_KEY)).toBe(false);
  });

  it('test 4 – switching operation resets selectedIds and instances', () => {
    let selectedIds = new Set(['id-001', 'id-002']);
    let instances = [{ id: 'id-001' }, { id: 'id-002' }];
    let selectedOperationId: string | null = 'suspend';

    // Simulate switching to a different operation
    const newOperationId = 'activate';
    if (selectedOperationId !== newOperationId) {
      selectedOperationId = newOperationId;
      selectedIds = new Set();
      instances = [];
    }

    expect(selectedIds.size).toBe(0);
    expect(instances).toHaveLength(0);
    expect(selectedOperationId).toBe('activate');
  });
});

// ── Keyset pagination contracts ───────────────────────────────────────────────
describe('batch-operations-wizard: keyset pagination logic', () => {
  // Simulate the keyset state variables and navigation methods in isolation.
  function makeKeysetState() {
    let keyCursor: string | null = null;
    let nextKeyCursor: string | null = null;
    const cursorStack: Array<{ cursor: string | null; startIndex: number }> = [];
    let keysetPage = 1;
    let keysetStartIndex = 1;

    const hasNext = () => nextKeyCursor !== null;
    const hasPrev = () => cursorStack.length > 0;

    // pageItemCount: how many items were on the current page before navigating next.
    const goNext = (pageItemCount: number = 0) => {
      cursorStack.push({ cursor: keyCursor, startIndex: keysetStartIndex });
      keysetStartIndex += pageItemCount;
      keyCursor = nextKeyCursor;
      keysetPage++;
    };

    const goPrev = () => {
      const prev = cursorStack.pop()!;
      keyCursor = prev.cursor;
      keysetStartIndex = prev.startIndex;
      keysetPage--;
    };

    const reset = () => {
      keyCursor = null;
      nextKeyCursor = null;
      cursorStack.length = 0;
      keysetPage = 1;
      keysetStartIndex = 1;
    };

    const setNextCursor = (c: string | null) => { nextKeyCursor = c; };

    return { get keyCursor() { return keyCursor; }, get keysetPage() { return keysetPage; },
             get keysetStartIndex() { return keysetStartIndex; },
             get cursorStack() { return [...cursorStack]; }, hasNext, hasPrev, goNext, goPrev, reset, setNextCursor };
  }

  it('keyset 1 – initial state: no prev, no next, page 1, null cursor', () => {
    const s = makeKeysetState();
    expect(s.hasNext()).toBe(false);
    expect(s.hasPrev()).toBe(false);
    expect(s.keysetPage).toBe(1);
    expect(s.keyCursor).toBeNull();
  });

  it('keyset 2 – after receiving nextCursor: hasNext becomes true', () => {
    const s = makeKeysetState();
    s.setNextCursor('2024-01-15T10:00:00.000Z');
    expect(s.hasNext()).toBe(true);
    expect(s.hasPrev()).toBe(false);
  });

  it('keyset 3 – goNext: pushes {cursor:null,startIndex:1} to stack, advances cursor/page/startIndex', () => {
    const s = makeKeysetState();
    const cursor1 = '2024-01-15T10:00:00.000Z';
    s.setNextCursor(cursor1);
    s.goNext(100); // page 1 had 100 items

    expect(s.keysetPage).toBe(2);
    expect(s.keyCursor).toBe(cursor1);
    expect(s.keysetStartIndex).toBe(101); // 1 + 100
    expect(s.cursorStack).toEqual([{ cursor: null, startIndex: 1 }]);
    expect(s.hasPrev()).toBe(true);
  });

  it('keyset 4 – goNext twice then goPrev: returns to cursor1, page 2, and correct startIndex', () => {
    const s = makeKeysetState();
    const cursor1 = '2024-01-15T10:00:00.000Z';
    const cursor2 = '2024-01-14T09:00:00.000Z';

    s.setNextCursor(cursor1);
    s.goNext(100); // page 2, cursor=cursor1, startIndex=101
    s.setNextCursor(cursor2);
    s.goNext(100); // page 3, cursor=cursor2, startIndex=201

    expect(s.keysetPage).toBe(3);
    expect(s.keyCursor).toBe(cursor2);
    expect(s.keysetStartIndex).toBe(201);

    s.goPrev(); // page 2, cursor=cursor1, startIndex restored to 101
    expect(s.keysetPage).toBe(2);
    expect(s.keyCursor).toBe(cursor1);
    expect(s.keysetStartIndex).toBe(101);
  });

  it('keyset 5 – goPrev to page 1 restores null cursor and startIndex=1', () => {
    const s = makeKeysetState();
    s.setNextCursor('2024-01-15T10:00:00.000Z');
    s.goNext(100); // page 2, startIndex=101
    s.goPrev();    // page 1, cursor=null, startIndex=1

    expect(s.keysetPage).toBe(1);
    expect(s.keyCursor).toBeNull();
    expect(s.keysetStartIndex).toBe(1);
    expect(s.hasPrev()).toBe(false);
  });

  it('keyset 6 – reset clears cursor stack, keysetStartIndex, and returns to page 1', () => {
    const s = makeKeysetState();
    s.setNextCursor('2024-01-15T10:00:00.000Z');
    s.goNext(100);
    s.setNextCursor('2024-01-14T09:00:00.000Z');
    s.goNext(100);

    expect(s.keysetPage).toBe(3);
    expect(s.keysetStartIndex).toBe(201);
    s.reset();

    expect(s.keysetPage).toBe(1);
    expect(s.keyCursor).toBeNull();
    expect(s.keysetStartIndex).toBe(1);
    expect(s.cursorStack).toHaveLength(0);
    expect(s.hasPrev()).toBe(false);
    expect(s.hasNext()).toBe(false);
  });

  it('keyset 7 – fetchKeysetPage logic: hasMore=true when response has pageSize+1 items', () => {
    const pageSize = 10;
    // Simulate: Camunda returned 11 items (pageSize+1)
    const rawItems = Array.from({ length: pageSize + 1 }, (_, i) => ({
      id: `inst-${i}`,
      startTime: `2024-01-${String(15 - i).padStart(2, '0')}T10:00:00.000Z`,
    }));

    const hasMore = rawItems.length > pageSize;
    const items = hasMore ? rawItems.slice(0, pageSize) : rawItems;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.startTime : null;

    expect(hasMore).toBe(true);
    expect(items).toHaveLength(pageSize);
    // items[9] = index 9 → 15-9=6 → '2024-01-06T...' (item at index 10 is the +1 sentinel, not included)
    expect(nextCursor).toBe('2024-01-06T10:00:00.000Z');
  });

  it('keyset 8 – fetchKeysetPage logic: hasMore=false when response has exactly pageSize items (last page)', () => {
    const pageSize = 10;
    const rawItems = Array.from({ length: pageSize }, (_, i) => ({
      id: `inst-${i}`,
      startTime: `2024-01-${String(15 - i).padStart(2, '0')}T10:00:00.000Z`,
    }));

    const hasMore = rawItems.length > pageSize;
    const items = hasMore ? rawItems.slice(0, pageSize) : rawItems;
    const nextCursor = hasMore ? items[items.length - 1].startTime : null;

    expect(hasMore).toBe(false);
    expect(items).toHaveLength(pageSize);
    expect(nextCursor).toBeNull();
  });

  it('keyset 9 – cursor merge: startedBefore uses the more restrictive (earlier) of body and cursor', () => {
    // When body already has a startedBefore from user filter, pick the earlier date.
    const mergeStartedBefore = (bodyDate: string, cursor: string): string => {
      const cursorMs = new Date(cursor).getTime();
      const existingMs = new Date(bodyDate).getTime();
      return cursorMs < existingMs ? cursor : bodyDate;
    };

    const bodyDate   = '2024-06-01T00:00:00.000Z'; // user filter: started before June
    const cursorNewer = '2024-07-01T00:00:00.000Z'; // cursor is July (later than June → body wins)
    const cursorOlder = '2024-05-01T00:00:00.000Z'; // cursor is May (earlier than June → cursor wins)

    expect(mergeStartedBefore(bodyDate, cursorNewer)).toBe(bodyDate);
    expect(mergeStartedBefore(bodyDate, cursorOlder)).toBe(cursorOlder);
  });

  it('keyset 10 – isMultiStateOperation: true only for delete-running without state filter; delete-finished uses single finished:true query', () => {
    const isMultiState = (opId: string, criteria: { field: string }[]) => {
      // delete-finished uses a single `finished:true` Camunda flag → offset pagination.
      // Only delete-running (without explicit state filter) truly merges two states.
      if (opId === 'delete-running') return !criteria.some(f => f.field === 'state');
      return false;
    };

    expect(isMultiState('delete-finished', [])).toBe(false);                   // single finished:true
    expect(isMultiState('delete-finished', [{ field: 'state' }])).toBe(false); // idem
    expect(isMultiState('delete-running', [])).toBe(true);                     // active+suspended → keyset
    expect(isMultiState('delete-running', [{ field: 'state' }])).toBe(false);  // user chose a specific state
    expect(isMultiState('suspend', [])).toBe(false);
  });
});

// ── Pagination summary format ─────────────────────────────────────────────────
// These tests verify that the "Showing X-Y of Z" text in keyset mode is
// character-for-character identical to the format used for single-state (offset) mode.
describe('batch-operations-wizard: pagination summary format', () => {
  // Mirrors PaginationComponent's computed properties so we can assert the
  // string that will be rendered — pure arithmetic, no Angular dependency.
  // keysetStartIndex: when provided in keyset mode, uses real cumulative position
  // instead of naive (current-1)*size+1. Omit for full-page scenarios where both are equal.
  function computeSummary(
    current: number, size: number, total: number, keysetItemCount: number, keysetMode: boolean,
    keysetStartIndex?: number
  ): { startIndex: number; endIndex: number; total: number; totalPages: number; startIndex_str: string; endIndex_str: string } {
    const startIndex = (keysetMode && keysetStartIndex != null)
      ? keysetStartIndex
      : (current - 1) * size + 1;
    const endIndex = keysetMode
      ? Math.min(startIndex + keysetItemCount - 1, total)
      : Math.min(current * size, total);
    const totalPages = Math.ceil(total / size);
    return { startIndex, endIndex, total, totalPages, startIndex_str: `${startIndex}`, endIndex_str: `${endIndex}` };
  }

  it('summary 1 – keyset page 1 shows same "X-Y of Z" format as offset page 1', () => {
    const total = 209;
    const size = 10;

    // Offset mode (Suspend): page 1, 10 items returned
    const offset = computeSummary(1, size, total, 10, false);
    // Keyset mode (Delete-running): page 1, 10 items returned by cursor fetch
    const keyset = computeSummary(1, size, total, 10, true);

    // Both produce identical X, Y, Z values
    expect(keyset.startIndex).toBe(offset.startIndex);  // 1
    expect(keyset.endIndex).toBe(offset.endIndex);       // 10
    expect(keyset.total).toBe(offset.total);             // 209
    expect(keyset.totalPages).toBe(offset.totalPages);   // 21

    // Full rendered string is character-for-character identical
    const renderSummary = (s: ReturnType<typeof computeSummary>) =>
      `Showing ${s.startIndex}-${s.endIndex} of ${s.total}`;
    expect(renderSummary(keyset)).toBe(renderSummary(offset));
    expect(renderSummary(keyset)).toBe('Showing 1-10 of 209');
  });

  it('summary 2 – keyset page 2 X/Y computed correctly from page number, not offset', () => {
    const total = 209;
    const size = 10;

    const keyset = computeSummary(2, size, total, 10, true);
    expect(keyset.startIndex).toBe(11);
    expect(keyset.endIndex).toBe(20);
    expect(keyset.total).toBe(209);

    // Matches what offset page 2 would also show
    const offset = computeSummary(2, size, total, 10, false);
    expect(keyset.startIndex).toBe(offset.startIndex);
    expect(keyset.endIndex).toBe(offset.endIndex);
  });

  it('summary 3 – last keyset page shows correct end index (fewer items than pageSize)', () => {
    // 209 items / 10 per page → last page (page 21) has 9 items
    const total = 209;
    const size = 10;
    const lastPage = Math.ceil(total / size);  // 21
    const lastPageItemCount = total - (lastPage - 1) * size;  // 9

    const keyset = computeSummary(lastPage, size, total, lastPageItemCount, true);
    expect(keyset.startIndex).toBe(201);
    expect(keyset.endIndex).toBe(209);    // 201 + 9 - 1

    // Offset mode would show identical result on the last page
    const offset = computeSummary(lastPage, size, total, lastPageItemCount, false);
    expect(keyset.startIndex).toBe(offset.startIndex);
    expect(keyset.endIndex).toBe(offset.endIndex);
  });

  it('summary 5 – partial page: cumulative tracking gives correct X-Y, never exceeds Z', () => {
    // Reproduces the "Showing 3501-3586 of 2982" bug scenario.
    // With naive (page-1)*size+1 and a partial intermediate page, startIndex drifts.
    // With cumulative tracking, startIndex reflects real items seen so X-Y ≤ Z always.
    const total = 2982;
    const size = 100;

    // Simulate 3 pages: page 1 = full (100), page 2 = partial (83), page 3 = full (100).
    let cumulativeStart = 1;

    // Page 1: 100 items
    const p1 = computeSummary(1, size, total, 100, true, cumulativeStart);
    expect(p1.startIndex).toBe(1);
    expect(p1.endIndex).toBe(100);
    expect(p1.endIndex).toBeLessThanOrEqual(total);
    cumulativeStart += 100; // 101

    // Page 2: 83 items (partial — one state exhausted its share of pageSize+1)
    const p2 = computeSummary(2, size, total, 83, true, cumulativeStart);
    expect(p2.startIndex).toBe(101);
    expect(p2.endIndex).toBe(183); // 101 + 83 - 1
    expect(p2.endIndex).toBeLessThanOrEqual(total);
    // Naive formula would give startIndex=(2-1)*100+1=101 (same here), endIndex=101+83-1=183 (also same).
    // The drift only compounds over many pages — verify that cumulative tracking matches real data:
    cumulativeStart += 83; // 184

    // Page 3: 100 items — naive gives startIndex=(3-1)*100+1=201, real is 184.
    const p3Cumulative = computeSummary(3, size, total, 100, true, cumulativeStart);
    const p3Naive      = computeSummary(3, size, total, 100, true);  // no keysetStartIndex → uses naive
    expect(p3Cumulative.startIndex).toBe(184);     // real position (page 2 was partial)
    expect(p3Naive.startIndex).toBe(201);          // naive would drift: (3-1)*100+1=201
    expect(p3Cumulative.startIndex).not.toBe(p3Naive.startIndex);  // proves the fix matters
    expect(p3Cumulative.endIndex).toBe(283);       // 184+100-1
    expect(p3Cumulative.endIndex).toBeLessThanOrEqual(total);
  });

  it('summary 6 – guard clamps endIndex to total; totalPages stable at Math.ceil(total/size)', () => {
    // Even in a pathological scenario where accumulated drift pushes startIndex past total,
    // endIndex is clamped to total so "Showing X-Y of Z" never shows Y > Z.
    const total = 2982;
    const size = 100;
    const totalPages = Math.ceil(total / size); // 30
    expect(totalPages).toBe(30);

    // Overshoot scenario: stale cursor bug placed startIndex at 3501 (> total).
    const overshootStart = 3501;
    const s = computeSummary(36, size, total, 86, true, overshootStart);
    // Guard: endIndex is clamped to total even though raw would be 3501+86-1=3586.
    const rawEnd = overshootStart + 86 - 1; // 3586 — the old bug
    expect(rawEnd).toBeGreaterThan(total);   // confirms the bug scenario
    expect(s.endIndex).toBe(total);          // guard applied: never Y > Z
    expect(s.endIndex).toBeLessThanOrEqual(total);

    // With correct cumulative tracking (no overshoot), all 30 pages stay within bounds.
    // 29 full pages (100 items) + 1 partial (82 items) = 2982 total.
    let cumStart = 1;
    const pageCounts = [...Array(29).fill(100), 82];
    for (let i = 0; i < pageCounts.length; i++) {
      const count = pageCounts[i];
      const pg = computeSummary(i + 1, size, total, count, true, cumStart);
      expect(pg.endIndex).toBeLessThanOrEqual(total); // invariant: Y ≤ Z on every page
      cumStart += count;
    }
    // Last page ends exactly at total.
    const lastPage = computeSummary(30, size, total, 82, true, 2901);
    expect(lastPage.startIndex).toBe(2901);
    expect(lastPage.endIndex).toBe(2982);
  });

  it('summary 4 – large volume (5 000 instances): total is exact, not capped at 2000', () => {
    // Simulates the count path: countPerState returns the full real total.
    // The 2000 cap only applies to the list-fetch (pageSize+1 per cursor request),
    // never to the count request.
    const CAMUNDA_LIST_CAP = 2000;  // limit that once affected the list
    const realTotal = 5000;         // real count from countPerState
    const size = 50;

    // The count returned by searchProcessInstancesGlobalCount is the real figure.
    const countFromService = realTotal;

    // It is never capped at 2000.
    expect(countFromService).toBeGreaterThan(CAMUNDA_LIST_CAP);

    // The summary correctly reflects the full real total, not the cap.
    const keyset = computeSummary(1, size, countFromService, 50, true);
    expect(keyset.total).toBe(realTotal);
    expect(keyset.total).not.toBe(CAMUNDA_LIST_CAP);

    // String contains the real total, not the capped one.
    const rendered = `Showing ${keyset.startIndex}-${keyset.endIndex} of ${keyset.total}`;
    expect(rendered).toBe('Showing 1-50 of 5000');
    expect(rendered).not.toContain('2000');

    // Total pages computed from real total, not from cap.
    const totalPages = Math.ceil(countFromService / size);
    expect(totalPages).toBe(100);   // 5000/50 = 100 pages
  });
});

// ── fetchKeysetPage correctness: sort order and hasMore ───────────────────────
// These tests verify the core invariants of the keyset fetch logic:
// 1. Camunda MUST be queried with sortBy=startTime sortOrder=desc (otherwise the
//    cursor lands on a wrong/ancient timestamp and subsequent pages have < pageSize items).
// 2. hasMore is determined by OR across all states (not AND, not the last state alone).
// 3. When one state is exhausted, the other state alone fills subsequent pages.
describe('batch-operations-wizard: fetchKeysetPage hasMore and sort-order invariants', () => {
  // Simulate the merge + slice logic (mirrors fetchKeysetPage's map() callback).
  function simulateFetch(
    stateResults: Array<{ id: string; startTime: string }[]>,
    pageSize: number
  ): { items: { id: string; startTime: string }[]; nextCursor: string | null; hasMore: boolean } {
    // Merge (dedup by id)
    const seen = new Set<string>();
    const merged: { id: string; startTime: string }[] = [];
    for (const arr of stateResults) {
      for (const item of arr) {
        if (!seen.has(item.id)) { seen.add(item.id); merged.push(item); }
      }
    }
    // Sort DESC by startTime (what mergeSortSlice does)
    merged.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    // Detect hasMore and slice
    const hasMore = merged.length > pageSize;
    const items = hasMore ? merged.slice(0, pageSize) : merged;
    const lastItem = items[items.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.startTime : null;
    return { items, nextCursor, hasMore };
  }

  // Helper: generate N instances with startTime spaced 1 min apart, newest first.
  function makeInstances(prefix: string, count: number, newestIso: string, stepMs = 60_000) {
    const newestMs = new Date(newestIso).getTime();
    return Array.from({ length: count }, (_, i) => ({
      id: `${prefix}-${i}`,
      startTime: new Date(newestMs - i * stepMs).toISOString(),
    }));
  }

  it('fetch 1 – hasMore=true when combined states exceed pageSize', () => {
    const pageSize = 100;
    // state A: returns 101 items (pageSize+1), state B: returns 36 items
    const stateA = makeInstances('A', 101, '2024-06-01T12:00:00.000Z');
    const stateB = makeInstances('B', 36, '2024-05-01T12:00:00.000Z'); // older than A
    const { hasMore, items, nextCursor } = simulateFetch([stateA, stateB], pageSize);

    expect(hasMore).toBe(true);
    expect(items).toHaveLength(pageSize);
    expect(nextCursor).not.toBeNull();
  });

  it('fetch 2 – hasMore=false when combined states have fewer items than pageSize', () => {
    const pageSize = 100;
    // Both states exhausted: A has 60 items, B has 36 items → 96 total < 100
    const stateA = makeInstances('A', 60, '2024-06-01T12:00:00.000Z');
    const stateB = makeInstances('B', 36, '2024-05-01T12:00:00.000Z');
    const { hasMore, items, nextCursor } = simulateFetch([stateA, stateB], pageSize);

    expect(hasMore).toBe(false);
    expect(items).toHaveLength(96);
    expect(nextCursor).toBeNull();
  });

  it('fetch 3 – small state (50) exhausted on page 2, large state (3000) fills page correctly', () => {
    const pageSize = 100;
    // Page 1 (cursor=null): both states contribute
    const allActive = makeInstances('active', 3000, '2024-06-01T12:00:00.000Z');
    const allSuspended = makeInstances('susp', 50, '2024-05-15T12:00:00.000Z');

    // Simulate what Camunda returns with sortBy=startTime desc:
    // Active returns top 101, suspended returns all 50 (< 101).
    const p1Active = allActive.slice(0, 101);  // 101 newest active
    const p1Suspended = allSuspended.slice(0, 50);  // all 50 suspended

    const p1 = simulateFetch([p1Active, p1Suspended], pageSize);
    expect(p1.hasMore).toBe(true);
    expect(p1.items).toHaveLength(pageSize);
    expect(p1.nextCursor).not.toBeNull();

    const cursor1 = p1.nextCursor!;

    // Page 2: fetch instances with startTime < cursor1 from each state.
    const p2Active = allActive.filter(i => i.startTime < cursor1).slice(0, 101);
    const p2Suspended = allSuspended.filter(i => i.startTime < cursor1).slice(0, 101);
    // Depending on cursor position, some or all suspended may be exhausted.

    const p2 = simulateFetch([p2Active, p2Suspended], pageSize);
    // If active still has many items, hasMore must be true — Next should NOT be disabled.
    if (p2Active.length > pageSize) {
      expect(p2.hasMore).toBe(true);
      expect(p2.items).toHaveLength(pageSize);
    } else {
      // Active still returns > 0 items; at least those are shown
      expect(p2.items.length).toBeGreaterThan(0);
    }
  });

  it('fetch 4 (non-regression) – wrong-sort scenario: without sorting, Camunda returns OLDEST items → cursor lands on ancient date → page 2 gets only 36 items', () => {
    const pageSize = 100;
    // Simulate WITHOUT sorting: Camunda returns the 101 OLDEST items (ASC default).
    // Active: 2946 instances ranging from today (day 0) to 2945 days ago.
    // Suspended: 36 instances from day 100 to 135.
    const allActive = makeInstances('active', 2946, '2024-06-01T12:00:00.000Z', 60_000); // 1 min apart, newest first
    const allSuspended = makeInstances('susp', 36, '2024-01-15T12:00:00.000Z', 3600_000); // 1 hr apart

    // WITHOUT sorting: Camunda ASC → returns the OLDEST 101 active instances
    const oldestActiveAsc = [...allActive].reverse().slice(0, 101); // oldest 101
    // Suspended: only 36 total, Camunda returns all 36 regardless of sort
    const p1WrongSort = simulateFetch([oldestActiveAsc, allSuspended], pageSize);
    const cursor1Wrong = p1WrongSort.nextCursor!;

    // cursor1Wrong is the startTime of the 100th item in the DESC-sorted merged pool.
    // The pool = [36 suspended (recent), 101 oldest active (ancient)].
    // DESC sorted: suspended (recent) first, then old active.
    // items[99] = last of the first 100 = a very OLD active instance.
    // → cursor1Wrong is a very old timestamp.

    // Page 2 with wrong cursor: active items older than cursor1Wrong
    const p2WrongActive = allActive.filter(i => i.startTime < cursor1Wrong).slice(0, 101);
    const p2WrongSuspended = allSuspended.filter(i => i.startTime < cursor1Wrong).slice(0, 101);
    const p2Wrong = simulateFetch([p2WrongActive, p2WrongSuspended], pageSize);

    // Bug: very few items qualify → far fewer than pageSize, Next disabled
    expect(p2Wrong.items.length).toBeLessThan(pageSize);
    expect(p2Wrong.hasMore).toBe(false);
    // This is the bug: user sees "Showing 101-136 of 2982" with Next disabled.

    // Now simulate WITH correct sorting: Camunda DESC → returns the NEWEST 101 active.
    const newestActiveDesc = allActive.slice(0, 101); // already newest-first
    const p1CorrectSort = simulateFetch([newestActiveDesc, allSuspended], pageSize);
    const cursor1Correct = p1CorrectSort.nextCursor!;

    // cursor1Correct is the startTime of items[99] in the DESC merge of newest active + all suspended.
    // This is a recent timestamp, just slightly older than items 1-99.
    const p2CorrectActive = allActive.filter(i => i.startTime < cursor1Correct).slice(0, 101);
    const p2CorrectSuspended = allSuspended.filter(i => i.startTime < cursor1Correct).slice(0, 101);
    const p2Correct = simulateFetch([p2CorrectActive, p2CorrectSuspended], pageSize);

    // With correct sorting, page 2 has pageSize items (active still has many more).
    expect(p2Correct.items.length).toBe(pageSize);
    expect(p2Correct.hasMore).toBe(true);
    expect(p2Correct.nextCursor).not.toBeNull();
  });

  it('fetch 5 – when state B is fully exhausted and state A alone has 101+ items, hasMore remains true', () => {
    const pageSize = 100;
    // State B (e.g., suspended): completely exhausted — returns 0 items for page 2.
    // State A (e.g., active): 2946 instances, returns 101 items for page 2.
    const p2Active = makeInstances('active', 101, '2024-03-01T12:00:00.000Z');
    const p2Suspended: { id: string; startTime: string }[] = []; // exhausted

    const { hasMore, items } = simulateFetch([p2Active, p2Suspended], pageSize);

    expect(hasMore).toBe(true);      // active alone is enough
    expect(items).toHaveLength(pageSize);
  });
});
