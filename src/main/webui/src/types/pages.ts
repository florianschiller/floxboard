export interface PageViewport {
  origin: [number, number];
  scale: number;
}

export interface DgmPageMetadata {
  id: string;
  name: string;
  order: number;
  shapeCount?: number;
  viewport?: PageViewport;
  customData?: Record<string, any>;
}

export interface DgmPageNode {
  _type?: string;
  type?: string;
  id: string;
  name?: string;
  pageOrigin?: [number, number];
  pageScale?: number;
  origin?: [number, number];
  scale?: number;
  children?: any[];
  customData?: Record<string, any>;
  [key: string]: any;
}

export interface DgmDocumentPayload {
  _type?: 'Doc' | 'Obj' | string;
  type?: 'Doc' | 'Obj' | string;
  id?: string;
  version?: number;
  activePageId?: string;
  children: DgmPageNode[];
  customData?: Record<string, any>;
  [key: string]: any;
}

export interface ShapePageLink {
  linkToPageId?: string;
  linkToShapeId?: string;
  linkLabel?: string;
}
