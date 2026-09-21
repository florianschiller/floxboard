import { StencilCategory, StencilCollection } from '@/types/shapeLibrary';
import { DRAW_SCRIPTS } from '../scripts';

export const flowchartCollection: StencilCollection = {
  id: 'prebuilt-flowchart-bpmn',
  name: 'Flowcharts & BPMN',
  description: 'Process blocks, decision diamonds, start/end terminals, and BPMN gateways',
  categories: [StencilCategory.FLOWCHART_BPMN],
  isPrebuilt: true,
  stencils: [
    {
      id: 'flowchart-bpmn-gateway-set',
      name: 'BPMN Gateway & Events',
      category: StencilCategory.FLOWCHART_BPMN,
      description: 'Scripted BPMN Decision Gateway and Start/End Event nodes',
      width: 360,
      height: 100,
      shapes: [
        {
          type: 'Custom',
          left: 0,
          top: 15,
          width: 70,
          height: 70,
          script: DRAW_SCRIPTS.bpmnEvent,
          properties: { eventType: 'START', label: 'Start' },
          fillColor: '#dcfce7',
          strokeColor: '#16a34a',
        },
        {
          type: 'Custom',
          left: 110,
          top: 0,
          width: 120,
          height: 95,
          script: DRAW_SCRIPTS.bpmnGateway,
          properties: { gatewayType: 'EXCLUSIVE', label: 'Authorized?' },
          fillColor: '#fef3c7',
          strokeColor: '#d97706',
        },
        {
          type: 'Custom',
          left: 270,
          top: 15,
          width: 70,
          height: 70,
          script: DRAW_SCRIPTS.bpmnEvent,
          properties: { eventType: 'END', label: 'End' },
          fillColor: '#fee2e2',
          strokeColor: '#dc2626',
        },
      ],
    },
    {
      id: 'flowchart-process-terminal',
      name: 'Start / Process / End Flow',
      category: StencilCategory.FLOWCHART_BPMN,
      description: 'Complete 3-step sequence: Start oval, Process box, End terminal',
      width: 480,
      height: 70,
      shapes: [
        { type: 'Ellipse', left: 0, top: 5, width: 110, height: 55, fillColor: '#dcfce7', strokeColor: '#16a34a', strokeWidth: 2, text: 'Start Flow', fontColor: '#166534', fontSize: 13, fontWeight: 600, horzAlign: 'center', vertAlign: 'middle' },
        { type: 'Rectangle', left: 150, top: 5, width: 160, height: 55, corners: [4, 4, 4, 4], fillColor: '#ffffff', strokeColor: '#3b82f6', strokeWidth: 2, text: 'Execute Business\nLogic Step', fontColor: '#1e3a8a', fontSize: 12, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
        { type: 'Ellipse', left: 350, top: 5, width: 110, height: 55, fillColor: '#fee2e2', strokeColor: '#dc2626', strokeWidth: 2, text: 'End Flow', fontColor: '#991b1b', fontSize: 13, fontWeight: 600, horzAlign: 'center', vertAlign: 'middle' },
      ],
    },
  ],
};
