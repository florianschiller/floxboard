import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Code,
  Sliders,
  Palette,
  X,
  RotateCcw,
  Trash2,
  Check,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Info,
  Copy,
  CheckCheck,
  Plus,
  Tag,
  Layers,
  ArrowRight,
  ArrowLeftRight,
  MoveRight,
  Lock,
  Unlock,
  Image as ImageIcon,
  Maximize2,
  Layout,
  Smartphone,
  Monitor,
  Tablet,
  FileText,
  Square,
  Crop,
} from 'lucide-react';
import { generateDefaultShapeScript, isOpenLineShape } from '../lib/shapeUtils';

export type LineEndTypeValue =
  | 'flat'
  | 'arrow'
  | 'solid-arrow'
  | 'triangle'
  | 'triangle-filled'
  | 'diamond'
  | 'diamond-filled'
  | 'circle';

export interface ShapeCustomizationPayload {
  script?: string | null;
  properties?: Record<string, any>;
  attributes?: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
    width?: number;
    height?: number;
    opacity?: number;
    // Connector specific
    headEndType?: LineEndTypeValue;
    tailEndType?: LineEndTypeValue;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    text?: string;
    // Frame specific
    title?: string;
    cornerRadius?: number;
    borderStyle?: 'solid' | 'dashed';
    // Image specific
    aspectRatioLocked?: boolean;
    fitMode?: 'contain' | 'cover' | 'fill';
    altText?: string;
    caption?: string;
  };
}

export interface ShapeScriptDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shape: any | null;
  revision?: number;
  onApplyCustomization?: (shape: any, payload: ShapeCustomizationPayload) => void;
  onApplyScript?: (shape: any, script: string) => void;
  onRevertCustomization?: (shape: any) => void;
  onRevertScript?: (shape: any) => void;
  onClearScript?: (shape: any) => void;
}

export interface ScriptSnippet {
  id: string;
  name: string;
  description: string;
  category: string;
  script: string;
  defaultProperties?: Record<string, any>;
}

export const roundDimension = (val: number): number => {
  if (typeof val !== 'number' || isNaN(val)) return 0;
  return Math.round(val * 10) / 10;
};

export const SWATCH_PALETTE = [
  '#ffffff',
  '#f8fafc',
  '#f1f5f9',
  '#e2e8f0',
  '#cbd5e1',
  '#94a3b8',
  '#64748b',
  '#334155',
  '#0f172a',
  '#ef4444',
  '#dc2626',
  '#f97316',
  '#ea580c',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#2563eb',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
];

export const SCRIPT_SNIPPETS: ScriptSnippet[] = [
  // Connectors & Flows
  {
    id: 'animated-flow-connector',
    name: 'Animated Flow Connector',
    description: 'Dashed directional flow line with highlighted head indicator',
    category: 'Connectors & Flows',
    script: `// Animated Flow Connector
const w = shape.width || 200;
const h = shape.height || 60;
const stroke = shape.strokeColor || '#2563eb';

ctx.save();
ctx.strokeStyle = stroke;
ctx.lineWidth = shape.strokeWidth || 2.5;
ctx.setLineDash([8, 6]);

ctx.beginPath();
ctx.moveTo(12, h / 2);
ctx.lineTo(w - 24, h / 2);
ctx.stroke();

// Directional Arrow Head
ctx.setLineDash([]);
ctx.fillStyle = stroke;
ctx.beginPath();
ctx.moveTo(w - 24, h / 2 - 6);
ctx.lineTo(w - 6, h / 2);
ctx.lineTo(w - 24, h / 2 + 6);
ctx.closePath();
ctx.fill();

// Protocol badge
const proto = shape.properties?.protocol || 'gRPC';
ctx.fillStyle = '#eff6ff';
ctx.fillRect(w / 2 - 24, h / 2 - 16, 48, 14);
ctx.strokeStyle = stroke;
ctx.lineWidth = 1;
ctx.strokeRect(w / 2 - 24, h / 2 - 16, 48, 14);
ctx.fillStyle = '#1e40af';
ctx.font = 'bold 9px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(proto, w / 2, h / 2 - 5);

ctx.restore();`,
    defaultProperties: { protocol: 'gRPC', latency: '12ms', port: 443 },
  },
  {
    id: 'status-pipeline-arrow',
    name: 'Status Pipeline Arrow',
    description: 'Thick chevrons indicating sequence progression and status',
    category: 'Connectors & Flows',
    script: `// Status Pipeline Arrow
const w = shape.width || 240;
const h = shape.height || 50;
const status = shape.properties?.status || 'PASSING';
const color = status === 'PASSING' ? '#10b981' : status === 'FAILED' ? '#ef4444' : '#f59e0b';

ctx.save();
ctx.fillStyle = color;
ctx.beginPath();
ctx.moveTo(0, 8);
ctx.lineTo(w - 20, 8);
ctx.lineTo(w, h / 2);
ctx.lineTo(w - 20, h - 8);
ctx.lineTo(0, h - 8);
ctx.lineTo(16, h / 2);
ctx.closePath();
ctx.fill();

ctx.fillStyle = '#ffffff';
ctx.font = 'bold 11px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(status, w / 2, h / 2 + 4);
ctx.restore();`,
    defaultProperties: { status: 'PASSING', step: 1 },
  },
  {
    id: 'step-sequence-connector',
    name: 'Step Sequence Connector',
    description: 'Numbered circular junction connecting diagram nodes',
    category: 'Connectors & Flows',
    script: `// Step Sequence Connector
const w = shape.width || 200;
const h = shape.height || 60;
const stepNum = shape.properties?.step || '1';

ctx.save();
// Connecting line
ctx.strokeStyle = shape.strokeColor || '#64748b';
ctx.lineWidth = shape.strokeWidth || 2;
ctx.beginPath();
ctx.moveTo(0, h / 2);
ctx.lineTo(w, h / 2);
ctx.stroke();

// Central step badge
ctx.fillStyle = '#3b82f6';
ctx.beginPath();
ctx.arc(w / 2, h / 2, 12, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 2;
ctx.stroke();

ctx.fillStyle = '#ffffff';
ctx.font = 'bold 11px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(String(stepNum), w / 2, h / 2 + 4);
ctx.restore();`,
    defaultProperties: { step: 1, action: 'validate' },
  },
  {
    id: 'bus-interface',
    name: 'Bus Interface Highway',
    description: 'Multi-line data bus trunk with terminal crossbars',
    category: 'Connectors & Flows',
    script: `// Bus Interface Highway
const w = shape.width || 300;
const h = shape.height || 40;
const busWidth = shape.properties?.width || '64-bit';

ctx.save();
ctx.strokeStyle = shape.strokeColor || '#0f172a';
ctx.lineWidth = shape.strokeWidth || 3;

// Highway main spine
ctx.beginPath();
ctx.moveTo(10, h / 2);
ctx.lineTo(w - 10, h / 2);
ctx.stroke();

// Start & end crossbars
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(10, h / 2 - 10);
ctx.lineTo(10, h / 2 + 10);
ctx.moveTo(w - 10, h / 2 - 10);
ctx.lineTo(w - 10, h / 2 + 10);
ctx.stroke();

// Label
ctx.fillStyle = '#334155';
ctx.font = 'bold 10px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText('BUS: ' + busWidth, w / 2, h / 2 - 8);
ctx.restore();`,
    defaultProperties: { width: '64-bit', clock: '100MHz' },
  },

  // Frames & Containers
  {
    id: 'browser-window-mockup',
    name: 'Browser Window Mockup',
    description: 'Browser chrome frame with address bar and window controls',
    category: 'Frames & Layout',
    script: `// Browser Window Mockup
const w = shape.width || 480;
const h = shape.height || 320;
const title = shape.properties?.url || shape.title || 'https://floxboard.app';

ctx.save();
// Window body
ctx.fillStyle = shape.fillColor || '#ffffff';
ctx.strokeStyle = shape.strokeColor || '#cbd5e1';
ctx.lineWidth = shape.strokeWidth || 1.5;
ctx.beginPath();
ctx.roundRect(0, 0, w, h, 8);
ctx.fill();
ctx.stroke();

// Window header bar
ctx.fillStyle = '#f1f5f9';
ctx.beginPath();
ctx.roundRect(0, 0, w, 32, [8, 8, 0, 0]);
ctx.fill();
ctx.stroke();

// Window control dots
ctx.fillStyle = '#ef4444';
ctx.beginPath();
ctx.arc(16, 16, 4, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#f59e0b';
ctx.beginPath();
ctx.arc(28, 16, 4, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = '#10b981';
ctx.beginPath();
ctx.arc(40, 16, 4, 0, Math.PI * 2);
ctx.fill();

// Address bar
ctx.fillStyle = '#ffffff';
ctx.beginPath();
ctx.roundRect(60, 8, w - 80, 16, 4);
ctx.fill();
ctx.strokeStyle = '#e2e8f0';
ctx.lineWidth = 1;
ctx.stroke();

// URL Text
ctx.fillStyle = '#64748b';
ctx.font = '10px Inter, sans-serif';
ctx.fillText(title, 70, 20);

ctx.restore();`,
    defaultProperties: { url: 'https://floxboard.app', device: 'Desktop' },
  },
  {
    id: 'mobile-device-bezel',
    name: 'Mobile Device Bezel',
    description: 'Smartphone frame with speaker notch and home indicator',
    category: 'Frames & Layout',
    script: `// Mobile Device Bezel
const w = shape.width || 375;
const h = shape.height || 667;
const radius = 32;

ctx.save();
// Outer phone frame
ctx.fillStyle = shape.fillColor || '#ffffff';
ctx.strokeStyle = shape.strokeColor || '#0f172a';
ctx.lineWidth = shape.strokeWidth || 4;
ctx.beginPath();
ctx.roundRect(0, 0, w, h, radius);
ctx.fill();
ctx.stroke();

// Speaker Notch / Dynamic Island
ctx.fillStyle = '#0f172a';
ctx.beginPath();
ctx.roundRect(w / 2 - 40, 8, 80, 18, 9);
ctx.fill();

// Home Bar indicator
ctx.fillStyle = '#94a3b8';
ctx.beginPath();
ctx.roundRect(w / 2 - 50, h - 14, 100, 4, 2);
ctx.fill();

ctx.restore();`,
    defaultProperties: { device: 'Mobile', model: 'iPhone' },
  },
  {
    id: 'swimlane-container',
    name: 'Swimlane Container',
    description: 'Horizontal process lane with title block and boundary guides',
    category: 'Frames & Layout',
    script: `// Swimlane Container
const w = shape.width || 600;
const h = shape.height || 200;
const title = shape.properties?.section || shape.title || 'Backend Services';

ctx.save();
// Body container
ctx.fillStyle = shape.fillColor || '#f8fafc';
ctx.strokeStyle = shape.strokeColor || '#94a3b8';
ctx.lineWidth = shape.strokeWidth || 1.5;
ctx.strokeRect(0, 0, w, h);
ctx.fillRect(0, 0, w, h);

// Title header strip
ctx.fillStyle = '#3b82f6';
ctx.fillRect(0, 0, 40, h);

ctx.save();
ctx.translate(24, h / 2);
ctx.rotate(-Math.PI / 2);
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 12px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(title.toUpperCase(), 0, 0);
ctx.restore();

ctx.restore();`,
    defaultProperties: { section: 'Backend Services', team: 'Platform' },
  },
  {
    id: 'kanban-column',
    name: 'Kanban Column',
    description: 'Agile board column with WIP limit badge and container card slots',
    category: 'Frames & Layout',
    script: `// Kanban Column
const w = shape.width || 280;
const h = shape.height || 500;
const title = shape.properties?.title || shape.title || 'IN PROGRESS';
const wip = shape.properties?.wip || '3 / 5';

ctx.save();
// Background container
ctx.fillStyle = shape.fillColor || '#f1f5f9';
ctx.strokeStyle = shape.strokeColor || '#cbd5e1';
ctx.lineWidth = shape.strokeWidth || 1;
ctx.beginPath();
ctx.roundRect(0, 0, w, h, 8);
ctx.fill();
ctx.stroke();

// Header row
ctx.fillStyle = '#334155';
ctx.font = 'bold 12px Inter, sans-serif';
ctx.fillText(title, 14, 26);

// WIP Badge
ctx.fillStyle = '#e2e8f0';
ctx.beginPath();
ctx.roundRect(w - 65, 12, 50, 20, 10);
ctx.fill();
ctx.fillStyle = '#475569';
ctx.font = 'bold 10px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(wip, w - 40, 26);

ctx.restore();`,
    defaultProperties: { title: 'IN PROGRESS', wip: '3 / 5', epic: 'Core' },
  },

  // Images & Media
  {
    id: 'vignette-shadow-frame',
    name: 'Vignette & Shadow Frame',
    description: 'Image container with subtle soft vignette and rounded clip',
    category: 'Images & Media',
    script: `// Vignette & Shadow Frame
const w = shape.width || 240;
const h = shape.height || 180;
const radius = shape.cornerRadius || 12;

ctx.save();
ctx.beginPath();
ctx.roundRect(0, 0, w, h, radius);
ctx.clip();

if (shape.imageData && shape.imageElement) {
  ctx.drawImage(shape.imageElement, 0, 0, w, h);
} else {
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '12px Inter, sans-serif';
  ctx.fillText('Image Asset', 16, h / 2);
}

// Vignette gradient overlay
const grad = ctx.createRadialGradient(w / 2, h / 2, w / 4, w / 2, h / 2, w / 1.5);
grad.addColorStop(0, 'rgba(0,0,0,0)');
grad.addColorStop(1, 'rgba(0,0,0,0.5)');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, w, h);

// Border
ctx.strokeStyle = shape.strokeColor || '#ffffff';
ctx.lineWidth = shape.strokeWidth || 2;
ctx.strokeRect(0, 0, w, h);

ctx.restore();`,
    defaultProperties: { filter: 'vignette', caption: 'Photo Asset' },
  },
  {
    id: 'polaroid-photo-card',
    name: 'Polaroid Photo Card',
    description: 'Classic white polaroid frame with bottom caption area',
    category: 'Images & Media',
    script: `// Polaroid Photo Card
const w = shape.width || 200;
const h = shape.height || 240;
const caption = shape.properties?.caption || shape.caption || 'Project Snapshot';

ctx.save();
// White polaroid container
ctx.fillStyle = '#ffffff';
ctx.strokeStyle = '#e2e8f0';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.roundRect(0, 0, w, h, 4);
ctx.fill();
ctx.stroke();

// Photo area
const photoMargin = 12;
const photoHeight = h - 48;
ctx.save();
ctx.beginPath();
ctx.rect(photoMargin, photoMargin, w - photoMargin * 2, photoHeight);
ctx.clip();

if (shape.imageData && shape.imageElement) {
  ctx.drawImage(shape.imageElement, photoMargin, photoMargin, w - photoMargin * 2, photoHeight);
} else {
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(photoMargin, photoMargin, w - photoMargin * 2, photoHeight);
  ctx.fillStyle = '#64748b';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Photo', w / 2, photoHeight / 2 + 10);
}
ctx.restore();

// Caption
ctx.fillStyle = '#334155';
ctx.font = '12px "Comic Sans MS", cursive, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(caption, w / 2, h - 16);

ctx.restore();`,
    defaultProperties: { caption: 'Project Snapshot' },
  },
  {
    id: 'watermarked-asset-badge',
    name: 'Watermarked Asset Badge',
    description: 'Protected media asset with verified watermark overlay badge',
    category: 'Images & Media',
    script: `// Watermarked Asset Badge
const w = shape.width || 240;
const h = shape.height || 160;

ctx.save();
if (shape.imageData && shape.imageElement) {
  ctx.drawImage(shape.imageElement, 0, 0, w, h);
} else {
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, w, h);
}

// Watermark badge in bottom right
ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
ctx.beginPath();
ctx.roundRect(w - 90, h - 28, 82, 20, 4);
ctx.fill();

ctx.fillStyle = '#38bdf8';
ctx.font = 'bold 9px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText('VERIFIED ASSET', w - 49, h - 14);

ctx.restore();`,
    defaultProperties: { license: 'Enterprise', watermark: 'Verified' },
  },
  {
    id: 'duotone-color-overlay',
    name: 'Duotone Color Overlay',
    description: 'Stylized dual-tone color overlay for architectural diagrams',
    category: 'Images & Media',
    script: `// Duotone Color Overlay
const w = shape.width || 240;
const h = shape.height || 160;

ctx.save();
if (shape.imageData && shape.imageElement) {
  ctx.drawImage(shape.imageElement, 0, 0, w, h);
} else {
  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, w, h);
}

// Duotone blend
ctx.globalCompositeOperation = 'multiply';
const grad = ctx.createLinearGradient(0, 0, w, h);
grad.addColorStop(0, '#3b82f6');
grad.addColorStop(1, '#8b5cf6');
ctx.fillStyle = grad;
ctx.fillRect(0, 0, w, h);

ctx.restore();`,
    defaultProperties: { filter: 'duotone' },
  },

  // Standard Stencils
  {
    id: 'kpi-metric-badge',
    name: 'Metric KPI Badge',
    description: 'Displays a key numeric metric, status indicator, and label',
    category: 'Metrics & Data',
    script: `// Metric KPI Badge
const w = shape.width;
const h = shape.height;
const title = shape.properties?.title || 'Active Users';
const value = shape.properties?.value || '14,290';
const status = shape.properties?.status || 'OPTIMAL';

ctx.save();
ctx.fillStyle = shape.fillColor || '#0f172a';
ctx.strokeStyle = shape.strokeColor || '#38bdf8';
ctx.lineWidth = shape.strokeWidth || 2;

ctx.beginPath();
ctx.roundRect(0, 0, w, h, 10);
ctx.fill();
ctx.stroke();

ctx.fillStyle = status === 'OPTIMAL' ? '#22c55e' : '#eab308';
ctx.beginPath();
ctx.arc(w - 18, 18, 6, 0, Math.PI * 2);
ctx.fill();

ctx.fillStyle = '#94a3b8';
ctx.font = 'bold 12px Inter, sans-serif';
ctx.fillText(String(title).toUpperCase(), 16, 26);

ctx.fillStyle = '#ffffff';
ctx.font = 'bold 24px Inter, sans-serif';
ctx.fillText(String(value), 16, 60);

ctx.restore();`,
    defaultProperties: { title: 'Active Users', value: '14,290', status: 'OPTIMAL' },
  },
  {
    id: 'uml-class-box',
    name: 'UML Class Compartments',
    description: 'Standard 3-compartment UML class box with stereotype, attributes, and operations',
    category: 'Architecture',
    script: `// UML Class Compartments
const w = shape.width;
const h = shape.height;
const className = shape.properties?.className || 'PaymentService';
const stereotype = shape.properties?.stereotype || '<<Service>>';
const attributes = Array.isArray(shape.properties?.attributes) 
  ? shape.properties.attributes 
  : ['- apiKey: string', '- timeoutMs: number'];
const methods = Array.isArray(shape.properties?.methods)
  ? shape.properties.methods
  : ['+ process(): Result', '+ refund(): void'];

ctx.save();
ctx.fillStyle = shape.fillColor || '#ffffff';
ctx.strokeStyle = shape.strokeColor || '#1e293b';
ctx.lineWidth = shape.strokeWidth || 1.5;

ctx.beginPath();
ctx.roundRect(0, 0, w, h, 4);
ctx.fill();
ctx.stroke();

ctx.fillStyle = '#f1f5f9';
ctx.fillRect(1, 1, w - 2, 40);
ctx.fillStyle = '#64748b';
ctx.font = 'italic 10px Inter, sans-serif';
ctx.textAlign = 'center';
ctx.fillText(stereotype, w / 2, 16);
ctx.fillStyle = '#0f172a';
ctx.font = 'bold 13px Inter, sans-serif';
ctx.fillText(className, w / 2, 32);

ctx.beginPath();
ctx.moveTo(0, 42);
ctx.lineTo(w, 42);
ctx.stroke();

ctx.textAlign = 'left';
ctx.fillStyle = '#334155';
ctx.font = '11px monospace';
let curY = 58;
attributes.forEach((attr: string) => {
  ctx.fillText(attr, 8, curY);
  curY += 16;
});

ctx.beginPath();
ctx.moveTo(0, curY);
ctx.lineTo(w, curY);
ctx.stroke();

curY += 16;
methods.forEach((meth: string) => {
  ctx.fillText(meth, 8, curY);
  curY += 16;
});

ctx.restore();`,
    defaultProperties: {
      className: 'PaymentService',
      stereotype: '<<Service>>',
      attributes: ['- apiKey: string', '- timeoutMs: number'],
      methods: ['+ process(): Result', '+ refund(): void'],
    },
  },
  {
    id: 'bpmn-gateway',
    name: 'BPMN Decision Gateway',
    description: 'Diamond shape with conditional logic symbol and label',
    category: 'Flow & Process',
    script: `// BPMN Decision Gateway
const w = shape.width;
const h = shape.height;
const cx = w / 2;
const cy = h / 2;

ctx.save();
ctx.fillStyle = shape.fillColor || '#ffffff';
ctx.strokeStyle = shape.strokeColor || '#d97706';
ctx.lineWidth = shape.strokeWidth || 2;

ctx.beginPath();
ctx.moveTo(cx, 4);
ctx.lineTo(w - 4, cy);
ctx.lineTo(cx, h - 4);
ctx.lineTo(4, cy);
ctx.closePath();
ctx.fill();
ctx.stroke();

ctx.strokeStyle = shape.strokeColor || '#d97706';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(cx - 10, cy);
ctx.lineTo(cx + 10, cy);
ctx.moveTo(cx, cy - 10);
ctx.lineTo(cx, cy + 10);
ctx.stroke();

ctx.restore();`,
    defaultProperties: { condition: 'isValid == true' },
  },
  {
    id: 'cloud-database',
    name: 'Cloud Database Node',
    description: 'Cylinder storage container with capacity indicator',
    category: 'Cloud & Infrastructure',
    script: `// Cloud Database Node
const w = shape.width;
const h = shape.height;
const ry = Math.min(20, h * 0.18);
const props = shape.properties || {};
const title = props.title || 'PostgreSQL DB';
const sub = props.engine || props.subtitle || 'PostgreSQL 16';

ctx.save();
// Bottom Ellipse & Cylinder Body
ctx.beginPath();
ctx.moveTo(0, ry);
ctx.lineTo(0, h - ry);
ctx.ellipse(w / 2, h - ry, w / 2, ry, 0, Math.PI, 0, true);
ctx.lineTo(w, ry);
ctx.ellipse(w / 2, ry, w / 2, ry, 0, 0, Math.PI, true);
ctx.closePath();
ctx.fillStyle = shape.fillColor || '#eff6ff';
ctx.fill();
ctx.strokeStyle = shape.strokeColor || '#2563eb';
ctx.lineWidth = shape.strokeWidth || 2;
ctx.stroke();

// Top Rim Ellipse
ctx.beginPath();
ctx.ellipse(w / 2, ry, w / 2, ry, 0, 0, 2 * Math.PI, false);
ctx.fillStyle = '#dbeafe';
ctx.fill();
ctx.stroke();

// Intermediate Tier Rings
const ringY1 = ry + (h - 2 * ry) * 0.35;
const ringY2 = ry + (h - 2 * ry) * 0.70;
ctx.strokeStyle = '#93c5fd';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.ellipse(w / 2, ringY1, w / 2, ry, 0, 0, Math.PI, false);
ctx.stroke();
ctx.beginPath();
ctx.ellipse(w / 2, ringY2, w / 2, ry, 0, 0, Math.PI, false);
ctx.stroke();

// Text Labels
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = shape.fontColor || '#1e3a8a';
ctx.font = 'bold 12px Inter, sans-serif';
ctx.fillText(title, w / 2, h / 2 - 2);
ctx.fillStyle = '#64748b';
ctx.font = '10px Inter, sans-serif';
ctx.fillText(sub, w / 2, h / 2 + 13);
ctx.restore();`,
    defaultProperties: { title: 'PostgreSQL DB', engine: 'PostgreSQL 16' },
  },
];

export const PROPERTY_PRESETS: Record<
  string,
  {
    label: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'enum' | 'color';
    options?: string[];
    placeholder?: string;
    defaultValue: any;
    category?: 'connector' | 'frame' | 'image' | 'general';
  }
> = {
  // Connector specific
  protocol: { label: 'Protocol', type: 'string', placeholder: 'gRPC / HTTPS', defaultValue: 'HTTPS', category: 'connector' },
  latency: { label: 'Latency', type: 'string', placeholder: '15ms', defaultValue: '15ms', category: 'connector' },
  port: { label: 'Port', type: 'number', placeholder: '443', defaultValue: 443, category: 'connector' },
  source: { label: 'Source Node', type: 'string', placeholder: 'Client Gateway', defaultValue: 'Client Gateway', category: 'connector' },
  target: { label: 'Target Node', type: 'string', placeholder: 'Auth Service', defaultValue: 'Auth Service', category: 'connector' },

  // Frame specific
  device: { label: 'Device Preset', type: 'enum', options: ['Desktop', 'Laptop', 'Tablet', 'Mobile', 'A4', 'Square'], defaultValue: 'Desktop', category: 'frame' },
  section: { label: 'Section / Swimlane', type: 'string', placeholder: 'Frontend Layer', defaultValue: 'Frontend Layer', category: 'frame' },
  direction: { label: 'Layout Direction', type: 'enum', options: ['HORIZONTAL', 'VERTICAL', 'GRID'], defaultValue: 'HORIZONTAL', category: 'frame' },
  team: { label: 'Team Owner', type: 'string', placeholder: 'Core Team', defaultValue: 'Core Team', category: 'frame' },
  epic: { label: 'Parent Epic', type: 'string', placeholder: 'User Experience v2', defaultValue: 'User Experience v2', category: 'frame' },

  // Image specific
  altText: { label: 'Alt Text', type: 'string', placeholder: 'Architecture Overview diagram', defaultValue: 'Architecture Overview diagram', category: 'image' },
  caption: { label: 'Image Caption', type: 'string', placeholder: 'Figure 1: Core System Flow', defaultValue: 'Figure 1: Core System Flow', category: 'image' },
  license: { label: 'License / Source', type: 'string', placeholder: 'CC BY-SA 4.0', defaultValue: 'CC BY-SA 4.0', category: 'image' },
  fit: { label: 'Fit Mode', type: 'enum', options: ['contain', 'cover', 'fill'], defaultValue: 'contain', category: 'image' },
  filter: { label: 'Image Filter', type: 'enum', options: ['none', 'grayscale', 'duotone', 'vignette'], defaultValue: 'none', category: 'image' },
  sourceUrl: { label: 'Source URL', type: 'string', placeholder: 'https://cdn.example.com/asset.png', defaultValue: 'https://cdn.example.com/asset.png', category: 'image' },

  // General & Standard
  title: { label: 'Title', type: 'string', placeholder: 'Metric Title', defaultValue: 'Active Users', category: 'general' },
  subtitle: { label: 'Subtitle', type: 'string', placeholder: 'Subtitle', defaultValue: 'Overview', category: 'general' },
  persona: { label: 'Persona', type: 'string', placeholder: 'Registered User', defaultValue: 'Registered User', category: 'general' },
  goal: { label: 'Goal', type: 'string', placeholder: 'View Dashboard', defaultValue: 'View Dashboard', category: 'general' },
  value: { label: 'Value', type: 'string', placeholder: 'Make decisions faster', defaultValue: 'Make decisions faster', category: 'general' },
  points: { label: 'Story Points', type: 'number', placeholder: '5', defaultValue: 5, category: 'general' },
  priority: {
    label: 'Priority',
    type: 'enum',
    options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    defaultValue: 'MEDIUM',
    category: 'general',
  },
  status: {
    label: 'Status',
    type: 'enum',
    options: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
    defaultValue: 'IN_PROGRESS',
    category: 'general',
  },
  progress: { label: 'Progress (%)', type: 'number', placeholder: '65', defaultValue: 65, category: 'general' },
};

export function ShapeScriptDrawer({
  isOpen,
  onClose,
  shape,
  revision,
  onApplyCustomization,
  onApplyScript,
  onRevertCustomization,
  onRevertScript,
  onClearScript,
}: ShapeScriptDrawerProps) {
  // Active Tab: attributes (default) -> script -> properties
  const [activeTab, setActiveTab] = useState<'attributes' | 'script' | 'properties'>('attributes');

  // Script State
  const [code, setCode] = useState<string>('');
  const [isScriptEnabled, setIsScriptEnabled] = useState<boolean>(false);
  const [selectedSnippetId, setSelectedSnippetId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

  // Properties State
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [newPropKey, setNewPropKey] = useState<string>('');
  const [newPropType, setNewPropType] = useState<'string' | 'number' | 'boolean' | 'array' | 'enum' | 'color'>('string');
  const [newPropValue, setNewPropValue] = useState<string>('');
  const [newPropEnumOptions, setNewPropEnumOptions] = useState<string>('');

  // Detect shape category
  const isConnector = useMemo(() => isOpenLineShape(shape), [shape]);
  const isFrame = useMemo(() => Boolean(shape?.type === 'Frame' || shape?._type === 'Frame' || shape?.isFrame), [shape]);
  const isImage = useMemo(() => Boolean(shape?.type === 'Image' || shape?._type === 'Image' || shape?.imageData), [shape]);
  const isRectangle = useMemo(() => {
    if (isConnector || isFrame || isImage) return false;
    const type = shape?.type || shape?._type || shape?.name || shape?.constructor?.name;
    if (type === 'Box' || type === 'Rectangle' || type === 'Square') return true;
    if (type === 'Ellipse' || type === 'Oval' || type === 'Circle' || type === 'Text') return false;
    return true;
  }, [shape, isConnector, isFrame, isImage]);

  const initialAspectRatioRef = useRef<number>(4 / 3);

  // Attributes State
  const [attributes, setAttributes] = useState<{
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    opacity: number;
    width: number;
    height: number;
    // Connector specific
    headEndType: LineEndTypeValue;
    tailEndType: LineEndTypeValue;
    lineStyle: 'solid' | 'dashed' | 'dotted';
    text: string;
    // Frame specific
    title: string;
    cornerRadius: number;
    borderStyle: 'solid' | 'dashed';
    // Image specific
    aspectRatioLocked: boolean;
    fitMode: 'contain' | 'cover' | 'fill';
    altText: string;
    caption: string;
  }>({
    fillColor: '#ffffff',
    strokeColor: '#334155',
    strokeWidth: 2,
    fontFamily: 'Roboto',
    fontSize: 14,
    fontColor: '#0f172a',
    opacity: 1,
    width: 200,
    height: 120,
    headEndType: 'flat',
    tailEndType: 'flat',
    lineStyle: 'solid',
    text: '',
    title: 'Frame',
    cornerRadius: 8,
    borderStyle: 'solid',
    aspectRatioLocked: true,
    fitMode: 'contain',
    altText: '',
    caption: '',
  });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lineGutterRef = useRef<HTMLDivElement | null>(null);
  const previousShapeIdRef = useRef<string | null>(null);

  // Initialize all states when shape changes or drawer opens
  useEffect(() => {
    if (!isOpen || !shape) {
      previousShapeIdRef.current = null;
      return;
    }

    const isNewSelection = shape.id !== previousShapeIdRef.current;
    previousShapeIdRef.current = shape.id;

    if (isNewSelection) {
      setError(null);
      setSelectedSnippetId('');
      setIsSavedRecently(false);
      setActiveTab('attributes');

      // Initialize Script
      const activeScript = shape.script ?? shape.customData?.script;
      const hasActiveScript = Boolean(
        (activeScript && typeof activeScript === 'string' && activeScript.trim()) ||
        typeof activeScript === 'function'
      );
      setIsScriptEnabled(hasActiveScript);

      if (activeScript && typeof activeScript === 'string' && activeScript.trim()) {
        setCode(activeScript);
      } else if (typeof activeScript === 'function') {
        setCode(activeScript.toString());
      } else {
        setCode(generateDefaultShapeScript(shape));
      }

      // Initialize Properties
      const initialProps = shape.properties || shape.customData?.properties || {};
      try {
        setProperties(JSON.parse(JSON.stringify(initialProps)));
      } catch {
        setProperties({ ...initialProps });
      }

      const rawInitW = shape.width || (shape.rect ? Math.abs(shape.rect[1][0] - shape.rect[0][0]) : (isFrame ? 800 : isConnector ? 240 : 200));
      const rawInitH = shape.height || (shape.rect ? Math.abs(shape.rect[1][1] - shape.rect[0][1]) : (isFrame ? 600 : isConnector ? 80 : 120));
      const initW = roundDimension(rawInitW);
      const initH = roundDimension(rawInitH);
      if (initW > 0 && initH > 0) {
        initialAspectRatioRef.current = initW / initH;
      }

      // Initialize Attributes
      setAttributes({
        fillColor: shape.fillColor || (isFrame ? '#f8fafc' : '#ffffff'),
        strokeColor: shape.strokeColor || (isFrame ? '#cbd5e1' : '#334155'),
        strokeWidth: typeof shape.strokeWidth === 'number' ? shape.strokeWidth : 2,
        fontFamily: 'Roboto',
        fontSize: typeof shape.customData?.fontSize === 'number'
          ? shape.customData.fontSize
          : (typeof shape.fontSize === 'number' ? shape.fontSize : 14),
        fontColor: shape.customData?.fontColor || shape.fontColor || '#0f172a',
        opacity: typeof shape.opacity === 'number' ? shape.opacity : 1,
        width: initW,
        height: initH,
        headEndType: shape.headEndType || 'flat',
        tailEndType: shape.tailEndType || 'flat',
        lineStyle: shape.customData?.lineStyle || shape.lineStyle || 'solid',
        text: shape.text || '',
        title: shape.title || shape.name || shape.customData?.title || (isFrame ? 'Frame 1' : ''),
        cornerRadius: typeof shape.cornerRadius === 'number'
          ? shape.cornerRadius
          : (Array.isArray(shape.corners) && shape.corners[0] !== undefined
              ? shape.corners[0]
              : (shape.customData?.cornerRadius ?? (isFrame ? 8 : isImage ? 8 : 0))),
        borderStyle: shape.customData?.borderStyle || shape.borderStyle || (Array.isArray(shape.strokePattern) && shape.strokePattern.length > 0 ? 'dashed' : 'solid'),
        aspectRatioLocked: shape.customData?.aspectRatioLocked !== false,
        fitMode: shape.customData?.fitMode || shape.fitMode || 'contain',
        altText: shape.altText || shape.customData?.altText || '',
        caption: shape.caption || shape.customData?.caption || '',
      });
    }
  }, [isOpen, shape, shape?.id, isConnector, isFrame, isImage, isRectangle]);

  // Synchronize dynamic dimensions on canvas resize
  const rawLiveWidth = typeof shape?.width === 'number' && shape.width > 0
    ? shape.width
    : (Array.isArray(shape?.rect) && shape.rect.length === 2 ? Math.abs(shape.rect[1][0] - shape.rect[0][0]) : undefined);
  const rawLiveHeight = typeof shape?.height === 'number' && shape.height > 0
    ? shape.height
    : (Array.isArray(shape?.rect) && shape.rect.length === 2 ? Math.abs(shape.rect[1][1] - shape.rect[0][1]) : undefined);

  const liveWidth = typeof rawLiveWidth === 'number' ? roundDimension(rawLiveWidth) : undefined;
  const liveHeight = typeof rawLiveHeight === 'number' ? roundDimension(rawLiveHeight) : undefined;

  useEffect(() => {
    if (!isOpen || !shape) return;
    if (typeof liveWidth === 'number' && typeof liveHeight === 'number' && (liveWidth > 0 || liveHeight > 0)) {
      setAttributes((prev) => {
        if (prev.width === liveWidth && prev.height === liveHeight) return prev;
        return {
          ...prev,
          width: liveWidth,
          height: liveHeight,
        };
      });
    }
  }, [isOpen, shape, liveWidth, liveHeight, shape?.rect, shape?.path, revision]);

  // Handle Tab key inside textarea and Ctrl+Enter / Cmd+Enter shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleApply();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '  ';

      const newCode = code.substring(0, start) + spaces + code.substring(end);
      setCode(newCode);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + spaces.length;
          textareaRef.current.selectionEnd = start + spaces.length;
        }
      }, 0);
    }
  };

  // Sync scroll between textarea and line numbers gutter
  const handleScroll = () => {
    if (textareaRef.current && lineGutterRef.current) {
      lineGutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Calculate line numbers
  const lineNumbers = useMemo(() => {
    const linesCount = code.split('\n').length;
    return Array.from({ length: Math.max(linesCount, 1) }, (_, i) => i + 1);
  }, [code]);

  // Debounced live sandboxed Canvas2D preview across script, properties, and attributes
  useEffect(() => {
    if (!isOpen || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const timer = setTimeout(() => {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const displayWidth = 280;
      const displayHeight = 150;

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;

      if (typeof ctx.resetTransform === 'function') {
        ctx.resetTransform();
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // Draw subtle preview background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      const shapeWidth = Math.max(attributes.width, 10);
      const shapeHeight = Math.max(attributes.height, 10);
      const padding = 16;
      const isFrameShape = isFrame;
      const extraTop = isFrameShape ? 24 : 0;
      const totalH = shapeHeight + extraTop;

      const scale = Math.min(
        (displayWidth - padding * 2) / shapeWidth,
        (displayHeight - padding * 2) / totalH,
        1
      );

      const offsetX = (displayWidth - shapeWidth * scale) / 2;
      const offsetY = (displayHeight - totalH * scale) / 2 + extraTop * scale;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      let evalError: string | null = null;
      try {
        const trimmed = code.trim();
        const shapeMock = {
          width: shapeWidth,
          height: shapeHeight,
          fillColor: attributes.fillColor,
          strokeColor: attributes.strokeColor,
          strokeWidth: attributes.strokeWidth,
          fontColor: attributes.fontColor,
          fontSize: attributes.fontSize,
          fontFamily: attributes.fontFamily,
          opacity: attributes.opacity,
          properties: properties || {},
          type: shape?.type || 'Custom',
          id: shape?.id || 'preview-shape',
          headEndType: attributes.headEndType,
          tailEndType: attributes.tailEndType,
          lineStyle: attributes.lineStyle,
          title: attributes.title,
          cornerRadius: attributes.cornerRadius,
          borderStyle: attributes.borderStyle,
          altText: attributes.altText,
          caption: attributes.caption,
          imageData: shape?.imageData,
          imageElement: shape?.imageElement,
        };

        if (isScriptEnabled && trimmed) {
          if (trimmed.startsWith('function') || trimmed.startsWith('(') || trimmed.includes('=>')) {
            const fn = new Function('ctx', 'shape', `"use strict"; return (${trimmed})(ctx, shape);`);
            fn(ctx, shapeMock);
          } else {
            const fn = new Function('ctx', 'shape', `"use strict"; ${trimmed}`);
            fn(ctx, shapeMock);
          }
        } else {
          // Standard geometric rendering preview if script is disabled or empty
          ctx.save();
          ctx.globalAlpha = typeof attributes.opacity === 'number' ? attributes.opacity : 1;
          ctx.fillStyle = attributes.fillColor || '#ffffff';
          ctx.strokeStyle = attributes.strokeColor || '#334155';
          ctx.lineWidth = attributes.strokeWidth || 2;

          if (isConnector) {
            // Connector line rendering
            if (attributes.lineStyle === 'dashed') {
              ctx.setLineDash([8, 6]);
            } else if (attributes.lineStyle === 'dotted') {
              ctx.setLineDash([2, 4]);
            } else {
              ctx.setLineDash([]);
            }

            const yMid = shapeHeight / 2;
            const xStart = 16;
            const xEnd = shapeWidth - 16;

            ctx.beginPath();
            ctx.moveTo(xStart, yMid);
            ctx.lineTo(xEnd, yMid);
            ctx.stroke();

            const renderEndpoint = (endType: LineEndTypeValue | undefined, x: number, y: number, isHead: boolean) => {
              if (!endType || endType === 'flat') return;
              ctx.setLineDash([]);
              const dir = isHead ? 1 : -1;
              const stroke = attributes.strokeColor || '#334155';
              const size = Math.min(14, Math.max(8, (attributes.strokeWidth || 2) * 3));

              ctx.fillStyle = stroke;
              ctx.strokeStyle = stroke;
              ctx.lineWidth = attributes.strokeWidth || 2;

              if (endType === 'arrow') {
                ctx.beginPath();
                ctx.moveTo(x - dir * size, y - size / 2);
                ctx.lineTo(x, y);
                ctx.lineTo(x - dir * size, y + size / 2);
                ctx.stroke();
              } else if (endType === 'solid-arrow' || endType === 'triangle-filled') {
                ctx.beginPath();
                ctx.moveTo(x - dir * size, y - size / 2);
                ctx.lineTo(x, y);
                ctx.lineTo(x - dir * size, y + size / 2);
                ctx.closePath();
                ctx.fill();
              } else if (endType === 'triangle') {
                ctx.beginPath();
                ctx.moveTo(x - dir * size, y - size / 2);
                ctx.lineTo(x, y);
                ctx.lineTo(x - dir * size, y + size / 2);
                ctx.closePath();
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.stroke();
              } else if (endType === 'diamond') {
                ctx.beginPath();
                ctx.moveTo(x - dir * size, y);
                ctx.lineTo(x - dir * (size / 2), y - size / 2);
                ctx.lineTo(x, y);
                ctx.lineTo(x - dir * (size / 2), y + size / 2);
                ctx.closePath();
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.stroke();
              } else if (endType === 'diamond-filled') {
                ctx.beginPath();
                ctx.moveTo(x - dir * size, y);
                ctx.lineTo(x - dir * (size / 2), y - size / 2);
                ctx.lineTo(x, y);
                ctx.lineTo(x - dir * (size / 2), y + size / 2);
                ctx.closePath();
                ctx.fill();
              } else if (endType === 'circle') {
                ctx.beginPath();
                ctx.arc(x - dir * (size / 2), y, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.stroke();
              }
            };

            // Head Arrow
            renderEndpoint(attributes.headEndType, xEnd, yMid, true);
            // Tail Arrow
            renderEndpoint(attributes.tailEndType, xStart, yMid, false);
          } else if (isFrame) {
            // Frame container rendering matching authentic DGM canvas appearance
            const rad = attributes.cornerRadius || 0;
            if (attributes.borderStyle === 'dashed') {
              ctx.setLineDash([8, 6]);
            } else {
              ctx.setLineDash([]);
            }

            // Container fill & stroke
            ctx.beginPath();
            ctx.roundRect(0, 0, shapeWidth, shapeHeight, rad);
            if (attributes.fillColor && attributes.fillColor !== 'transparent' && attributes.fillColor !== 'none') {
              ctx.fill();
            }
            if (attributes.strokeWidth && attributes.strokeWidth > 0 && attributes.strokeColor && attributes.strokeColor !== 'transparent' && attributes.strokeColor !== 'none') {
              ctx.stroke();
            }

            // Title badge above container (matching DGM Frame title)
            const title = attributes.title || 'Frame';
            ctx.setLineDash([]);
            ctx.font = 'bold 12px Roboto, sans-serif';
            ctx.textAlign = 'left';
            const textMetric = ctx.measureText(title);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(8, -18, textMetric.width + 12, 18);
            ctx.fillStyle = attributes.strokeColor || '#334155';
            ctx.fillText(title, 14, -4);
          } else if (isImage) {
            // Image rendering with corner clipping, opacity, and border outline
            const rad = attributes.cornerRadius || 0;
            ctx.save();
            ctx.globalAlpha = typeof attributes.opacity === 'number' ? attributes.opacity : 1;
            ctx.beginPath();
            ctx.roundRect(0, 0, shapeWidth, shapeHeight, rad);
            ctx.clip();

            if (shape?.imageData && shape?.imageElement) {
              ctx.drawImage(shape.imageElement, 0, 0, shapeWidth, shapeHeight);
            } else {
              ctx.fillStyle = '#e2e8f0';
              ctx.fillRect(0, 0, shapeWidth, shapeHeight);
              ctx.fillStyle = '#64748b';
              ctx.font = '12px Roboto, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(attributes.altText || 'Image Asset', shapeWidth / 2, shapeHeight / 2);
            }
            ctx.restore();

            if (attributes.strokeWidth && attributes.strokeWidth > 0 && attributes.strokeColor && attributes.strokeColor !== 'transparent' && attributes.strokeColor !== 'none') {
              ctx.beginPath();
              ctx.roundRect(0, 0, shapeWidth, shapeHeight, rad);
              ctx.strokeStyle = attributes.strokeColor;
              ctx.lineWidth = attributes.strokeWidth;
              if (attributes.borderStyle === 'dashed') {
                ctx.setLineDash([8, 6]);
              } else {
                ctx.setLineDash([]);
              }
              ctx.stroke();
            }
          } else {
            // Standard geometric shapes
            if (shape?.type === 'Ellipse' || shape?.type === 'Circle' || shape?.type === 'Oval') {
              ctx.ellipse(shapeWidth / 2, shapeHeight / 2, shapeWidth / 2, shapeHeight / 2, 0, 0, Math.PI * 2);
            } else {
              const rad = isRectangle ? (attributes.cornerRadius || 0) : 6;
              ctx.roundRect(0, 0, shapeWidth, shapeHeight, rad);
            }
            ctx.fill();
            ctx.stroke();
          }

          ctx.restore();
        }
      } catch (err: any) {
        evalError = err.message || String(err);
      }
      ctx.restore();

      setError(evalError);
    }, 120);

    return () => clearTimeout(timer);
  }, [code, isScriptEnabled, properties, attributes, shape, isOpen, isConnector, isFrame, isImage, isRectangle]);

  // Insert selected snippet into code editor
  const handleSelectSnippet = (snippetId: string) => {
    setSelectedSnippetId(snippetId);
    const snippet = SCRIPT_SNIPPETS.find((s) => s.id === snippetId);
    if (snippet) {
      setCode(snippet.script);
      setIsScriptEnabled(true);
      if (snippet.defaultProperties) {
        setProperties((prev) => ({ ...prev, ...snippet.defaultProperties }));
      }
    }
  };

  // Copy code to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Handle Property Updates
  const handlePropertyChange = (key: string, value: any) => {
    setProperties((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteProperty = (key: string) => {
    setProperties((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropKey.trim()) return;

    let finalVal: any = newPropValue;
    if (newPropType === 'number') {
      finalVal = Number(newPropValue) || 0;
    } else if (newPropType === 'boolean') {
      finalVal = newPropValue === 'true';
    } else if (newPropType === 'array') {
      finalVal = newPropValue
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    setProperties((prev) => ({ ...prev, [newPropKey.trim()]: finalVal }));
    setNewPropKey('');
    setNewPropValue('');
  };

  const handleApplyPresetProperty = (key: string) => {
    const preset = PROPERTY_PRESETS[key];
    if (preset) {
      setNewPropKey(key);
      setNewPropType(preset.type);
      setNewPropValue(
        typeof preset.defaultValue === 'object' && Array.isArray(preset.defaultValue)
          ? preset.defaultValue.join('\n')
          : String(preset.defaultValue ?? '')
      );
    }
  };

  // Handle Attribute Updates
  const handleAttributeChange = <K extends keyof typeof attributes>(key: K, value: typeof attributes[K]) => {
    setAttributes((prev) => {
      const updated = { ...prev, [key]: value };

      if (key === 'width' || key === 'height') {
        updated[key] = roundDimension(Number(value)) as any;
      }

      // Image aspect ratio auto-proportions
      if (isImage && prev.aspectRatioLocked) {
        if (key === 'width') {
          const w = Number(value);
          const ratio = initialAspectRatioRef.current || (4 / 3);
          updated.height = Math.max(10, roundDimension(w / ratio));
        } else if (key === 'height') {
          const h = Number(value);
          const ratio = initialAspectRatioRef.current || (4 / 3);
          updated.width = Math.max(10, roundDimension(h * ratio));
        }
      }

      return updated;
    });
  };

  // Quick arrow presets for Connectors
  const applyArrowPreset = (preset: 'line' | 'forward' | 'bidirectional' | 'reverse') => {
    if (preset === 'line') {
      setAttributes((prev) => ({ ...prev, headEndType: 'flat', tailEndType: 'flat' }));
    } else if (preset === 'forward') {
      setAttributes((prev) => ({ ...prev, headEndType: 'arrow', tailEndType: 'flat' }));
    } else if (preset === 'bidirectional') {
      setAttributes((prev) => ({ ...prev, headEndType: 'arrow', tailEndType: 'arrow' }));
    } else if (preset === 'reverse') {
      setAttributes((prev) => ({ ...prev, headEndType: 'flat', tailEndType: 'arrow' }));
    }
  };

  // Device presets for Frames
  const applyDevicePreset = (preset: 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'a4' | 'square') => {
    const dimensions: Record<string, { width: number; height: number }> = {
      desktop: { width: 1920, height: 1080 },
      laptop: { width: 1440, height: 900 },
      tablet: { width: 1024, height: 768 },
      mobile: { width: 375, height: 812 },
      a4: { width: 1120, height: 792 },
      square: { width: 800, height: 800 },
    };
    const dim = dimensions[preset];
    if (dim) {
      setAttributes((prev) => ({ ...prev, width: roundDimension(dim.width), height: roundDimension(dim.height) }));
    }
  };

  // Scale presets for Images
  const applyImageScalePreset = (percent: number) => {
    const baseW = shape?.width || 200;
    const baseH = shape?.height || 150;
    const ratio = baseW / baseH || (4 / 3);
    const newW = roundDimension((baseW * percent) / 100);
    const newH = roundDimension(newW / ratio);
    setAttributes((prev) => ({ ...prev, width: newW, height: newH }));
  };

  // Apply Changes across Whiteboard Canvas
  const handleApply = () => {
    if (!shape) return;

    if (onApplyScript && isScriptEnabled && code.trim()) {
      onApplyScript(shape, code);
    }

    if (onApplyCustomization) {
      onApplyCustomization(shape, {
        script: isScriptEnabled ? code : (shape.script ? null : undefined),
        properties,
        attributes: {
          fillColor: attributes.fillColor,
          strokeColor: attributes.strokeColor,
          strokeWidth: attributes.strokeWidth,
          fontFamily: attributes.fontFamily,
          fontSize: attributes.fontSize,
          fontColor: attributes.fontColor,
          width: attributes.width,
          height: attributes.height,
          opacity: attributes.opacity,
          headEndType: attributes.headEndType,
          tailEndType: attributes.tailEndType,
          lineStyle: attributes.lineStyle,
          text: attributes.text,
          title: attributes.title,
          cornerRadius: attributes.cornerRadius,
          borderStyle: attributes.borderStyle,
          aspectRatioLocked: attributes.aspectRatioLocked,
          fitMode: attributes.fitMode,
          altText: attributes.altText,
          caption: attributes.caption,
        },
      });
    }

    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

  // Revert Script and Properties
  const handleRevert = () => {
    if (!shape) return;
    const defaultCode = shape.defaultScript || shape.customData?.defaultScript || generateDefaultShapeScript(shape);
    setCode(defaultCode);
    if (onRevertScript) {
      onRevertScript(shape);
    }
    if (onRevertCustomization) {
      onRevertCustomization(shape);
    }
  };

  // Clear Script Code
  const handleClear = () => {
    if (!shape) return;
    setIsScriptEnabled(false);
    setCode('');
    setSelectedSnippetId('');
    if (onClearScript) {
      onClearScript(shape);
    }
    if (onApplyCustomization) {
      onApplyCustomization(shape, {
        script: null,
        properties,
        attributes,
      });
    }
  };

  if (!isOpen) return null;

  const shapeType = isConnector ? 'Connector' : isFrame ? 'Frame' : isImage ? 'Image' : (shape?.type || 'Rectangle');
  const shapeId = shape?.id ? String(shape.id).slice(0, 8) : 'shape';

  return (
    <div
      data-testid="shape-script-drawer"
      className="fixed inset-y-0 right-0 z-40 flex w-[500px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Drawer Header (Shape Library Drawer styling) */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            {isConnector ? (
              <MoveRight className="w-5 h-5" />
            ) : isFrame ? (
              <Layout className="w-5 h-5" />
            ) : isImage ? (
              <ImageIcon className="w-5 h-5" />
            ) : (
              <Sliders className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Shape Customizer & Script Editor
              </h2>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {shapeType}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Customize visual attributes, canvas scripts & properties
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close customizer"
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 3-Tab Pill Navigation Bar (Attributes 1st -> Script 2nd -> Properties 3rd) */}
      <div className="px-4 pt-3 pb-2 flex gap-1.5 border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900">
        <button
          data-testid="tab-attributes"
          onClick={() => setActiveTab('attributes')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'attributes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Attributes</span>
        </button>
        <button
          data-testid="tab-script"
          onClick={() => setActiveTab('script')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'script'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Script</span>
          {isScriptEnabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          )}
        </button>
        <button
          data-testid="tab-properties"
          onClick={() => setActiveTab('properties')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'properties'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Properties</span>
          {Object.keys(properties).length > 0 && (
            <span
              className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === 'properties'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
              }`}
            >
              {Object.keys(properties).length}
            </span>
          )}
        </button>
      </div>

      {/* Drawer Body - Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Persistent Live Canvas Preview Panel */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Live Sandboxed Preview
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {attributes.width} × {attributes.height} px
            </span>
          </div>
          <div className="relative flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100/70 p-2 shadow-inner dark:border-slate-800 dark:bg-slate-950/40">
            <canvas
              ref={previewCanvasRef}
              data-testid="shape-script-preview-canvas"
              className="max-h-[150px] max-w-full rounded border border-slate-200/60 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ATTRIBUTES TAB (Specific Variants by Shape Category) */}
        {/* ======================================================== */}
        {activeTab === 'attributes' && (
          <div className="space-y-3.5">
            {/* VARIANT A: CONNECTORS & LINES */}
            {isConnector && (
              <div className="space-y-3.5">
                {/* Arrowhead Endpoints & Presets Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <MoveRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Arrowheads & Line Style</span>
                  </span>

                  {/* Quick Direction Presets */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Quick Arrow Presets</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        data-testid="attr-arrow-preset-line"
                        onClick={() => applyArrowPreset('line')}
                        className={`px-2 py-1.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                          attributes.headEndType === 'flat' && attributes.tailEndType === 'flat'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        Line
                      </button>
                      <button
                        type="button"
                        data-testid="attr-arrow-preset-forward"
                        onClick={() => applyArrowPreset('forward')}
                        className={`px-2 py-1.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                          attributes.headEndType !== 'flat' && attributes.tailEndType === 'flat'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        Forward
                      </button>
                      <button
                        type="button"
                        data-testid="attr-arrow-preset-bidirectional"
                        onClick={() => applyArrowPreset('bidirectional')}
                        className={`px-2 py-1.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                          attributes.headEndType !== 'flat' && attributes.tailEndType !== 'flat'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        Bidirectional
                      </button>
                      <button
                        type="button"
                        data-testid="attr-arrow-preset-reverse"
                        onClick={() => applyArrowPreset('reverse')}
                        className={`px-2 py-1.5 text-xs font-medium rounded-lg border text-center transition-colors ${
                          attributes.headEndType === 'flat' && attributes.tailEndType !== 'flat'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        Reverse
                      </button>
                    </div>
                  </div>

                  {/* Tail & Head Endpoints Pickers */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Tail Endpoint</label>
                      <select
                        data-testid="attr-tail-end-select"
                        value={attributes.tailEndType}
                        onChange={(e) => handleAttributeChange('tailEndType', e.target.value as any)}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="flat">None (Flat)</option>
                        <option value="arrow">Open Arrow</option>
                        <option value="solid-arrow">Solid Arrow</option>
                        <option value="triangle">UML Generalization (Triangle)</option>
                        <option value="triangle-filled">UML Realization (Filled Triangle)</option>
                        <option value="diamond">UML Aggregation (Diamond)</option>
                        <option value="diamond-filled">UML Composition (Filled Diamond)</option>
                        <option value="circle">UML Interface (Circle)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Head Endpoint</label>
                      <select
                        data-testid="attr-head-end-select"
                        value={attributes.headEndType}
                        onChange={(e) => handleAttributeChange('headEndType', e.target.value as any)}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="flat">None (Flat)</option>
                        <option value="arrow">Open Arrow</option>
                        <option value="solid-arrow">Solid Arrow</option>
                        <option value="triangle">UML Generalization (Triangle)</option>
                        <option value="triangle-filled">UML Realization (Filled Triangle)</option>
                        <option value="diamond">UML Aggregation (Diamond)</option>
                        <option value="diamond-filled">UML Composition (Filled Diamond)</option>
                        <option value="circle">UML Interface (Circle)</option>
                      </select>
                    </div>
                  </div>

                  {/* Line Pattern / Dash Style */}
                  <div className="pt-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">Line Stroke Pattern</label>
                    <select
                      data-testid="attr-line-style-select"
                      value={attributes.lineStyle}
                      onChange={(e) => handleAttributeChange('lineStyle', e.target.value as any)}
                      className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="solid">Solid Stroke (――――)</option>
                      <option value="dashed">Dashed Pattern (- - - -)</option>
                      <option value="dotted">Dotted Pattern (········)</option>
                    </select>
                  </div>
                </div>

                {/* Stroke Color & Width Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Line Color & Stroke</span>
                  </span>

                  {/* Stroke Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Line Color</label>
                      <span className="font-mono text-[11px] text-slate-500">{attributes.strokeColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        data-testid="attr-stroke-color-input"
                        value={attributes.strokeColor}
                        onChange={(e) => handleAttributeChange('strokeColor', e.target.value)}
                        className="h-8 w-8 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {SWATCH_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            data-testid={`attr-stroke-color-swatch-${c}`}
                            onClick={() => handleAttributeChange('strokeColor', c)}
                            className={`h-5 w-5 rounded-full border border-slate-300 shadow-2xs transition-transform hover:scale-110 cursor-pointer ${
                              attributes.strokeColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-500' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stroke Width Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Line Width</label>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {attributes.strokeWidth} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={16}
                      data-testid="attr-stroke-width-slider"
                      value={attributes.strokeWidth}
                      onChange={(e) => handleAttributeChange('strokeWidth', Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Opacity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Line Opacity</label>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {Math.round(attributes.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      data-testid="attr-opacity-slider"
                      value={attributes.opacity}
                      onChange={(e) => handleAttributeChange('opacity', Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VARIANT B: FRAMES */}
            {isFrame && (
              <div className="space-y-3.5">
                {/* Frame Title & Presets Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Layout className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Frame Container & Device Presets</span>
                  </span>

                  {/* Frame Title */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Frame Title / Header</label>
                    <input
                      type="text"
                      data-testid="attr-frame-title-input"
                      value={attributes.title}
                      onChange={(e) => handleAttributeChange('title', e.target.value)}
                      placeholder="e.g. User Journey Flow"
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Device Size Presets */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Device Size Presets</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        data-testid="attr-device-preset-desktop"
                        onClick={() => applyDevicePreset('desktop')}
                        className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Monitor className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Desktop</span>
                      </button>
                      <button
                        type="button"
                        data-testid="attr-device-preset-laptop"
                        onClick={() => applyDevicePreset('laptop')}
                        className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Monitor className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Laptop</span>
                      </button>
                      <button
                        type="button"
                        data-testid="attr-device-preset-tablet"
                        onClick={() => applyDevicePreset('tablet')}
                        className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Tablet className="w-3.5 h-3.5 text-teal-600" />
                        <span>Tablet</span>
                      </button>
                      <button
                        type="button"
                        data-testid="attr-device-preset-mobile"
                        onClick={() => applyDevicePreset('mobile')}
                        className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mobile</span>
                      </button>
                      <button
                        type="button"
                        data-testid="attr-device-preset-a4"
                        onClick={() => applyDevicePreset('a4')}
                        className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>A4 Doc</span>
                      </button>
                      <button
                        type="button"
                        data-testid="attr-device-preset-square"
                        onClick={() => applyDevicePreset('square')}
                        className="px-2 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        <Square className="w-3.5 h-3.5 text-purple-600" />
                        <span>Square</span>
                      </button>
                    </div>
                  </div>

                  {/* Dimensions Input */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Width (px)</label>
                      <input
                        type="number"
                        min={50}
                        max={10000}
                        step="0.1"
                        data-testid="attr-width-input"
                        value={attributes.width}
                        onChange={(e) => handleAttributeChange('width', Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Height (px)</label>
                      <input
                        type="number"
                        min={50}
                        max={10000}
                        step="0.1"
                        data-testid="attr-height-input"
                        value={attributes.height}
                        onChange={(e) => handleAttributeChange('height', Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Frame Styling & Colors Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Frame Fill, Border & Radius</span>
                  </span>

                  {/* Fill Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Container Background</label>
                      <span className="font-mono text-[11px] text-slate-500">{attributes.fillColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        data-testid="attr-fill-color-input"
                        value={attributes.fillColor}
                        onChange={(e) => handleAttributeChange('fillColor', e.target.value)}
                        className="h-8 w-8 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {SWATCH_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            data-testid={`attr-fill-color-swatch-${c}`}
                            onClick={() => handleAttributeChange('fillColor', c)}
                            className={`h-5 w-5 rounded-full border border-slate-300 shadow-2xs transition-transform hover:scale-110 cursor-pointer ${
                              attributes.fillColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-500' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stroke Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Border Stroke Color</label>
                      <span className="font-mono text-[11px] text-slate-500">{attributes.strokeColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        data-testid="attr-stroke-color-input"
                        value={attributes.strokeColor}
                        onChange={(e) => handleAttributeChange('strokeColor', e.target.value)}
                        className="h-8 w-8 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {SWATCH_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            data-testid={`attr-stroke-color-swatch-${c}`}
                            onClick={() => handleAttributeChange('strokeColor', c)}
                            className={`h-5 w-5 rounded-full border border-slate-300 shadow-2xs transition-transform hover:scale-110 cursor-pointer ${
                              attributes.strokeColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-500' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Corner Radius & Border Style */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-600 dark:text-slate-400">Corner Radius</label>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{attributes.cornerRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        data-testid="attr-corner-radius-slider"
                        value={attributes.cornerRadius}
                        onChange={(e) => handleAttributeChange('cornerRadius', Number(e.target.value))}
                        className="w-full mt-1.5 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Border Style</label>
                      <select
                        data-testid="attr-border-style-select"
                        value={attributes.borderStyle}
                        onChange={(e) => handleAttributeChange('borderStyle', e.target.value as any)}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="solid">Solid Border</option>
                        <option value="dashed">Dashed Border</option>
                      </select>
                    </div>
                  </div>

                  {/* Stroke Width */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Border Width</label>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {attributes.strokeWidth} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={16}
                      data-testid="attr-stroke-width-slider"
                      value={attributes.strokeWidth}
                      onChange={(e) => handleAttributeChange('strokeWidth', Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* VARIANT C: IMAGES */}
            {isImage && (
              <div className="space-y-3.5">
                {/* Dimensions & Scaling Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      <ImageIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Image Sizing & Aspect Ratio</span>
                    </span>
                    <button
                      type="button"
                      data-testid="attr-aspect-ratio-lock-btn"
                      onClick={() => handleAttributeChange('aspectRatioLocked', !attributes.aspectRatioLocked)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        attributes.aspectRatioLocked
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                      title={attributes.aspectRatioLocked ? 'Aspect Ratio Locked' : 'Aspect Ratio Unlocked'}
                    >
                      {attributes.aspectRatioLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      <span>{attributes.aspectRatioLocked ? 'Locked' : 'Unlocked'}</span>
                    </button>
                  </div>

                  {/* Dimensions Input */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Width (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        step="0.1"
                        data-testid="attr-width-input"
                        value={attributes.width}
                        onChange={(e) => handleAttributeChange('width', Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Height (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        step="0.1"
                        data-testid="attr-height-input"
                        value={attributes.height}
                        onChange={(e) => handleAttributeChange('height', Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Scale Presets */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Quick Scale Presets</label>
                    <div className="grid grid-cols-6 gap-1">
                      {[25, 50, 75, 100, 200].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          data-testid={`attr-scale-preset-${pct}`}
                          onClick={() => applyImageScalePreset(pct)}
                          className="px-1.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-center cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {pct}%
                        </button>
                      ))}
                      <button
                        type="button"
                        data-testid="attr-scale-preset-reset"
                        onClick={() => applyImageScalePreset(100)}
                        className="px-1.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-indigo-600 hover:bg-indigo-50 text-center cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400"
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Fit Mode */}
                  <div className="pt-1">
                    <label className="text-[11px] text-slate-600 dark:text-slate-400">Image Fit Mode</label>
                    <select
                      data-testid="attr-fit-mode-select"
                      value={attributes.fitMode}
                      onChange={(e) => handleAttributeChange('fitMode', e.target.value as any)}
                      className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="contain">Contain (Scale within bounds)</option>
                      <option value="cover">Cover (Fill & clip edges)</option>
                      <option value="fill">Fill / Stretch</option>
                    </select>
                  </div>
                </div>

                {/* Image Border, Radius & Opacity Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Border, Corner Radius & Opacity</span>
                  </span>

                  {/* Border Stroke Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Border Color</label>
                      <span className="font-mono text-[11px] text-slate-500">{attributes.strokeColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        data-testid="attr-stroke-color-input"
                        value={attributes.strokeColor}
                        onChange={(e) => handleAttributeChange('strokeColor', e.target.value)}
                        className="h-8 w-8 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {SWATCH_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            data-testid={`attr-stroke-color-swatch-${c}`}
                            onClick={() => handleAttributeChange('strokeColor', c)}
                            className={`h-5 w-5 rounded-full border border-slate-300 shadow-2xs transition-transform hover:scale-110 cursor-pointer ${
                              attributes.strokeColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-500' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Corner Radius & Border Style */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-600 dark:text-slate-400">Corner Radius</label>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{attributes.cornerRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        data-testid="attr-corner-radius-slider"
                        value={attributes.cornerRadius}
                        onChange={(e) => handleAttributeChange('cornerRadius', Number(e.target.value))}
                        className="w-full mt-1.5 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Border Style</label>
                      <select
                        data-testid="attr-border-style-select"
                        value={attributes.borderStyle}
                        onChange={(e) => handleAttributeChange('borderStyle', e.target.value as any)}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="solid">Solid Border</option>
                        <option value="dashed">Dashed Border</option>
                      </select>
                    </div>
                  </div>

                  {/* Border Width & Opacity */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-600 dark:text-slate-400">Border Width</label>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{attributes.strokeWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={16}
                        data-testid="attr-stroke-width-slider"
                        value={attributes.strokeWidth}
                        onChange={(e) => handleAttributeChange('strokeWidth', Number(e.target.value))}
                        className="w-full mt-1.5 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-600 dark:text-slate-400">Opacity</label>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{Math.round(attributes.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        data-testid="attr-opacity-slider"
                        value={attributes.opacity}
                        onChange={(e) => handleAttributeChange('opacity', Number(e.target.value))}
                        className="w-full mt-1.5 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Alt Text & Caption */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Alt Text / Accessibility</label>
                      <input
                        type="text"
                        data-testid="attr-image-alt-input"
                        value={attributes.altText}
                        onChange={(e) => handleAttributeChange('altText', e.target.value)}
                        placeholder="Description of image for accessibility..."
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Image Caption</label>
                      <input
                        type="text"
                        data-testid="attr-image-caption-input"
                        value={attributes.caption}
                        onChange={(e) => handleAttributeChange('caption', e.target.value)}
                        placeholder="Visible caption under image..."
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VARIANT D: STANDARD SHAPES (Rectangles, Ellipses, Text, Stencils) */}
            {!isConnector && !isFrame && !isImage && (
              <div className="space-y-3.5">
                {/* Dimensions Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Maximize2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Dimensions & Geometry</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Width (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={3000}
                        step="0.1"
                        data-testid="attr-width-input"
                        value={attributes.width}
                        onChange={(e) => handleAttributeChange('width', Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Height (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={3000}
                        step="0.1"
                        data-testid="attr-height-input"
                        value={attributes.height}
                        onChange={(e) => handleAttributeChange('height', Number(e.target.value))}
                        className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  {/* Corner Radius (for Rectangles) */}
                  {isRectangle && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-slate-600 dark:text-slate-400">Corner Radius</label>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{attributes.cornerRadius}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={48}
                        data-testid="attr-corner-radius-slider"
                        value={attributes.cornerRadius}
                        onChange={(e) => handleAttributeChange('cornerRadius', Number(e.target.value))}
                        className="w-full mt-1.5 accent-indigo-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Colors Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Palette className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Fill & Stroke Colors</span>
                  </span>

                  {/* Fill Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Fill Color</label>
                      <span className="font-mono text-[11px] text-slate-500">{attributes.fillColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        data-testid="attr-fill-color-input"
                        value={attributes.fillColor}
                        onChange={(e) => handleAttributeChange('fillColor', e.target.value)}
                        className="h-8 w-8 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {SWATCH_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            data-testid={`attr-fill-color-swatch-${c}`}
                            onClick={() => handleAttributeChange('fillColor', c)}
                            className={`h-5 w-5 rounded-full border border-slate-300 shadow-2xs transition-transform hover:scale-110 cursor-pointer ${
                              attributes.fillColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-500' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stroke Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Stroke Color</label>
                      <span className="font-mono text-[11px] text-slate-500">{attributes.strokeColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        data-testid="attr-stroke-color-input"
                        value={attributes.strokeColor}
                        onChange={(e) => handleAttributeChange('strokeColor', e.target.value)}
                        className="h-8 w-8 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {SWATCH_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            data-testid={`attr-stroke-color-swatch-${c}`}
                            onClick={() => handleAttributeChange('strokeColor', c)}
                            className={`h-5 w-5 rounded-full border border-slate-300 shadow-2xs transition-transform hover:scale-110 cursor-pointer ${
                              attributes.strokeColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-500' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stroke Width */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Stroke Width</label>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {attributes.strokeWidth} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={16}
                      data-testid="attr-stroke-width-slider"
                      value={attributes.strokeWidth}
                      onChange={(e) => handleAttributeChange('strokeWidth', Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Typography Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Typography & Text Styling</span>
                  </span>

                  {/* Font Size */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Font Size (px)</label>
                      <span className="font-mono text-[11px] text-slate-500">{attributes.fontSize}px</span>
                    </div>
                    <input
                      type="number"
                      min={8}
                      max={72}
                      data-testid="attr-font-size-input"
                      value={attributes.fontSize}
                      onChange={(e) => handleAttributeChange('fontSize', Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    />
                  </div>

                  {/* Font Color */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Font Color</label>
                      <span className="font-mono text-[11px] text-slate-500">{attributes.fontColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        data-testid="attr-font-color-input"
                        value={attributes.fontColor}
                        onChange={(e) => handleAttributeChange('fontColor', e.target.value)}
                        className="h-8 w-8 rounded border border-slate-300 cursor-pointer p-0.5"
                      />
                      <div className="flex flex-wrap gap-1 flex-1">
                        {SWATCH_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            data-testid={`attr-font-color-swatch-${c}`}
                            onClick={() => handleAttributeChange('fontColor', c)}
                            className={`h-5 w-5 rounded-full border border-slate-300 shadow-2xs transition-transform hover:scale-110 cursor-pointer ${
                              attributes.fontColor.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-indigo-500' : ''
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Opacity Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Layer Opacity</span>
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-slate-600 dark:text-slate-400">Opacity</label>
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {Math.round(attributes.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      data-testid="attr-opacity-slider"
                      value={attributes.opacity}
                      onChange={(e) => handleAttributeChange('opacity', Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SCRIPT TAB (Snippets, Monospace Editor & Sandbox) */}
        {/* ======================================================== */}
        {activeTab === 'script' && (
          <div className="space-y-4">
            {/* Custom Script Status / Enable Banner */}
            {!isScriptEnabled ? (
              <div
                data-testid="script-disabled-banner"
                className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200"
              >
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    <strong>Custom Draw Script Disabled.</strong> Shape uses standard geometric rendering.
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="enable-script-btn"
                  onClick={() => setIsScriptEnabled(true)}
                  className="shrink-0 rounded bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                >
                  Enable Script
                </button>
              </div>
            ) : (
              <div
                data-testid="script-enabled-banner"
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>Custom Script Active.</strong> Canvas executes custom 2D draw script.
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="disable-script-btn"
                  onClick={() => setIsScriptEnabled(false)}
                  className="shrink-0 rounded bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300 cursor-pointer dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Disable Script
                </button>
              </div>
            )}

            {/* Starter Snippets Selector */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Template Stencil Snippets</span>
              </label>
              <select
                data-testid="snippet-select"
                value={selectedSnippetId}
                onChange={(e) => handleSelectSnippet(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">-- Choose starter snippet template --</option>
                <optgroup label="Connectors & Flows">
                  {SCRIPT_SNIPPETS.filter((s) => s.category === 'Connectors & Flows').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Frames & Layout">
                  {SCRIPT_SNIPPETS.filter((s) => s.category === 'Frames & Layout').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Images & Media">
                  {SCRIPT_SNIPPETS.filter((s) => s.category === 'Images & Media').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.description}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Metrics, Architecture & Process">
                  {SCRIPT_SNIPPETS.filter(
                    (s) => !['Connectors & Flows', 'Frames & Layout', 'Images & Media'].includes(s.category)
                  ).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.description}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Monospace Code Editor Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Canvas2D Draw Routine <span className="text-slate-400 font-normal">function(ctx, shape)</span>
                </label>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center space-x-1 rounded px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="h-3 w-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Editor Container */}
              <div className="relative flex h-[280px] w-full rounded-xl border border-slate-300 bg-slate-50 font-mono text-xs text-slate-800 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {/* Line Gutter */}
                <div
                  ref={lineGutterRef}
                  className="select-none overflow-hidden border-r border-slate-200 bg-slate-100 px-2 py-3 text-right text-slate-400 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-500"
                  style={{ minWidth: '38px' }}
                >
                  {lineNumbers.map((num) => (
                    <div key={num} className="leading-5">
                      {num}
                    </div>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  data-testid="shape-script-textarea"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (!isScriptEnabled) {
                      setIsScriptEnabled(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onScroll={handleScroll}
                  spellCheck={false}
                  placeholder="// Enter Canvas2D JavaScript drawing code here..."
                  className="h-full w-full resize-none bg-transparent p-3 leading-5 text-slate-800 focus:outline-none dark:text-slate-100"
                  style={{ tabSize: 2 }}
                />
              </div>
            </div>

            {/* Error Diagnostic Banner */}
            {error && (
              <div
                data-testid="script-error-banner"
                className="flex items-start space-x-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <div className="flex-1 overflow-hidden">
                  <div className="font-semibold">Script Execution Warning:</div>
                  <div className="mt-0.5 font-mono text-[11px] break-words">{error}</div>
                </div>
              </div>
            )}

            {/* Collapsible API & Parameter Cheat-sheet */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-2xs dark:border-slate-700 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setShowCheatSheet(!showCheatSheet)}
                className="flex w-full items-center justify-between font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 cursor-pointer"
              >
                <span className="flex items-center space-x-1.5">
                  <Info className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Canvas2D API & Shape Properties Helper</span>
                </span>
                {showCheatSheet ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {showCheatSheet && (
                <div className="mt-2.5 space-y-2 border-t border-slate-200/60 pt-2 text-slate-600 dark:border-slate-800 dark:text-slate-400">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Execution Arguments:</span>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 font-mono text-[11px]">
                      <li>ctx : CanvasRenderingContext2D (draws at local 0,0)</li>
                      <li>shape.width, shape.height : Dimensions in px</li>
                      <li>shape.fillColor, shape.strokeColor, shape.strokeWidth</li>
                      <li>shape.properties : Custom metadata key-value pairs</li>
                      <li>shape.headEndType, shape.tailEndType, shape.lineStyle</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Common Canvas Methods:</span>
                    <p className="mt-0.5 font-mono text-[11px]">
                      ctx.beginPath(), ctx.roundRect(0, 0, w, h, r), ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2),
                      ctx.fill(), ctx.stroke(), ctx.fillText(str, x, y), ctx.setLineDash([8, 6])
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PROPERTIES TAB (Dynamic Domain Metadata Key-Values) */}
        {/* ======================================================== */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {/* Quick Preset Badges */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Quick Preset Property Fields
              </label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(PROPERTY_PRESETS)
                  .filter(([_, preset]) => {
                    if (isConnector) return preset.category === 'connector' || preset.category === 'general';
                    if (isFrame) return preset.category === 'frame' || preset.category === 'general';
                    if (isImage) return preset.category === 'image' || preset.category === 'general';
                    return preset.category === 'general';
                  })
                  .map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      data-testid={`preset-prop-${key}`}
                      onClick={() => handleApplyPresetProperty(key)}
                      className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ {preset.label}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Custom Properties List */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Custom Properties ({Object.keys(properties).length})
              </label>

              {Object.keys(properties).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <Tag className="mx-auto h-6 w-6 text-slate-400 mb-1.5 opacity-60" />
                  <p>No custom properties defined on this shape.</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Use presets above or add custom key-value pairs below.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(properties).map(([key, val]) => (
                    <div
                      key={key}
                      data-testid={`property-row-${key}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {key}
                        </span>
                        <button
                          type="button"
                          data-testid={`delete-prop-${key}`}
                          onClick={() => handleDeleteProperty(key)}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          title="Delete property"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Render appropriate property editor by type */}
                      {typeof val === 'boolean' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handlePropertyChange(key, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {val ? 'True' : 'False'}
                          </span>
                        </div>
                      ) : Array.isArray(val) ? (
                        <textarea
                          rows={2}
                          value={val.join('\n')}
                          onChange={(e) =>
                            handlePropertyChange(
                              key,
                              e.target.value
                                .split('\n')
                                .map((s) => s.trim())
                                .filter(Boolean)
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      ) : (
                        <input
                          type={typeof val === 'number' ? 'number' : 'text'}
                          value={val ?? ''}
                          onChange={(e) =>
                            handlePropertyChange(
                              key,
                              typeof val === 'number' ? Number(e.target.value) : e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Property Form */}
            <form
              onSubmit={handleAddProperty}
              className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs space-y-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800/80"
            >
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                <Plus className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Add Custom Property</span>
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 dark:text-slate-400">Key Name</label>
                  <input
                    type="text"
                    data-testid="property-key-input"
                    value={newPropKey}
                    onChange={(e) => setNewPropKey(e.target.value)}
                    placeholder="e.g. latency, status"
                    className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 dark:text-slate-400">Value Type</label>
                  <select
                    data-testid="property-type-select"
                    value={newPropType}
                    onChange={(e) => setNewPropType(e.target.value as any)}
                    className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="array">Array (Lines)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 dark:text-slate-400">Initial Value</label>
                {newPropType === 'boolean' ? (
                  <select
                    value={newPropValue}
                    onChange={(e) => setNewPropValue(e.target.value)}
                    className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : newPropType === 'array' ? (
                  <textarea
                    rows={2}
                    value={newPropValue}
                    onChange={(e) => setNewPropValue(e.target.value)}
                    placeholder="Enter each item on a new line..."
                    className="w-full mt-1 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                ) : (
                  <input
                    type={newPropType === 'number' ? 'number' : 'text'}
                    data-testid="property-value-input"
                    value={newPropValue}
                    onChange={(e) => setNewPropValue(e.target.value)}
                    placeholder="Enter value..."
                    className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!newPropKey.trim()}
                  data-testid="add-property-btn"
                  className="flex items-center space-x-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Property</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Drawer Action Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRevert}
            type="button"
            data-testid="revert-script-btn"
            title="Revert to original state"
            className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            <span>Revert</span>
          </button>

          <button
            onClick={handleClear}
            type="button"
            data-testid="clear-script-btn"
            title="Clear script code"
            className="flex items-center space-x-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 hover:text-red-700 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Script</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            type="button"
            data-testid="apply-script-btn"
            className={`flex items-center space-x-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer ${
              isSavedRecently
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1'
            }`}
          >
            {isSavedRecently ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Applied!</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Apply Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
