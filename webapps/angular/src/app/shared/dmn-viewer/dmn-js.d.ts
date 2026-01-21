declare module 'dmn-js/lib/Modeler' {
  interface DmnJSOptions {
    container?: HTMLElement;
    common?: {
      keyboard?: {
        bindTo?: Document | HTMLElement;
      };
    };
    drd?: {
      additionalModules?: any[];
    };
    decisionTable?: {
      additionalModules?: any[];
    };
    literalExpression?: {
      additionalModules?: any[];
    };
  }

  interface DmnView {
    element: {
      id: string;
      name?: string;
    };
    type: string;
  }

  interface ImportResult {
    warnings: string[];
  }

  class DmnJS {
    constructor(options?: DmnJSOptions);
    importXML(xml: string): Promise<ImportResult>;
    getActiveView(): DmnView | null;
    getViews(): DmnView[];
    open(view: DmnView): Promise<void>;
    getActiveViewer(): any;
    destroy(): void;
  }

  export default DmnJS;
}

declare module 'dmn-js/lib/Viewer' {
  interface DmnViewerOptions {
    container?: HTMLElement;
    common?: {
      keyboard?: {
        bindTo?: Document | HTMLElement;
      };
    };
    drd?: {
      additionalModules?: any[];
    };
    decisionTable?: {
      additionalModules?: any[];
    };
    literalExpression?: {
      additionalModules?: any[];
    };
  }

  interface DmnView {
    element: {
      id: string;
      name?: string;
    };
    type: string;
  }

  interface ImportResult {
    warnings: string[];
  }

  class DmnViewer {
    constructor(options?: DmnViewerOptions);
    importXML(xml: string): Promise<ImportResult>;
    getActiveView(): DmnView | null;
    getViews(): DmnView[];
    open(view: DmnView): Promise<void>;
    getActiveViewer(): any;
    destroy(): void;
  }

  export default DmnViewer;
}

declare module '@bpmn-io/dmn-migrate' {
  export function migrateDiagram(xml: string): Promise<string>;
}
