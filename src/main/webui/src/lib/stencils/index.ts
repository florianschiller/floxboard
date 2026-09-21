import { StencilCollection, StencilItem } from '@/types/shapeLibrary';
import { DRAW_SCRIPTS } from './scripts';
import { PREBUILT_STENCIL_COLLECTIONS } from './collections';

export * from './scripts';
export * from './collections';

export function getPrebuiltCollections(): StencilCollection[] {
  return PREBUILT_STENCIL_COLLECTIONS;
}

export function getAllPrebuiltStencils(): StencilItem[] {
  return PREBUILT_STENCIL_COLLECTIONS.flatMap((col) => col.stencils);
}
