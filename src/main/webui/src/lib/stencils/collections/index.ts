import { StencilCollection } from '@/types/shapeLibrary';
import { agileCollection } from './agileCollection';
import { cloudCollection } from './cloudCollection';
import { umlCollection } from './umlCollection';
import { uiCollection } from './uiCollection';
import { flowchartCollection } from './flowchartCollection';

export * from './agileCollection';
export * from './cloudCollection';
export * from './umlCollection';
export * from './uiCollection';
export * from './flowchartCollection';

export const PREBUILT_STENCIL_COLLECTIONS: StencilCollection[] = [
  agileCollection,
  cloudCollection,
  umlCollection,
  uiCollection,
  flowchartCollection,
];
