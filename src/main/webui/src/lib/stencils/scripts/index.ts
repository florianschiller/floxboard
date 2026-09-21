import * as umlScripts from './umlScripts';
import * as cloudScripts from './cloudScripts';
import * as agileScripts from './agileScripts';
import * as uiScripts from './uiScripts';
import * as bpmnScripts from './bpmnScripts';

export * from './umlScripts';
export * from './cloudScripts';
export * from './agileScripts';
export * from './uiScripts';
export * from './bpmnScripts';

export const DRAW_SCRIPTS = {
  umlClassBox: umlScripts.umlClassBox,
  databaseCylinder: cloudScripts.databaseCylinder,
  cloudBoundary: cloudScripts.cloudBoundary,
  serverBladeRack: cloudScripts.serverBladeRack,
  agileStoryCard: agileScripts.agileStoryCard,
  agileMoodMeter: agileScripts.agileMoodMeter,
  uiToggleSwitch: uiScripts.uiToggleSwitch,
  uiProgressBar: uiScripts.uiProgressBar,
  uiSearchBar: uiScripts.uiSearchBar,
  bpmnGateway: bpmnScripts.bpmnGateway,
  bpmnEvent: bpmnScripts.bpmnEvent,
};
