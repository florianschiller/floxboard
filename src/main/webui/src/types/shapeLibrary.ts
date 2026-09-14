export enum StencilCategory {
  CLOUD_ARCHITECTURE = 'CLOUD_ARCHITECTURE',
  SOFTWARE_DESIGN_UML = 'SOFTWARE_DESIGN_UML',
  UI_WIREFRAMING = 'UI_WIREFRAMING',
  FLOWCHART_BPMN = 'FLOWCHART_BPMN',
  AGILE_SPRINT = 'AGILE_SPRINT',
  GENERAL = 'GENERAL',
}

export enum StencilPermission {
  READ = 'READ',
  CONTRIBUTE = 'CONTRIBUTE',
  ADMIN = 'ADMIN',
}

export interface StencilItem {
  id: string;
  name: string;
  category: StencilCategory;
  description?: string;
  shapes: any[];
  thumbnailSvg?: string;
  width?: number;
  height?: number;
  createdBy?: string;
  createdAt?: string;
}

export interface ScriptedShapeDefinition {
  type: 'Custom' | 'Rectangle' | 'Ellipse' | 'Frame' | 'Connector' | 'Text' | string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  script?: string | ((ctx: CanvasRenderingContext2D, shape: any, helper?: any) => void);
  properties?: Record<string, any>;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  text?: any;
  fontColor?: string;
  fontSize?: number;
  fontFamily?: string;
  customData?: Record<string, any>;
  [key: string]: any;
}

export interface StencilCollection {
  id: string;
  name: string;
  description?: string;
  categories: StencilCategory[];
  isPrebuilt?: boolean;
  permission?: StencilPermission;
  organizationId?: string;
  userId?: string;
  stencils: StencilItem[];
}

export interface CreateShapeLibraryRequest {
  name: string;
  description?: string;
  organizationId?: string;
  categories?: StencilCategory[];
  defaultRole?: StencilPermission;
}

export interface UpdateShapeLibraryRequest {
  name?: string;
  description?: string;
  categories?: StencilCategory[];
  defaultRole?: StencilPermission;
}

export interface CreateShapeStencilRequest {
  name: string;
  category?: StencilCategory;
  description?: string;
  shapesJson: string;
  thumbnailSvg?: string;
}

export interface ShapeLibraryDto {
  id: string;
  name: string;
  description?: string;
  userId: string;
  organizationId?: string;
  categories: StencilCategory[];
  defaultRole: StencilPermission;
  createdAt: string;
  updatedAt?: string;
  permission: StencilPermission;
  stencilCount?: number;
}

export interface ShapeStencilDto {
  id: string;
  libraryId: string;
  name: string;
  category: StencilCategory;
  description?: string;
  shapesJson: string;
  thumbnailSvg?: string;
  createdBy: string;
  createdAt: string;
}

export interface ShapeLibraryDetailDto {
  id: string;
  name: string;
  description?: string;
  userId: string;
  organizationId?: string;
  categories: StencilCategory[];
  defaultRole: StencilPermission;
  createdAt: string;
  updatedAt?: string;
  permission: StencilPermission;
  stencils: ShapeStencilDto[];
}
