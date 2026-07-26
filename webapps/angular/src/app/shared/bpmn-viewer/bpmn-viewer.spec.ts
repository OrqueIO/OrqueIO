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
      viewbox: vi.fn().mockReturnValue({ inner: { x: 0, y: 0, width: 800, height: 600 } }),
      setRootElement: noop,
    };
    const overlays = { add: vi.fn().mockReturnValue('ov-id'), remove: noop, clear: noop };
    const zoomScroll = { zoom: noop };
    this.get = vi.fn().mockImplementation((module: string) => {
      if (module === 'eventBus') return eventBus;
      if (module === 'canvas') return canvas;
      if (module === 'overlays') return overlays;
      if (module === 'zoomScroll') return zoomScroll;
      return null;
    });
    this.importXML = vi.fn().mockResolvedValue({ warnings: [] });
    this.destroy = noop;
  }
  return { default: MockNavigatedViewer };
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
