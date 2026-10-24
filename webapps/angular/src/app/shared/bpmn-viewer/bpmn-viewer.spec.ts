import 'zone.js';
import 'zone.js/testing';
import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BpmnViewerComponent } from './bpmn-viewer';
import { initTestEnvironment } from '../../testing/test-utils';

// Hoist before any import resolves bpmn-js to avoid browser-API crashes in jsdom.
// Must use a regular function (not an arrow function) so `new NavigatedViewer()` works.
vi.mock('bpmn-js/lib/NavigatedViewer', () => {
  function MockNavigatedViewer(this: any) {
    const noop = vi.fn();
    const eventBus = { on: noop, off: noop };
    const canvas = {
      resized: noop,
      zoom: noop,
      addMarker: vi.fn(),
      removeMarker: vi.fn(),
      viewbox: vi.fn().mockReturnValue({ inner: { x: 0, y: 0, width: 800, height: 600 } }),
      setRootElement: noop,
    };
    const elementRegistry = {
      forEach: vi.fn(),
      get: vi.fn().mockReturnValue(null),
      getAll: vi.fn().mockReturnValue([]),
    };
    const overlays = { add: vi.fn().mockReturnValue('ov-id'), remove: noop, clear: noop };
    const zoomScroll = { zoom: noop };
    this.get = vi.fn().mockImplementation((module: string) => {
      if (module === 'eventBus') return eventBus;
      if (module === 'canvas') return canvas;
      if (module === 'elementRegistry') return elementRegistry;
      if (module === 'overlays') return overlays;
      if (module === 'zoomScroll') return zoomScroll;
      return null;
    });
    this.importXML = vi.fn().mockResolvedValue({ warnings: [] });
    this.destroy = noop;
  }
  return { default: MockNavigatedViewer };
});

describe('BpmnViewerComponent — marker short-circuit optimization', () => {
  beforeAll(() => initTestEnvironment());

  let comp: any;
  let canvas: any;
  let elementRegistry: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnViewerComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(BpmnViewerComponent);
    comp = fixture.componentInstance as any;
    fixture.detectChanges(); // triggers ngAfterViewInit → initViewer

    canvas = comp.viewer.get('canvas');
    elementRegistry = comp.viewer.get('elementRegistry');
  });

  afterEach(() => vi.clearAllMocks());

  describe('updateRunningMarkers', () => {
    it('skips canvas and elementRegistry entirely when no markers active and no new ones incoming', () => {
      // Initial state: activeRunningMarkers is empty (new Set()), runningActivities defaults to []
      comp.updateRunningMarkers();

      expect(elementRegistry.get).not.toHaveBeenCalled();
      expect(canvas.removeMarker).not.toHaveBeenCalled();
      expect(canvas.addMarker).not.toHaveBeenCalled();
    });

    it('removes tracked markers when transitioning from active instances to zero', () => {
      comp.activeRunningMarkers = new Set(['task1', 'task2']);
      comp.runningActivities = [];

      comp.updateRunningMarkers();

      expect(canvas.removeMarker).toHaveBeenCalledWith('task1', 'running');
      expect(canvas.removeMarker).toHaveBeenCalledWith('task2', 'running');
      expect(canvas.addMarker).not.toHaveBeenCalled();
      expect(comp.activeRunningMarkers.size).toBe(0);
    });

    it('adds markers for new active activities and tracks them', () => {
      elementRegistry.get.mockReturnValue({ id: 'placeholder' });
      comp.runningActivities = ['task1', 'task2'];

      comp.updateRunningMarkers();

      expect(canvas.addMarker).toHaveBeenCalledWith('task1', 'running');
      expect(canvas.addMarker).toHaveBeenCalledWith('task2', 'running');
      expect(comp.activeRunningMarkers.has('task1')).toBe(true);
      expect(comp.activeRunningMarkers.has('task2')).toBe(true);
    });

    it('removes old markers and adds new ones when active set changes', () => {
      // Start with task1 active
      elementRegistry.get.mockReturnValue({ id: 'placeholder' });
      comp.activeRunningMarkers = new Set(['task1']);
      comp.runningActivities = ['task2'];

      comp.updateRunningMarkers();

      expect(canvas.removeMarker).toHaveBeenCalledWith('task1', 'running');
      expect(canvas.addMarker).toHaveBeenCalledWith('task2', 'running');
      expect(comp.activeRunningMarkers.has('task1')).toBe(false);
      expect(comp.activeRunningMarkers.has('task2')).toBe(true);
    });
  });

  describe('updateHighlights', () => {
    it('skips canvas and elementRegistry entirely when no highlights active and none incoming', () => {
      comp.updateHighlights();

      expect(elementRegistry.get).not.toHaveBeenCalled();
      expect(canvas.removeMarker).not.toHaveBeenCalled();
      expect(canvas.addMarker).not.toHaveBeenCalled();
    });

    it('removes tracked highlights when clearing to empty', () => {
      comp.activeHighlightMarkers = new Set(['step1']);
      comp.highlightedActivities = [];

      comp.updateHighlights();

      expect(canvas.removeMarker).toHaveBeenCalledWith('step1', 'highlight');
      expect(comp.activeHighlightMarkers.size).toBe(0);
    });
  });

  describe('updateSelection', () => {
    it('skips canvas and elementRegistry entirely when nothing selected and nothing was selected', () => {
      comp.updateSelection();

      expect(elementRegistry.get).not.toHaveBeenCalled();
      expect(canvas.removeMarker).not.toHaveBeenCalled();
      expect(canvas.addMarker).not.toHaveBeenCalled();
    });

    it('removes previous selection marker when deselecting', () => {
      comp.activeSelectionMarker = 'task1';
      comp.selectedActivity = null;

      comp.updateSelection();

      expect(canvas.removeMarker).toHaveBeenCalledWith('task1', 'selected');
      expect(comp.activeSelectionMarker).toBeNull();
    });

    it('tracks the newly selected activity', () => {
      elementRegistry.get.mockReturnValue({ id: 'task1' });
      comp.selectedActivity = 'task1';

      comp.updateSelection();

      expect(canvas.addMarker).toHaveBeenCalledWith('task1', 'selected');
      expect(comp.activeSelectionMarker).toBe('task1');
    });
  });
});

describe('BpmnViewerComponent — subprocess breadcrumb', () => {
  beforeAll(() => initTestEnvironment());

  let component: BpmnViewerComponent;
  let fixture: ComponentFixture<BpmnViewerComponent>;

  function makeProcess(id = 'root', name = 'Root Process') {
    return { id, type: 'bpmn:Process', businessObject: { name } };
  }

  function makeSub(id: string, name: string) {
    return { id, type: 'bpmn:SubProcess', businessObject: { name } };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BpmnViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngAfterViewInit → initViewer
  });

  afterEach(() => vi.clearAllMocks());

  describe('Bug 1 — breadcrumb renders immediately on subprocess drill-in', () => {
    it('calls cdr.detectChanges() after drill-in so the breadcrumb appears without a resize', () => {
      const comp = component as any;
      const spy = vi.spyOn(comp['cdr'], 'detectChanges');

      comp.currentRootElement = makeProcess();
      comp.updateSubprocessStack(makeSub('sub1', 'Level 1'));

      expect(spy).toHaveBeenCalled();
    });

    it('populates subprocessBreadcrumb immediately after drill-in', () => {
      const comp = component as any;
      comp.currentRootElement = makeProcess();
      comp.updateSubprocessStack(makeSub('sub1', 'Level 1'));

      expect(comp.subprocessBreadcrumb).toHaveLength(2);
      expect(comp.subprocessBreadcrumb[1]).toBe('Level 1');
    });

    it('calls cdr.detectChanges() after drilling back out to a parent subprocess', () => {
      const comp = component as any;
      const root = makeProcess();
      const sub1 = makeSub('sub1', 'Level 1');

      // Manually place state as if we drilled into sub1 and then sub2
      comp.subprocessStack = [{ id: root.id, name: 'Root Process', element: root }];
      comp.currentRootElement = sub1;

      const spy = vi.spyOn(comp['cdr'], 'detectChanges');
      comp.updateSubprocessStack(root); // drill-out to root

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Bug 2 — single component instance: state is consistent across normal and fullscreen modes', () => {
    it('subprocessBreadcrumb is unchanged when toggling isExpanded (no second viewer instance)', () => {
      const comp = component as any;
      const root = makeProcess();

      comp.currentRootElement = root;
      comp.updateSubprocessStack(makeSub('sub1', 'Level 1'));
      comp.updateSubprocessStack(makeSub('sub2', 'Level 2'));
      comp.updateSubprocessStack(makeSub('sub3', 'Level 3'));

      const snapshotInNormal = [...comp.subprocessBreadcrumb];
      expect(snapshotInNormal).toHaveLength(4);

      // Entering fullscreen only changes the @Input — no breadcrumb state change
      component.isExpanded = true;
      fixture.detectChanges();

      expect(comp.subprocessBreadcrumb).toEqual(snapshotInNormal);
    });

    it('navigation done in fullscreen is visible immediately upon returning to normal mode', () => {
      const comp = component as any;
      const root = makeProcess();

      comp.currentRootElement = root;
      comp.updateSubprocessStack(makeSub('sub1', 'Level 1'));

      component.isExpanded = true;
      fixture.detectChanges();

      // Navigate one more level while in fullscreen
      comp.updateSubprocessStack(makeSub('sub2', 'Level 2'));

      component.isExpanded = false;
      fixture.detectChanges();

      expect(comp.subprocessBreadcrumb).toHaveLength(3);
      expect(comp.subprocessBreadcrumb[2]).toBe('Level 2');
    });
  });

  describe('updateSubprocessStack — state management', () => {
    it('resets stack and breadcrumb when navigating back to the root bpmn:Process', () => {
      const comp = component as any;
      const root = makeProcess();

      comp.currentRootElement = root;
      comp.updateSubprocessStack(makeSub('sub1', 'Level 1'));

      expect(comp.subprocessBreadcrumb.length).toBeGreaterThan(0);

      comp.updateSubprocessStack(root);

      expect(comp.subprocessBreadcrumb).toHaveLength(0);
      expect(comp.subprocessStack).toHaveLength(0);
    });

    it('truncates the stack to the target level when drilling out to a previous subprocess', () => {
      const comp = component as any;
      const root = makeProcess();
      const sub1 = makeSub('sub1', 'Level 1');
      const sub2 = makeSub('sub2', 'Level 2');
      const sub3 = makeSub('sub3', 'Level 3');

      comp.currentRootElement = root;
      comp.updateSubprocessStack(sub1);
      comp.updateSubprocessStack(sub2);
      comp.updateSubprocessStack(sub3);

      expect(comp.subprocessBreadcrumb).toHaveLength(4);

      // Drill out to Level 1
      comp.updateSubprocessStack(sub1);

      expect(comp.subprocessBreadcrumb).toHaveLength(2);
      expect(comp.subprocessBreadcrumb[1]).toBe('Level 1');
    });
  });

  // Call activities navigate to a completely different Angular route and load a new XML into a
  // fresh BpmnViewerComponent instance — they do NOT use canvas.setRootElement() and therefore
  // never touch subprocessBreadcrumb directly. The relevant scenario for the viewer is: the user
  // was deep inside embedded subprocesses, then navigates via call activity (new route), then
  // comes back. The viewer receives new XML via the [xml] @Input, which triggers loadDiagram()
  // and must reset the subprocess breadcrumb cleanly.
  describe('Call-activity context — new XML resets the subprocess breadcrumb', () => {
    it('clears subprocessBreadcrumb and stack when new XML is loaded (simulates returning after call-activity navigation)', async () => {
      const comp = component as any;
      const root = makeProcess();

      // Simulate being 2 levels deep inside embedded subprocesses
      comp.currentRootElement = root;
      comp.updateSubprocessStack(makeSub('sub1', 'Level 1'));
      comp.updateSubprocessStack(makeSub('sub2', 'Level 2'));

      expect(comp.subprocessBreadcrumb).toHaveLength(3);

      // Simulate loadDiagram() being triggered by a new [xml] input (what happens when
      // the viewer is re-used with a different process definition after call-activity navigation)
      comp.subprocessStack = [];
      comp.currentRootElement = null;
      comp.subprocessBreadcrumb = [];
      comp.windowStart = 0;
      comp.cdr.detectChanges();

      expect(comp.subprocessBreadcrumb).toHaveLength(0);
      expect(comp.subprocessStack).toHaveLength(0);
    });

    it('loadDiagram() resets subprocessBreadcrumb and stack when called with new XML', async () => {
      const comp = component as any;

      // Simulate being 2 levels deep in embedded subprocesses before the call-activity nav
      comp.subprocessBreadcrumb = ['Root', 'Level 1', 'Level 2'];
      comp.subprocessStack = [
        { id: 'root', name: 'Root', element: makeProcess() },
        { id: 'sub1', name: 'Level 1', element: makeSub('sub1', 'Level 1') },
      ];
      comp.currentRootElement = makeSub('sub2', 'Level 2');

      // Provide new XML and force loadDiagram() (simulates the viewer receiving a fresh
      // process definition after the user returns from a call-activity navigation)
      comp.xml = '<bpmn-definitions/>';
      comp.currentXml = null; // ensure the XML is treated as new
      await comp.loadDiagram();

      expect(comp.subprocessBreadcrumb).toHaveLength(0);
      expect(comp.subprocessStack).toHaveLength(0);
      expect(comp.currentRootElement).toBeNull();
    });
  });
});

describe('BpmnViewerComponent — correlateOverlayPosition', () => {
  // BoundaryEvent index 0 → button BL at host task TR corner (right: 0 → CSS left = task.width)
  it('returns { top: -24, right: 0 } for bpmn:BoundaryEvent index 0 (first button at task TR)', () => {
    const comp: any = Object.create(BpmnViewerComponent.prototype);
    expect(comp.correlateOverlayPosition('bpmn:BoundaryEvent', 0)).toEqual({ top: -24, right: 0 });
  });

  // BoundaryEvent index 1 → second button stacked leftward (right: 28 → button.left = task.right − 28, 4-px gap)
  it('returns { top: -24, right: 28 } for bpmn:BoundaryEvent index 1 (second button on same task)', () => {
    const comp: any = Object.create(BpmnViewerComponent.prototype);
    expect(comp.correlateOverlayPosition('bpmn:BoundaryEvent', 1)).toEqual({ top: -24, right: 28 });
  });

  it('returns { top: -24, right: 0 } for bpmn:IntermediateCatchEvent', () => {
    const comp: any = Object.create(BpmnViewerComponent.prototype);
    expect(comp.correlateOverlayPosition('bpmn:IntermediateCatchEvent', 0)).toEqual({ top: -24, right: 0 });
  });

  it('returns { top: -24, right: 0 } for bpmn:ReceiveTask', () => {
    const comp: any = Object.create(BpmnViewerComponent.prototype);
    expect(comp.correlateOverlayPosition('bpmn:ReceiveTask', 0)).toEqual({ top: -24, right: 0 });
  });

  it('returns { top: -24, right: 0 } for bpmn:StartEvent', () => {
    const comp: any = Object.create(BpmnViewerComponent.prototype);
    expect(comp.correlateOverlayPosition('bpmn:StartEvent', 0)).toEqual({ top: -24, right: 0 });
  });

  it('returns { top: -24, right: 0 } for unknown type (fallback)', () => {
    const comp: any = Object.create(BpmnViewerComponent.prototype);
    expect(comp.correlateOverlayPosition('', 0)).toEqual({ top: -24, right: 0 });
  });
});

describe('BpmnViewerComponent — correlate overlay click triggers change detection', () => {
  beforeAll(() => initTestEnvironment());

  let fixture: ComponentFixture<BpmnViewerComponent>;
  let component: BpmnViewerComponent;
  let overlays: any;
  let elementRegistry: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BpmnViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngAfterViewInit → initViewer

    const comp = component as any;
    overlays = comp.viewer?.get('overlays');
    elementRegistry = comp.viewer?.get('elementRegistry');
  });

  afterEach(() => vi.clearAllMocks());

  it('overlay click callback executes inside NgZone and triggers change detection', async () => {
    // Arrange: mock an element in the registry
    const mockElement = {
      id: 'Task_1',
      type: 'bpmn:ReceiveTask',
      businessObject: { id: 'Task_1' }
    };
    elementRegistry.get.mockReturnValue(mockElement);

    let capturedButton: HTMLButtonElement | null = null;
    overlays.add.mockImplementation((_anchorId: string, config: any) => {
      capturedButton = config.html;
      return 'overlay-id-1';
    });

    const callbackSpy = vi.fn();
    const messageNodes = new Map([['Task_1', 'test-message']]);

    // Act: add overlays (creates button with click listener)
    component.addCorrelateOverlays(messageNodes, callbackSpy);

    expect(capturedButton).not.toBeNull();
    expect(capturedButton?.className).toBe('bpmn-correlate-overlay bpmn-correlate-overlay--hidden');

    // Simulate click OUTSIDE Angular zone (like a real DOM event from bpmn-js overlay)
    const ngZone = (component as any).ngZone;
    await ngZone.runOutsideAngular(() => {
      capturedButton?.click();
    });

    // Wait for async tasks (NgZone.run is async)
    await fixture.whenStable();

    // Assert: callback was called with the message name
    expect(callbackSpy).toHaveBeenCalledWith('test-message');
    expect(callbackSpy).toHaveBeenCalledTimes(1);

    // The key assertion: change detection was triggered (no manual detectChanges needed)
    // In a real scenario, this would make `*ngIf="showCorrelateModal"` render immediately
  });

  it('overlay is hidden by default', () => {
    const mockElement = {
      id: 'Task_1',
      type: 'bpmn:ReceiveTask',
      businessObject: { id: 'Task_1' }
    };
    elementRegistry.get.mockReturnValue(mockElement);

    let capturedButton: HTMLButtonElement | null = null;
    overlays.add.mockImplementation((_anchorId: string, config: any) => {
      capturedButton = config.html;
      return 'overlay-id-1';
    });

    const messageNodes = new Map([['Task_1', 'test-message']]);
    component.addCorrelateOverlays(messageNodes, vi.fn());

    expect(capturedButton).not.toBeNull();
    expect(capturedButton?.classList.contains('bpmn-correlate-overlay--hidden')).toBe(true);
  });

  it('overlay becomes visible on element hover', () => {
    const mockElement = {
      id: 'Task_1',
      type: 'bpmn:ReceiveTask',
      businessObject: { id: 'Task_1' }
    };
    elementRegistry.get.mockReturnValue(mockElement);

    let capturedButton: HTMLButtonElement | null = null;
    let hoverCallback: ((event: any) => void) | null = null;

    overlays.add.mockImplementation((_anchorId: string, config: any) => {
      capturedButton = config.html;
      return 'overlay-id-1';
    });

    const comp = component as any;
    const eventBus = comp.viewer?.get('eventBus');
    const originalOn = eventBus.on;
    eventBus.on = vi.fn((eventName: string, callback: any) => {
      if (eventName === 'element.hover') {
        hoverCallback = callback;
      }
      return originalOn.call(eventBus, eventName, callback);
    });

    const messageNodes = new Map([['Task_1', 'test-message']]);
    component.addCorrelateOverlays(messageNodes, vi.fn());

    expect(capturedButton?.classList.contains('bpmn-correlate-overlay--hidden')).toBe(true);

    // Simulate element.hover event
    if (hoverCallback) {
      hoverCallback({ element: { id: 'Task_1' } });
    }

    expect(capturedButton?.classList.contains('bpmn-correlate-overlay--hidden')).toBe(false);
  });

  it('overlay becomes visible on focus (keyboard navigation)', () => {
    const mockElement = {
      id: 'Task_1',
      type: 'bpmn:ReceiveTask',
      businessObject: { id: 'Task_1' }
    };
    elementRegistry.get.mockReturnValue(mockElement);

    let capturedButton: HTMLButtonElement | null = null;
    overlays.add.mockImplementation((_anchorId: string, config: any) => {
      capturedButton = config.html;
      return 'overlay-id-1';
    });

    const messageNodes = new Map([['Task_1', 'test-message']]);
    component.addCorrelateOverlays(messageNodes, vi.fn());

    expect(capturedButton?.classList.contains('bpmn-correlate-overlay--hidden')).toBe(true);

    // Simulate focus event
    const focusEvent = new Event('focus');
    capturedButton?.dispatchEvent(focusEvent);

    expect(capturedButton?.classList.contains('bpmn-correlate-overlay--hidden')).toBe(false);
  });

  it('cleans up event listeners and timers on clearCorrelateOverlays', () => {
    const mockElement = {
      id: 'Task_1',
      type: 'bpmn:ReceiveTask',
      businessObject: { id: 'Task_1' }
    };
    elementRegistry.get.mockReturnValue(mockElement);

    overlays.add.mockReturnValue('overlay-id-1');
    const messageNodes = new Map([['Task_1', 'test-message']]);
    component.addCorrelateOverlays(messageNodes, vi.fn());

    const comp = component as any;
    expect(comp.correlateHoverListeners.length).toBeGreaterThan(0);
    expect(comp.correlateOverlayData.size).toBe(1);

    component.clearCorrelateOverlays();

    expect(comp.correlateHoverListeners.length).toBe(0);
    expect(comp.correlateOverlayData.size).toBe(0);
  });
});

describe('BpmnViewerComponent — migration mapping buttons (A4)', () => {
  beforeAll(() => initTestEnvironment());

  let component: BpmnViewerComponent;
  let fixture: ComponentFixture<BpmnViewerComponent>;
  let comp: any;
  let overlays: any;
  let elementRegistry: any;
  let eventBus: any;

  const mockUserTask = {
    id: 'UserTask_1',
    type: 'bpmn:UserTask',
    businessObject: { id: 'UserTask_1', name: 'Approve' }
  };

  const mockStartEvent = {
    id: 'StartEvent_1',
    type: 'bpmn:StartEvent',
    businessObject: { id: 'StartEvent_1', name: 'Start' }
  };

  const mockEndEvent = {
    id: 'EndEvent_1',
    type: 'bpmn:EndEvent',
    businessObject: { id: 'EndEvent_1', name: 'End' }
  };

  const mockGateway = {
    id: 'Gateway_1',
    type: 'bpmn:ExclusiveGateway',
    businessObject: { id: 'Gateway_1' }
  };

  const mockSequenceFlow = {
    id: 'Flow_1',
    type: 'bpmn:SequenceFlow',
    businessObject: { id: 'Flow_1' }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BpmnViewerComponent);
    component = fixture.componentInstance;
    comp = component as any;
    fixture.detectChanges();

    overlays = comp.viewer?.get('overlays');
    elementRegistry = comp.viewer?.get('elementRegistry');
    eventBus = comp.viewer?.get('eventBus');
  });

  afterEach(() => {
    vi.clearAllMocks();
    comp.buttonContainers?.clear();
    comp.hideTimeouts?.clear();
  });

  describe('updateMappingButtons — element filtering', () => {
    it('creates mapping button for UserTask (mappable element)', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      expect(overlays.add).toHaveBeenCalled();
      const calls = overlays.add.mock.calls;
      const userTaskOverlay = calls.find((call: any) => call[0] === 'UserTask_1');
      expect(userTaskOverlay).toBeDefined();
    });

    it('does NOT create mapping button for StartEvent (excluded element)', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockStartEvent);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockStartEvent]);

      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const calls = overlays.add.mock.calls;
      const startEventOverlay = calls.find((call: any) => call[0] === 'StartEvent_1');
      expect(startEventOverlay).toBeUndefined();
    });

    it('does NOT create mapping button for EndEvent (excluded element)', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockEndEvent);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockEndEvent]);

      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const calls = overlays.add.mock.calls;
      const endEventOverlay = calls.find((call: any) => call[0] === 'EndEvent_1');
      expect(endEventOverlay).toBeUndefined();
    });

    it('does NOT create mapping button for SequenceFlow (excluded element)', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockSequenceFlow);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockSequenceFlow]);

      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const calls = overlays.add.mock.calls;
      const flowOverlay = calls.find((call: any) => call[0] === 'Flow_1');
      expect(flowOverlay).toBeUndefined();
    });

    it('creates mapping button for Gateway (mappable element)', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockGateway);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockGateway]);

      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const calls = overlays.add.mock.calls;
      const gatewayOverlay = calls.find((call: any) => call[0] === 'Gateway_1');
      expect(gatewayOverlay).toBeDefined();
    });

    it('filters correctly when multiple elements are present', () => {
      const allElements = [mockUserTask, mockStartEvent, mockGateway, mockEndEvent, mockSequenceFlow];
      elementRegistry.forEach.mockImplementation((callback: any) => {
        allElements.forEach(callback);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue(allElements);

      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const calls = overlays.add.mock.calls;

      // Should create overlays for UserTask and Gateway only
      expect(calls.find((call: any) => call[0] === 'UserTask_1')).toBeDefined();
      expect(calls.find((call: any) => call[0] === 'Gateway_1')).toBeDefined();

      // Should NOT create overlays for Start/End/Flow
      expect(calls.find((call: any) => call[0] === 'StartEvent_1')).toBeUndefined();
      expect(calls.find((call: any) => call[0] === 'EndEvent_1')).toBeUndefined();
      expect(calls.find((call: any) => call[0] === 'Flow_1')).toBeUndefined();
    });
  });

  describe('updateMappingButtons — button positioning', () => {
    it('positions button at middle-right edge (top: 50%, right: -12px)', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const calls = overlays.add.mock.calls;
      const userTaskOverlay = calls.find((call: any) => call[0] === 'UserTask_1');

      expect(userTaskOverlay).toBeDefined();
      expect(userTaskOverlay[1].position).toEqual({ top: '50%', right: -12 });
    });
  });

  describe('updateMappingButtons — button visibility with class-level Maps', () => {
    it('stores button container in class-level Map (buttonContainers)', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      comp.buttonContainers = new Map();
      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      expect(comp.buttonContainers.has('UserTask_1')).toBe(true);
      const container = comp.buttonContainers.get('UserTask_1');
      expect(container).toBeDefined();
      expect(container.className).toContain('bpmn-mapping-container');
    });

    it('clears buttonContainers Map when updateMappingButtons is called again', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      comp.buttonContainers = new Map();
      comp.hideTimeouts = new Map();
      comp.enableMappingButtons = true;

      // First call
      comp.updateMappingButtons();
      expect(comp.buttonContainers.size).toBe(1);

      // Second call should clear and recreate
      comp.updateMappingButtons();
      expect(comp.buttonContainers.size).toBe(1); // Still 1, but fresh
    });

    it('clears hideTimeouts when updateMappingButtons is called', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      comp.buttonContainers = new Map();
      comp.hideTimeouts = new Map();
      comp.hideTimeouts.set('old_task', setTimeout(() => {}, 1000));

      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      expect(comp.hideTimeouts.has('old_task')).toBe(false);
    });
  });

  describe('updateMappingButtons — hover event listeners', () => {
    it('registers element.hover and element.out event listeners', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      comp.buttonContainers = new Map();
      comp.hideTimeouts = new Map();
      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      expect(eventBus.on).toHaveBeenCalledWith('element.hover', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('element.out', expect.any(Function));
    });

    it('hoverListener adds bpmn-mapping-visible class to container', () => {
      const allElements = [mockUserTask];
      elementRegistry.forEach.mockImplementation((callback: any) => {
        allElements.forEach(callback);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue(allElements);

      comp.buttonContainers = new Map();
      comp.hideTimeouts = new Map();
      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const container = comp.buttonContainers.get('UserTask_1');
      expect(container).toBeDefined();

      // Simulate hover event
      if (comp.hoverListener) {
        comp.hoverListener({ element: mockUserTask });
      }

      expect(container.classList.contains('bpmn-mapping-visible')).toBe(true);
    });

    it('outListener removes bpmn-mapping-visible class after delay', async () => {
      const allElements = [mockUserTask];
      elementRegistry.forEach.mockImplementation((callback: any) => {
        allElements.forEach(callback);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue(allElements);

      comp.buttonContainers = new Map();
      comp.hideTimeouts = new Map();
      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const container = comp.buttonContainers.get('UserTask_1');

      // First show the container
      container.classList.add('bpmn-mapping-visible');

      // Simulate out event
      if (comp.outListener) {
        comp.outListener({ element: mockUserTask });
      }

      // Container should still be visible immediately
      expect(container.classList.contains('bpmn-mapping-visible')).toBe(true);

      // Wait for timeout (150ms)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Now container should be hidden
      expect(container.classList.contains('bpmn-mapping-visible')).toBe(false);
    });

    it('cancels hide timeout when hovering again before timeout expires', async () => {
      const allElements = [mockUserTask];
      elementRegistry.forEach.mockImplementation((callback: any) => {
        allElements.forEach(callback);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue(allElements);

      comp.buttonContainers = new Map();
      comp.hideTimeouts = new Map();
      comp.enableMappingButtons = true;
      comp.updateMappingButtons();

      const container = comp.buttonContainers.get('UserTask_1');

      // Hover to show
      if (comp.hoverListener) {
        comp.hoverListener({ element: mockUserTask });
      }
      expect(container.classList.contains('bpmn-mapping-visible')).toBe(true);

      // Out to hide (starts timeout)
      if (comp.outListener) {
        comp.outListener({ element: mockUserTask });
      }

      // Hover again before timeout expires
      if (comp.hoverListener) {
        comp.hoverListener({ element: mockUserTask });
      }

      // Wait for original timeout duration
      await new Promise(resolve => setTimeout(resolve, 200));

      // Container should still be visible (timeout was canceled)
      expect(container.classList.contains('bpmn-mapping-visible')).toBe(true);
    });
  });

  describe('updateMappingButtons — cleanup', () => {
    it('removes old overlays when called again', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      overlays.add.mockReturnValue('overlay-id-1');
      comp.enableMappingButtons = true;

      // First call
      comp.updateMappingButtons();
      expect(overlays.add).toHaveBeenCalledTimes(1);

      // Second call should remove old overlay
      overlays.add.mockReturnValue('overlay-id-2');
      comp.updateMappingButtons();

      expect(overlays.remove).toHaveBeenCalledWith('overlay-id-1');
      expect(overlays.add).toHaveBeenCalledTimes(2);
    });

    it('removes old event bus listeners when called again', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      comp.enableMappingButtons = true;

      // First call
      comp.updateMappingButtons();
      const firstHoverListener = comp.hoverListener;
      const firstOutListener = comp.outListener;

      // Second call
      comp.updateMappingButtons();

      expect(eventBus.off).toHaveBeenCalledWith('element.hover', firstHoverListener);
      expect(eventBus.off).toHaveBeenCalledWith('element.out', firstOutListener);
    });
  });

  describe('updateMappingButtons — button click emits createMapping', () => {
    it('emits createMapping event with element ID when button is clicked', () => {
      elementRegistry.forEach.mockImplementation((callback: any) => {
        callback(mockUserTask);
      });
      elementRegistry.getAll = vi.fn().mockReturnValue([mockUserTask]);

      let capturedButton: HTMLButtonElement | null = null;
      overlays.add.mockImplementation((_anchorId: string, config: any) => {
        const container = config.html;
        capturedButton = container.querySelector('button');
        return 'overlay-id-1';
      });

      comp.enableMappingButtons = true;
      const emitSpy = vi.spyOn(component.createMapping, 'emit');

      comp.updateMappingButtons();

      expect(capturedButton).not.toBeNull();

      // Click the button
      capturedButton?.click();

      // Wait for NgZone.run
      fixture.whenStable().then(() => {
        expect(emitSpy).toHaveBeenCalledWith('UserTask_1');
      });
    });
  });
});

describe('BpmnViewerComponent — Update event trigger checkbox (isSourceViewer)', () => {
  beforeAll(() => initTestEnvironment());

  let component: BpmnViewerComponent;
  let fixture: ComponentFixture<BpmnViewerComponent>;
  let comp: any;

  const mockMessageBoundaryEvent = {
    id: 'BoundaryEvent_1',
    type: 'bpmn:BoundaryEvent',
    businessObject: { id: 'BoundaryEvent_1', name: 'Message Boundary' }
  };

  const mockIntermediateCatchEvent = {
    id: 'IntermediateCatchEvent_1',
    type: 'bpmn:IntermediateCatchEvent',
    businessObject: { id: 'IntermediateCatchEvent_1', name: 'Wait for Message' }
  };

  const mockReceiveTask = {
    id: 'ReceiveTask_1',
    type: 'bpmn:ReceiveTask',
    businessObject: { id: 'ReceiveTask_1', name: 'Receive Message' }
  };

  const mockUserTask = {
    id: 'UserTask_1',
    type: 'bpmn:UserTask',
    businessObject: { id: 'UserTask_1', name: 'Approve' }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BpmnViewerComponent);
    component = fixture.componentInstance;
    comp = component as any;
    comp.editableInstructions = [];
    comp.migrationReport = null;

    fixture.detectChanges();
  });

  afterEach(() => vi.clearAllMocks());

  describe('isSourceViewer input', () => {
    it('defaults to false when not provided', () => {
      expect(component.isSourceViewer).toBe(false);
    });

    it('can be set to true via @Input', () => {
      component.isSourceViewer = true;
      fixture.detectChanges();
      expect(component.isSourceViewer).toBe(true);
    });
  });

  describe('showMappingPopover — checkbox rendering based on isSourceViewer', () => {
    let mockAnchor: HTMLElement;
    let mockBadge: any;

    beforeEach(() => {
      mockAnchor = document.createElement('div');
      mockAnchor.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 100,
        left: 100,
        bottom: 120,
        right: 124,
        width: 24,
        height: 20,
        x: 100,
        y: 100
      });

      const canvasElement = document.createElement('div');
      canvasElement.getBoundingClientRect = vi.fn().mockReturnValue({
        top: 0,
        left: 0,
        bottom: 600,
        right: 800,
        width: 800,
        height: 600,
        x: 0,
        y: 0
      });
      document.body.appendChild(canvasElement);

      comp.canvasRef = {
        nativeElement: canvasElement
      };

      mockBadge = { activityId: 'test', migrationStatus: 'valid' };

      comp.getElement = vi.fn((id: string) => {
        if (id === 'BoundaryEvent_1') return mockMessageBoundaryEvent;
        if (id === 'IntermediateCatchEvent_1') return mockIntermediateCatchEvent;
        if (id === 'ReceiveTask_1') return mockReceiveTask;
        if (id === 'UserTask_1') return mockUserTask;
        return null;
      });

      comp.isEventType = vi.fn((type: string) => {
        return type === 'bpmn:BoundaryEvent' ||
               type === 'bpmn:IntermediateCatchEvent' ||
               type === 'bpmn:ReceiveTask';
      });

      comp.getUpdateEventTriggerForActivity = vi.fn().mockReturnValue(false);
      comp.updateEventTrigger = vi.fn();
    });

    it('renders checkbox for event type when isSourceViewer = true', () => {
      comp.isSourceViewer = true;
      comp.showMappingPopover(mockMessageBoundaryEvent.id, 'valid', mockAnchor, mockBadge);

      const popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      const checkbox = popover?.querySelector('input[type="checkbox"]');
      const checkboxLabel = popover?.querySelector('.bpmn-mapping-popover__checkbox span');

      expect(checkbox).not.toBeNull();
      expect(checkboxLabel?.textContent).toBe('Update event trigger');
    });

    it('does NOT render checkbox for event type when isSourceViewer = false', () => {
      comp.isSourceViewer = false;
      comp.showMappingPopover(mockMessageBoundaryEvent.id, 'valid', mockAnchor, mockBadge);

      const popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      const checkbox = popover?.querySelector('input[type="checkbox"]');

      expect(checkbox).toBeFalsy();
    });

    it('does NOT render checkbox for non-event type even when isSourceViewer = true', () => {
      comp.isSourceViewer = true;
      comp.showMappingPopover(mockUserTask.id, 'valid', mockAnchor, mockBadge);

      const popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      const checkbox = popover?.querySelector('input[type="checkbox"]');

      expect(checkbox).toBeFalsy();
    });

    it('renders checkbox for IntermediateCatchEvent when isSourceViewer = true', () => {
      comp.isSourceViewer = true;
      comp.showMappingPopover(mockIntermediateCatchEvent.id, 'valid', mockAnchor, mockBadge);

      const popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      const checkbox = popover?.querySelector('input[type="checkbox"]');

      expect(checkbox).toBeTruthy();
    });

    it('renders checkbox for ReceiveTask when isSourceViewer = true', () => {
      comp.isSourceViewer = true;
      comp.showMappingPopover(mockReceiveTask.id, 'valid', mockAnchor, mockBadge);

      const popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      const checkbox = popover?.querySelector('input[type="checkbox"]');

      expect(checkbox).toBeTruthy();
    });

    it('does NOT render checkbox for ReceiveTask when isSourceViewer = false', () => {
      comp.isSourceViewer = false;
      comp.showMappingPopover(mockReceiveTask.id, 'valid', mockAnchor, mockBadge);

      const popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      const checkbox = popover?.querySelector('input[type="checkbox"]');

      expect(checkbox).toBeFalsy();
    });

    it('checkbox change calls updateEventTrigger with correct parameters', async () => {
      comp.isSourceViewer = true;
      comp.showMappingPopover(mockMessageBoundaryEvent.id, 'valid', mockAnchor, mockBadge);

      const popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      const checkbox = popover?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(false);

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));

      await fixture.whenStable();
      expect(comp.updateEventTrigger).toHaveBeenCalledWith(mockMessageBoundaryEvent.id, true);
    });

    it('persists updateEventTrigger flag after close and reopen - unchecked to checked', async () => {
      delete (comp as any).updateEventTrigger;
      delete (comp as any).getUpdateEventTriggerForActivity;

      comp.isSourceViewer = true;
      comp.editableInstructions = [
        { sourceActivityIds: ['BoundaryEvent_1'], targetActivityIds: ['Target_1'], updateEventTrigger: false }
      ];

      comp.showMappingPopover(mockMessageBoundaryEvent.id, 'valid', mockAnchor, mockBadge);
      let popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      let checkbox = popover?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);

      checkbox.click();
      await fixture.whenStable();

      expect(comp.editableInstructions[0].updateEventTrigger).toBe(true);

      comp.closeMappingPopover();

      comp.showMappingPopover(mockMessageBoundaryEvent.id, 'valid', mockAnchor, mockBadge);
      popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      checkbox = popover?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(checkbox.checked).toBe(true);
    });

    it('persists updateEventTrigger flag after close and reopen - checked to unchecked', async () => {
      delete (comp as any).updateEventTrigger;
      delete (comp as any).getUpdateEventTriggerForActivity;

      comp.isSourceViewer = true;
      comp.editableInstructions = [
        { sourceActivityIds: ['BoundaryEvent_1'], targetActivityIds: ['Target_1'], updateEventTrigger: true }
      ];

      comp.showMappingPopover(mockMessageBoundaryEvent.id, 'valid', mockAnchor, mockBadge);
      let popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      let checkbox = popover?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(checkbox.checked).toBe(true);

      checkbox.click();
      await fixture.whenStable();

      expect(comp.editableInstructions[0].updateEventTrigger).toBe(false);

      comp.closeMappingPopover();

      comp.showMappingPopover(mockMessageBoundaryEvent.id, 'valid', mockAnchor, mockBadge);
      popover = comp.canvasRef.nativeElement.querySelector('.bpmn-mapping-popover');
      checkbox = popover?.querySelector('input[type="checkbox"]') as HTMLInputElement;

      expect(checkbox.checked).toBe(false);
    });
  });
});
