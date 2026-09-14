import { StencilCategory, StencilCollection, StencilItem } from '../types/shapeLibrary';

// Helper drawing scripts for reusable Canvas2D shape rendering
export const DRAW_SCRIPTS = {
  // UML Class Box with 3 distinct compartments: Header, Attributes, Operations
  umlClassBox: `function draw(ctx, shape) {
    const w = shape.width || 220;
    const h = shape.height || 170;
    const r = 6;
    const props = shape.properties || {};
    const className = props.className || 'UserAccount';
    const stereotype = props.stereotype || '<<Entity>>';
    const attributes = props.attributes || ['- id: UUID', '- email: String', '- role: UserRole'];
    const methods = props.methods || ['+ hasPermission(): Boolean', '+ updateProfile(): void'];

    ctx.save();
    // Background and border
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, w, h, r);
    } else {
      ctx.rect(0, 0, w, h);
    }
    ctx.fillStyle = shape.fillColor || '#ffffff';
    ctx.fill();
    ctx.strokeStyle = shape.strokeColor || '#334155';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.stroke();

    // Header Compartment Background
    const headerHeight = 44;
    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, w, headerHeight, [r, r, 0, 0]);
    } else {
      ctx.rect(0, 0, w, headerHeight);
    }
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.restore();

    // Header Divider
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(w, headerHeight);
    ctx.strokeStyle = shape.strokeColor || '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 11px Roboto, sans-serif';
    ctx.fillText(stereotype, w / 2, 14);

    ctx.fillStyle = shape.fontColor || '#0f172a';
    ctx.font = 'bold 13px Roboto, sans-serif';
    ctx.fillText(className, w / 2, 30);

    // Attributes Compartment
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '11px Roboto, sans-serif';
    ctx.fillStyle = '#334155';
    let attrY = headerHeight + 8;
    for (let i = 0; i < attributes.length; i++) {
      if (attrY + 14 < h - 40) {
        ctx.fillText(attributes[i], 12, attrY);
        attrY += 16;
      }
    }

    // Methods Divider
    const methodsDividerY = Math.max(headerHeight + 56, attrY + 4);
    ctx.beginPath();
    ctx.moveTo(0, methodsDividerY);
    ctx.lineTo(w, methodsDividerY);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Methods Compartment
    let methodY = methodsDividerY + 8;
    for (let i = 0; i < methods.length; i++) {
      if (methodY + 14 < h) {
        ctx.fillText(methods[i], 12, methodY);
        methodY += 16;
      }
    }
    ctx.restore();
  }`,

  // Database Cylinder Node with 3D perspective and status indicators
  databaseCylinder: `function draw(ctx, shape) {
    const w = shape.width || 140;
    const h = shape.height || 100;
    const ry = Math.min(20, h * 0.18);
    const props = shape.properties || {};
    const title = props.title || 'Database';
    const sub = props.subtitle || 'PostgreSQL';

    ctx.save();
    // Bottom Ellipse & Cylinder Body
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(0, h - ry);
    ctx.ellipse(w / 2, h - ry, w / 2, ry, 0, 0, Math.PI, false);
    ctx.lineTo(w, ry);
    ctx.ellipse(w / 2, ry, w / 2, ry, 0, 0, Math.PI, false);
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
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.fillText(title, w / 2, h / 2 - 2);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Roboto, sans-serif';
    ctx.fillText(sub, w / 2, h / 2 + 13);
    ctx.restore();
  }`,

  // Cloud VPC / Subnet Boundary with multi-curved lobes
  cloudBoundary: `function draw(ctx, shape) {
    const w = shape.width || 420;
    const h = shape.height || 220;
    const props = shape.properties || {};
    const label = props.label || 'VPC / Cloud Boundary';

    ctx.save();
    // Draw cloud-shaped border
    ctx.beginPath();
    const r = 24;
    ctx.moveTo(r, 0);
    ctx.lineTo(w - r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h - r);
    ctx.quadraticCurveTo(w, h, w - r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();

    ctx.fillStyle = shape.fillColor || 'rgba(59, 130, 246, 0.05)';
    ctx.fill();
    ctx.strokeStyle = shape.strokeColor || '#3b82f6';
    ctx.lineWidth = shape.strokeWidth || 1.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Cloud icon and header badge
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('☁️ ' + label, 16, 14);
    ctx.restore();
  }`,

  // Server Blade Rack with drive bays and status LEDs
  serverBladeRack: `function draw(ctx, shape) {
    const w = shape.width || 180;
    const h = shape.height || 140;
    const props = shape.properties || {};
    const label = props.label || 'Compute Node';
    const status = props.status || 'ONLINE';

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, w, h, 6);
    } else {
      ctx.rect(0, 0, w, h);
    }
    ctx.fillStyle = shape.fillColor || '#1e293b';
    ctx.fill();
    ctx.strokeStyle = shape.strokeColor || '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Server Unit Slots
    const slotCount = 3;
    const slotH = (h - 36) / slotCount;
    for (let i = 0; i < slotCount; i++) {
      const sy = 12 + i * slotH;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(10, sy, w - 20, slotH - 4);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(10, sy, w - 20, slotH - 4);

      // Status LED
      ctx.beginPath();
      ctx.arc(20, sy + (slotH - 4) / 2, 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = (i === 0 && status === 'ONLINE') ? '#22c55e' : '#38bdf8';
      ctx.fill();

      // Drive Slots
      for (let d = 0; d < 4; d++) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(35 + d * 16, sy + 5, 12, slotH - 14);
      }
    }

    // Label at bottom
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px Roboto, sans-serif';
    ctx.fillText(label, w / 2, h - 4);
    ctx.restore();
  }`,

  // Agile User Story Card with persona, status pill, and estimation badge
  agileStoryCard: `function draw(ctx, shape) {
    const w = shape.width || 280;
    const h = shape.height || 180;
    const props = shape.properties || {};
    const code = props.code || 'US-101';
    const title = props.title || 'User Authentication';
    const persona = props.persona || 'As a User';
    const goal = props.goal || 'I want to sign in with SSO';
    const value = props.value || 'So that I access my boards quickly';
    const points = props.points || '5';
    const status = props.status || 'IN PROGRESS';

    ctx.save();
    // Card container
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, w, h, 8);
    } else {
      ctx.rect(0, 0, w, h);
    }
    ctx.fillStyle = shape.fillColor || '#fefce8';
    ctx.fill();
    ctx.strokeStyle = shape.strokeColor || '#eab308';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.stroke();

    // Top Header / Code
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#854d0e';
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.fillText(code + ': ' + title, 14, 20);

    // Status Tag Pill
    const tagW = 85;
    const tagH = 18;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(14, 34, tagW, tagH, 9);
    } else {
      ctx.rect(14, 34, tagW, tagH);
    }
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.fillStyle = '#713f12';
    ctx.font = 'bold 9px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(status, 14 + tagW / 2, 43);

    // Points Circle Badge (top-right)
    ctx.beginPath();
    ctx.arc(w - 24, 24, 15, 0, 2 * Math.PI);
    ctx.fillStyle = '#eab308';
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(points, w - 24, 24);

    // Divider
    ctx.beginPath();
    ctx.moveTo(14, 60);
    ctx.lineTo(w - 14, 60);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Body Text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#713f12';
    ctx.font = '500 12px Roboto, sans-serif';
    ctx.fillText('👤 ' + persona, 14, 72);
    ctx.fillText('🎯 ' + goal, 14, 96);
    ctx.fillText('💡 ' + value, 14, 120);
    ctx.restore();
  }`,

  // Agile Mood & Confidence Meter
  agileMoodMeter: `function draw(ctx, shape) {
    const w = shape.width || 320;
    const h = shape.height || 80;
    const props = shape.properties || {};
    const selectedLevel = props.level || 4;

    ctx.save();
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, w, h, 8);
    } else {
      ctx.rect(0, 0, w, h);
    }
    ctx.fillStyle = shape.fillColor || '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = shape.strokeColor || '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px Roboto, sans-serif';
    ctx.fillText('Sprint Confidence & Health:', 14, 10);

    const levels = [
      { num: 1, label: '😟', color: '#fee2e2', border: '#ef4444' },
      { num: 2, label: '😐', color: '#ffedd5', border: '#f97316' },
      { num: 3, label: '🙂', color: '#fef3c7', border: '#f59e0b' },
      { num: 4, label: '😄', color: '#dcfce7', border: '#22c55e' },
      { num: 5, label: '🚀', color: '#e0e7ff', border: '#6366f1' },
    ];

    const circleR = 17;
    const spacing = (w - 40) / levels.length;

    levels.forEach((lvl, i) => {
      const cx = 28 + i * spacing;
      const cy = 48;
      ctx.beginPath();
      ctx.arc(cx, cy, circleR, 0, 2 * Math.PI);
      ctx.fillStyle = lvl.color;
      ctx.fill();
      ctx.strokeStyle = lvl.border;
      ctx.lineWidth = lvl.num === selectedLevel ? 3 : 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '12px Roboto, sans-serif';
      ctx.fillText(lvl.label, cx, cy);
    });
    ctx.restore();
  }`,

  // UI Interactive Toggle Switch
  uiToggleSwitch: `function draw(ctx, shape) {
    const w = shape.width || 120;
    const h = shape.height || 48;
    const props = shape.properties || {};
    const isChecked = props.checked !== false;
    const label = props.label || (isChecked ? 'ON' : 'OFF');

    ctx.save();
    const pillW = 60;
    const pillH = 32;
    const pillX = 8;
    const pillY = (h - pillH) / 2;
    const r = pillH / 2;

    // Track Capsule
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pillX, pillY, pillW, pillH, r);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = isChecked ? (shape.fillColor || '#2563eb') : '#e2e8f0';
    ctx.fill();
    ctx.strokeStyle = isChecked ? (shape.strokeColor || '#1d4ed8') : '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Knob Circle
    const knobR = r - 3;
    const knobX = isChecked ? (pillX + pillW - r) : (pillX + r);
    const knobY = pillY + r;
    ctx.beginPath();
    ctx.arc(knobX, knobY, knobR, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text Label
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isChecked ? '#1e293b' : '#64748b';
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.fillText(label, pillX + pillW + 12, h / 2);
    ctx.restore();
  }`,

  // UI Wireframe Progress Bar
  uiProgressBar: `function draw(ctx, shape) {
    const w = shape.width || 240;
    const h = shape.height || 54;
    const props = shape.properties || {};
    const progress = Math.min(100, Math.max(0, props.progress ?? 75));
    const title = props.title || 'Storage Used';

    ctx.save();
    // Title & Percent text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#334155';
    ctx.font = '500 12px Roboto, sans-serif';
    ctx.fillText(title, 4, 4);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 12px Roboto, sans-serif';
    ctx.fillText(progress + '%', w - 4, 4);

    // Track Bar
    const trackY = 26;
    const trackH = 16;
    const trackR = 8;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(4, trackY, w - 8, trackH, trackR);
    } else {
      ctx.rect(4, trackY, w - 8, trackH);
    }
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Fill Bar
    const fillW = Math.max(trackR * 2, (w - 8) * (progress / 100));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(4, trackY, fillW, trackH, trackR);
    } else {
      ctx.rect(4, trackY, fillW, trackH);
    }
    ctx.fillStyle = shape.fillColor || '#3b82f6';
    ctx.fill();
    ctx.restore();
  }`,

  // UI Search Input with Vector Magnifier
  uiSearchBar: `function draw(ctx, shape) {
    const w = shape.width || 280;
    const h = shape.height || 44;
    const props = shape.properties || {};
    const placeholder = props.placeholder || 'Search stencils & shapes...';

    ctx.save();
    // Input Container
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, w, h, 6);
    } else {
      ctx.rect(0, 0, w, h);
    }
    ctx.fillStyle = shape.fillColor || '#ffffff';
    ctx.fill();
    ctx.strokeStyle = shape.strokeColor || '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Magnifying Glass Icon
    const iconX = 18;
    const iconY = h / 2 - 2;
    const iconR = 5;
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, 2 * Math.PI);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(iconX + 3.5, iconY + 3.5);
    ctx.lineTo(iconX + 8, iconY + 8);
    ctx.stroke();

    // Placeholder Text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Roboto, sans-serif';
    ctx.fillText(placeholder, 36, h / 2);
    ctx.restore();
  }`,

  // BPMN Gateway Decision Diamond
  bpmnGateway: `function draw(ctx, shape) {
    const w = shape.width || 120;
    const h = shape.height || 100;
    const props = shape.properties || {};
    const type = props.gatewayType || 'EXCLUSIVE'; // EXCLUSIVE (X), PARALLEL (+), INCLUSIVE (O)
    const label = props.label || 'Decision?';

    ctx.save();
    // Diamond Path
    ctx.beginPath();
    ctx.moveTo(w / 2, 4);
    ctx.lineTo(w - 4, h / 2);
    ctx.lineTo(w / 2, h - 4);
    ctx.lineTo(4, h / 2);
    ctx.closePath();
    ctx.fillStyle = shape.fillColor || '#fef3c7';
    ctx.fill();
    ctx.strokeStyle = shape.strokeColor || '#d97706';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.stroke();

    // Gateway Marker
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    const cx = w / 2;
    const cy = h / 2;
    const s = 10;
    if (type === 'EXCLUSIVE') {
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s);
      ctx.lineTo(cx + s, cy + s);
      ctx.moveTo(cx + s, cy - s);
      ctx.lineTo(cx - s, cy + s);
      ctx.stroke();
    } else if (type === 'PARALLEL') {
      ctx.beginPath();
      ctx.moveTo(cx - s, cy);
      ctx.lineTo(cx + s, cy);
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx, cy + s);
      ctx.stroke();
    }

    // Label below or center
    if (label) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#92400e';
      ctx.font = 'bold 11px Roboto, sans-serif';
      ctx.fillText(label, w / 2, h + 2);
    }
    ctx.restore();
  }`,

  // BPMN Event Trigger (Start / Intermediate / End)
  bpmnEvent: `function draw(ctx, shape) {
    const w = shape.width || 70;
    const h = shape.height || 70;
    const r = Math.min(w, h) / 2 - 4;
    const cx = w / 2;
    const cy = h / 2;
    const props = shape.properties || {};
    const eventType = props.eventType || 'START'; // START, END, MESSAGE

    ctx.save();
    // Outer Circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = shape.fillColor || (eventType === 'START' ? '#dcfce7' : '#fee2e2');
    ctx.fill();
    ctx.strokeStyle = shape.strokeColor || (eventType === 'START' ? '#16a34a' : '#dc2626');
    ctx.lineWidth = eventType === 'END' ? 3.5 : 2;
    ctx.stroke();

    // Inner Ring for Intermediate
    if (eventType === 'INTERMEDIATE') {
      ctx.beginPath();
      ctx.arc(cx, cy, r - 4, 0, 2 * Math.PI);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Centered icon/text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = eventType === 'START' ? '#166534' : '#991b1b';
    ctx.font = 'bold 10px Roboto, sans-serif';
    ctx.fillText(props.label || eventType, cx, cy);
    ctx.restore();
  }`,
};

export const PREBUILT_STENCIL_COLLECTIONS: StencilCollection[] = [
  {
    id: 'prebuilt-agile-sprint',
    name: 'Agile & Sprint Teams',
    description: 'User stories, retrospective boards, planning poker chips, sprint goals, and blocker flags',
    categories: [StencilCategory.AGILE_SPRINT],
    isPrebuilt: true,
    stencils: [
      {
        id: 'agile-story-card',
        name: 'User Story Card',
        category: StencilCategory.AGILE_SPRINT,
        description: 'Parametric user story card with persona, goal, value, and estimation points badge',
        width: 280,
        height: 180,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 0,
            width: 280,
            height: 180,
            script: DRAW_SCRIPTS.agileStoryCard,
            properties: {
              code: 'US-101',
              title: 'User Authentication',
              persona: 'As a User',
              goal: 'I want to sign in with SSO',
              value: 'So that I access my boards quickly',
              points: '5',
              status: 'IN PROGRESS',
            },
            fillColor: '#fefce8',
            strokeColor: '#eab308',
            strokeWidth: 2,
            fontColor: '#713f12',
          },
        ],
      },
      {
        id: 'agile-planning-poker-set',
        name: 'Planning Poker Badges',
        category: StencilCategory.AGILE_SPRINT,
        description: 'Fibonacci estimation badges (1, 2, 3, 5, 8, 13)',
        width: 320,
        height: 50,
        shapes: [
          { type: 'Ellipse', left: 0, top: 0, width: 45, height: 45, fillColor: '#e0f2fe', strokeColor: '#0284c7', strokeWidth: 2, text: '1', fontColor: '#0369a1', fontSize: 16, fontWeight: 700, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Ellipse', left: 55, top: 0, width: 45, height: 45, fillColor: '#e0f2fe', strokeColor: '#0284c7', strokeWidth: 2, text: '2', fontColor: '#0369a1', fontSize: 16, fontWeight: 700, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Ellipse', left: 110, top: 0, width: 45, height: 45, fillColor: '#e0e7ff', strokeColor: '#4f46e5', strokeWidth: 2, text: '3', fontColor: '#3730a3', fontSize: 16, fontWeight: 700, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Ellipse', left: 165, top: 0, width: 45, height: 45, fillColor: '#fef3c7', strokeColor: '#d97706', strokeWidth: 2, text: '5', fontColor: '#92400e', fontSize: 16, fontWeight: 700, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Ellipse', left: 220, top: 0, width: 45, height: 45, fillColor: '#fee2e2', strokeColor: '#dc2626', strokeWidth: 2, text: '8', fontColor: '#991b1b', fontSize: 16, fontWeight: 700, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Ellipse', left: 275, top: 0, width: 45, height: 45, fillColor: '#f3e8ff', strokeColor: '#9333ea', strokeWidth: 2, text: '13', fontColor: '#6b21a8', fontSize: 16, fontWeight: 700, horzAlign: 'center', vertAlign: 'middle' },
        ],
      },
      {
        id: 'agile-retro-columns',
        name: 'Sprint Retrospective Columns',
        category: StencilCategory.AGILE_SPRINT,
        description: 'Standard 3-column retro board: What Went Well, To Improve, and Action Items',
        width: 680,
        height: 380,
        shapes: [
          {
            type: 'Rectangle',
            left: 0,
            top: 0,
            width: 210,
            height: 380,
            corners: [8, 8, 8, 8],
            fillColor: '#f0fdf4',
            strokeColor: '#22c55e',
            strokeWidth: 2,
            text: '🟢 What Went Well\n\n• Team collaboration\n• Fast PR reviews',
            fontColor: '#166534',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'left',
            vertAlign: 'top',
          },
          {
            type: 'Rectangle',
            left: 235,
            top: 0,
            width: 210,
            height: 380,
            corners: [8, 8, 8, 8],
            fillColor: '#fef2f2',
            strokeColor: '#ef4444',
            strokeWidth: 2,
            text: '🔴 To Improve\n\n• Flaky CI pipeline\n• Requirement shifts',
            fontColor: '#991b1b',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'left',
            vertAlign: 'top',
          },
          {
            type: 'Rectangle',
            left: 470,
            top: 0,
            width: 210,
            height: 380,
            corners: [8, 8, 8, 8],
            fillColor: '#eff6ff',
            strokeColor: '#3b82f6',
            strokeWidth: 2,
            text: '🔵 Action Items\n\n• Fix test timeouts\n• Update API spec',
            fontColor: '#1e40af',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'left',
            vertAlign: 'top',
          },
        ],
      },
      {
        id: 'agile-mad-sad-glad',
        name: 'Mad / Sad / Glad Retro',
        category: StencilCategory.AGILE_SPRINT,
        description: 'Emotional retrospective board with Mad, Sad, and Glad sections',
        width: 680,
        height: 380,
        shapes: [
          {
            type: 'Rectangle',
            left: 0,
            top: 0,
            width: 210,
            height: 380,
            corners: [8, 8, 8, 8],
            fillColor: '#fff1f2',
            strokeColor: '#f43f5e',
            strokeWidth: 2,
            text: '😡 MAD\nFrustrations & Blockers',
            fontColor: '#9f1239',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'center',
            vertAlign: 'top',
          },
          {
            type: 'Rectangle',
            left: 235,
            top: 0,
            width: 210,
            height: 380,
            corners: [8, 8, 8, 8],
            fillColor: '#f8fafc',
            strokeColor: '#64748b',
            strokeWidth: 2,
            text: '😢 SAD\nDisappointments & Misses',
            fontColor: '#334155',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'center',
            vertAlign: 'top',
          },
          {
            type: 'Rectangle',
            left: 470,
            top: 0,
            width: 210,
            height: 380,
            corners: [8, 8, 8, 8],
            fillColor: '#fefce8',
            strokeColor: '#eab308',
            strokeWidth: 2,
            text: '😄 GLAD\nWins & Celebrations',
            fontColor: '#854d0e',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'center',
            vertAlign: 'top',
          },
        ],
      },
      {
        id: 'agile-sailboat-retro',
        name: 'Sailboat Retrospective',
        category: StencilCategory.AGILE_SPRINT,
        description: 'Sailboat framework with Wind/Propellers, Anchors, and Rocks/Risks',
        width: 620,
        height: 360,
        shapes: [
          {
            type: 'Rectangle',
            left: 0,
            top: 0,
            width: 290,
            height: 165,
            corners: [8, 8, 8, 8],
            fillColor: '#ecfdf5',
            strokeColor: '#10b981',
            strokeWidth: 2,
            text: '💨 Wind / Propellers\n(What moves us forward fast)',
            fontColor: '#065f46',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'left',
            vertAlign: 'top',
          },
          {
            type: 'Rectangle',
            left: 330,
            top: 0,
            width: 290,
            height: 165,
            corners: [8, 8, 8, 8],
            fillColor: '#fff7ed',
            strokeColor: '#f97316',
            strokeWidth: 2,
            text: '🏝️ Destination / Goals\n(Where we are heading)',
            fontColor: '#9a3412',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'left',
            vertAlign: 'top',
          },
          {
            type: 'Rectangle',
            left: 0,
            top: 195,
            width: 290,
            height: 165,
            corners: [8, 8, 8, 8],
            fillColor: '#f8fafc',
            strokeColor: '#64748b',
            strokeWidth: 2,
            text: '⚓ Anchors\n(What slows us down or holds us back)',
            fontColor: '#1e293b',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'left',
            vertAlign: 'top',
          },
          {
            type: 'Rectangle',
            left: 330,
            top: 195,
            width: 290,
            height: 165,
            corners: [8, 8, 8, 8],
            fillColor: '#fef2f2',
            strokeColor: '#ef4444',
            strokeWidth: 2,
            text: '🪨 Rocks / Risks\n(Obstacles on our course)',
            fontColor: '#991b1b',
            fontSize: 14,
            fontWeight: 600,
            horzAlign: 'left',
            vertAlign: 'top',
          },
        ],
      },
      {
        id: 'agile-kanban-board',
        name: 'Kanban Stages Board',
        category: StencilCategory.AGILE_SPRINT,
        description: '4 Kanban columns with WIP limit headers (Backlog, In Progress, Review, Done)',
        width: 820,
        height: 380,
        shapes: [
          { type: 'Rectangle', left: 0, top: 0, width: 190, height: 380, corners: [6, 6, 6, 6], fillColor: '#f8fafc', strokeColor: '#94a3b8', strokeWidth: 1.5, text: '📋 Backlog (∞)', fontColor: '#334155', fontSize: 13, fontWeight: 600, horzAlign: 'center', vertAlign: 'top' },
          { type: 'Rectangle', left: 210, top: 0, width: 190, height: 380, corners: [6, 6, 6, 6], fillColor: '#eff6ff', strokeColor: '#60a5fa', strokeWidth: 1.5, text: '⚡ In Progress [WIP: 3]', fontColor: '#1d4ed8', fontSize: 13, fontWeight: 600, horzAlign: 'center', vertAlign: 'top' },
          { type: 'Rectangle', left: 420, top: 0, width: 190, height: 380, corners: [6, 6, 6, 6], fillColor: '#fdf4ff', strokeColor: '#c084fc', strokeWidth: 1.5, text: '🔍 In Review [WIP: 2]', fontColor: '#7e22ce', fontSize: 13, fontWeight: 600, horzAlign: 'center', vertAlign: 'top' },
          { type: 'Rectangle', left: 630, top: 0, width: 190, height: 380, corners: [6, 6, 6, 6], fillColor: '#f0fdf4', strokeColor: '#4ade80', strokeWidth: 1.5, text: '✅ Done', fontColor: '#15803d', fontSize: 13, fontWeight: 600, horzAlign: 'center', vertAlign: 'top' },
        ],
      },
      {
        id: 'agile-sprint-goal',
        name: 'Sprint Goal Banner',
        category: StencilCategory.AGILE_SPRINT,
        description: 'Prominent header banner for current sprint focus and commitments',
        width: 500,
        height: 100,
        shapes: [
          {
            type: 'Rectangle',
            left: 0,
            top: 0,
            width: 500,
            height: 100,
            corners: [8, 8, 8, 8],
            fillColor: '#e0e7ff',
            strokeColor: '#4f46e5',
            strokeWidth: 2,
            text: '🎯 Sprint 24 Goal\nDeliver self-service organization billing & license allocation',
            fontColor: '#312e81',
            fontSize: 16,
            fontWeight: 700,
            horzAlign: 'center',
            vertAlign: 'middle',
          },
        ],
      },
      {
        id: 'agile-blocker-flag',
        name: 'Blocker / Flag Card',
        category: StencilCategory.AGILE_SPRINT,
        description: 'Attention-grabbing blocker callout with owner and escalation path',
        width: 240,
        height: 110,
        shapes: [
          {
            type: 'Rectangle',
            left: 0,
            top: 0,
            width: 240,
            height: 110,
            corners: [6, 6, 6, 6],
            fillColor: '#fef2f2',
            strokeColor: '#ef4444',
            strokeWidth: 2,
            text: '🚨 IMPEDIMENT / BLOCKER\n\nStuck on: OAuth2 provider rate limits\nOwner: @alex',
            fontColor: '#991b1b',
            fontSize: 13,
            fontWeight: 600,
            horzAlign: 'left',
            vertAlign: 'top',
          },
        ],
      },
      {
        id: 'agile-team-mood-meter',
        name: 'Team Mood & Confidence Meter',
        category: StencilCategory.AGILE_SPRINT,
        description: 'Scripted confidence and sprint health meter from 1 to 5',
        width: 320,
        height: 80,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 0,
            width: 320,
            height: 80,
            script: DRAW_SCRIPTS.agileMoodMeter,
            properties: { level: 4 },
            fillColor: '#f8fafc',
            strokeColor: '#cbd5e1',
            strokeWidth: 1.5,
          },
        ],
      },
    ],
  },
  {
    id: 'prebuilt-cloud-architecture',
    name: 'Cloud Architecture',
    description: 'Cloud infrastructure components for AWS, Azure, GCP, and Kubernetes',
    categories: [StencilCategory.CLOUD_ARCHITECTURE],
    isPrebuilt: true,
    stencils: [
      {
        id: 'cloud-aws-stack',
        name: 'AWS Microservice Architecture',
        category: StencilCategory.CLOUD_ARCHITECTURE,
        description: 'AWS API Gateway, Lambda serverless function, DynamoDB database, and S3 storage',
        width: 520,
        height: 220,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 0,
            width: 520,
            height: 220,
            script: DRAW_SCRIPTS.cloudBoundary,
            properties: { label: 'AWS Cloud VPC Container' },
            fillColor: 'rgba(255, 153, 0, 0.06)',
            strokeColor: '#ff9900',
            strokeWidth: 1.5,
          },
          { type: 'Rectangle', left: 20, top: 55, width: 130, height: 70, corners: [6, 6, 6, 6], fillColor: '#ffffff', strokeColor: '#ff9900', strokeWidth: 2, text: 'API Gateway\n(REST HTTP)', fontColor: '#1e293b', fontSize: 13, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Rectangle', left: 180, top: 55, width: 140, height: 70, corners: [6, 6, 6, 6], fillColor: '#ffffff', strokeColor: '#ff9900', strokeWidth: 2, text: 'AWS Lambda\n(Execution Engine)', fontColor: '#1e293b', fontSize: 13, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
          {
            type: 'Custom',
            left: 350,
            top: 45,
            width: 150,
            height: 75,
            script: DRAW_SCRIPTS.databaseCylinder,
            properties: { title: 'DynamoDB', subtitle: 'NoSQL Table' },
            fillColor: '#eff6ff',
            strokeColor: '#2563eb',
            strokeWidth: 2,
          },
          { type: 'Rectangle', left: 350, top: 135, width: 150, height: 60, corners: [6, 6, 6, 6], fillColor: '#ffffff', strokeColor: '#10b981', strokeWidth: 2, text: 'Amazon S3\n(Blob Assets)', fontColor: '#1e293b', fontSize: 13, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
        ],
      },
      {
        id: 'cloud-k8s-cluster',
        name: 'Kubernetes Pod & Service',
        category: StencilCategory.CLOUD_ARCHITECTURE,
        description: 'Kubernetes Cluster with Ingress, Service routing, and Worker Pod replicas',
        width: 480,
        height: 240,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 0,
            width: 480,
            height: 240,
            script: DRAW_SCRIPTS.cloudBoundary,
            properties: { label: 'Kubernetes Cluster (k8s)' },
            fillColor: 'rgba(50, 108, 229, 0.06)',
            strokeColor: '#326ce5',
            strokeWidth: 1.5,
          },
          { type: 'Rectangle', left: 20, top: 60, width: 120, height: 80, corners: [6, 6, 6, 6], fillColor: '#ffffff', strokeColor: '#326ce5', strokeWidth: 2, text: 'Ingress\nController', fontColor: '#0f172a', fontSize: 13, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Rectangle', left: 170, top: 60, width: 120, height: 80, corners: [6, 6, 6, 6], fillColor: '#ffffff', strokeColor: '#326ce5', strokeWidth: 2, text: 'ClusterIP\nService', fontColor: '#0f172a', fontSize: 13, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Rectangle', left: 320, top: 40, width: 130, height: 60, corners: [6, 6, 6, 6], fillColor: '#eff6ff', strokeColor: '#60a5fa', strokeWidth: 1.5, text: 'Pod: app-replica-1', fontColor: '#1e3a8a', fontSize: 12, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Rectangle', left: 320, top: 120, width: 130, height: 60, corners: [6, 6, 6, 6], fillColor: '#eff6ff', strokeColor: '#60a5fa', strokeWidth: 1.5, text: 'Pod: app-replica-2', fontColor: '#1e3a8a', fontSize: 12, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
        ],
      },
      {
        id: 'cloud-server-node',
        name: 'Database & Compute Node',
        category: StencilCategory.CLOUD_ARCHITECTURE,
        description: 'Scripted 3D Database cylinder and compute server blade rack',
        width: 360,
        height: 160,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 10,
            width: 160,
            height: 140,
            script: DRAW_SCRIPTS.databaseCylinder,
            properties: { title: 'Primary DB', subtitle: 'PostgreSQL 16' },
            fillColor: '#eff6ff',
            strokeColor: '#2563eb',
            strokeWidth: 2,
          },
          {
            type: 'Custom',
            left: 180,
            top: 10,
            width: 180,
            height: 140,
            script: DRAW_SCRIPTS.serverBladeRack,
            properties: { label: 'Worker Rack Node-01', status: 'ONLINE' },
            fillColor: '#1e293b',
            strokeColor: '#475569',
            strokeWidth: 2,
          },
        ],
      },
      {
        id: 'cloud-azure-service-block',
        name: 'Azure Cloud Service Group',
        category: StencilCategory.CLOUD_ARCHITECTURE,
        description: 'Azure App Service, Azure SQL Database, and Azure Blob Storage',
        width: 360,
        height: 200,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 0,
            width: 360,
            height: 200,
            script: DRAW_SCRIPTS.cloudBoundary,
            properties: { label: 'Azure Resource Group' },
            fillColor: 'rgba(0, 120, 212, 0.06)',
            strokeColor: '#0078d4',
            strokeWidth: 1.5,
          },
          { type: 'Rectangle', left: 20, top: 45, width: 140, height: 60, corners: [6, 6, 6, 6], fillColor: '#ffffff', strokeColor: '#0078d4', strokeWidth: 2, text: 'Azure App Service', fontColor: '#0f172a', fontSize: 13, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
          {
            type: 'Custom',
            left: 190,
            top: 40,
            width: 145,
            height: 70,
            script: DRAW_SCRIPTS.databaseCylinder,
            properties: { title: 'Azure SQL DB', subtitle: 'Relational' },
            fillColor: '#eff6ff',
            strokeColor: '#0078d4',
            strokeWidth: 2,
          },
          { type: 'Rectangle', left: 105, top: 125, width: 150, height: 55, corners: [6, 6, 6, 6], fillColor: '#ffffff', strokeColor: '#0078d4', strokeWidth: 2, text: 'Blob Storage Container', fontColor: '#0f172a', fontSize: 13, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
        ],
      },
    ],
  },
  {
    id: 'prebuilt-software-uml',
    name: 'Software Design & UML',
    description: 'UML class diagrams, sequence flows, ER database schemas, and state machines',
    categories: [StencilCategory.SOFTWARE_DESIGN_UML],
    isPrebuilt: true,
    stencils: [
      {
        id: 'uml-class-box',
        name: 'UML Class Box',
        category: StencilCategory.SOFTWARE_DESIGN_UML,
        description: 'Scripted 3-compartment UML class box with distinct header, attributes, and operations',
        width: 220,
        height: 170,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 0,
            width: 220,
            height: 170,
            script: DRAW_SCRIPTS.umlClassBox,
            properties: {
              className: 'UserAccount',
              stereotype: '<<Entity>>',
              attributes: ['- id: UUID', '- email: String', '- role: UserRole'],
              methods: ['+ hasPermission(): Boolean', '+ updateProfile(): void'],
            },
            fillColor: '#ffffff',
            strokeColor: '#334155',
            strokeWidth: 2,
          },
        ],
      },
      {
        id: 'uml-er-table',
        name: 'ER Database Table',
        category: StencilCategory.SOFTWARE_DESIGN_UML,
        description: 'Relational database table entity with Primary Key and Foreign Key indicators',
        width: 240,
        height: 160,
        shapes: [
          {
            type: 'Rectangle',
            left: 0,
            top: 0,
            width: 240,
            height: 160,
            corners: [4, 4, 4, 4],
            fillColor: '#eff6ff',
            strokeColor: '#2563eb',
            strokeWidth: 2,
            text: 'TABLE: whiteboard_snapshot\n=========================\n[PK] id: UUID\n[FK] whiteboard_id: UUID\n[NN] version: INT\n[NN] created_by: UUID\n     name: VARCHAR(255)\n     content: JSONB',
            fontColor: '#1e3a8a',
            fontSize: 12,
            fontWeight: 500,
            horzAlign: 'left',
            vertAlign: 'top',
          },
        ],
      },
      {
        id: 'uml-state-node',
        name: 'State Machine Node',
        category: StencilCategory.SOFTWARE_DESIGN_UML,
        description: 'State machine node with entry, do, and exit action definitions',
        width: 180,
        height: 100,
        shapes: [
          {
            type: 'Rectangle',
            left: 0,
            top: 0,
            width: 180,
            height: 100,
            corners: [16, 16, 16, 16],
            fillColor: '#f1f5f9',
            strokeColor: '#475569',
            strokeWidth: 2,
            text: 'ActiveState\n---\nentry / initSession()\ndo / pollEvents()\nexit / flushState()',
            fontColor: '#0f172a',
            fontSize: 12,
            fontWeight: 500,
            horzAlign: 'center',
            vertAlign: 'top',
          },
        ],
      },
    ],
  },
  {
    id: 'prebuilt-ui-wireframing',
    name: 'UI Wireframing',
    description: 'Mobile screens, desktop browsers, modal dialogs, buttons, toggles, and form inputs',
    categories: [StencilCategory.UI_WIREFRAMING],
    isPrebuilt: true,
    stencils: [
      {
        id: 'ui-interactive-controls',
        name: 'UI Controls & Toggles',
        category: StencilCategory.UI_WIREFRAMING,
        description: 'Scripted toggle switch and progress indicator components',
        width: 260,
        height: 130,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 0,
            width: 130,
            height: 48,
            script: DRAW_SCRIPTS.uiToggleSwitch,
            properties: { checked: true, label: 'Enabled' },
            fillColor: '#2563eb',
            strokeColor: '#1d4ed8',
          },
          {
            type: 'Custom',
            left: 0,
            top: 65,
            width: 260,
            height: 55,
            script: DRAW_SCRIPTS.uiProgressBar,
            properties: { title: 'Upload Progress', progress: 75 },
            fillColor: '#3b82f6',
          },
        ],
      },
      {
        id: 'ui-search-bar',
        name: 'Vector Search Bar',
        category: StencilCategory.UI_WIREFRAMING,
        description: 'Scripted search input bar with vector magnifying glass icon',
        width: 300,
        height: 44,
        shapes: [
          {
            type: 'Custom',
            left: 0,
            top: 0,
            width: 300,
            height: 44,
            script: DRAW_SCRIPTS.uiSearchBar,
            properties: { placeholder: 'Search stencils & shapes...' },
            fillColor: '#ffffff',
            strokeColor: '#94a3b8',
          },
        ],
      },
      {
        id: 'ui-mobile-shell',
        name: 'Mobile Phone Frame',
        category: StencilCategory.UI_WIREFRAMING,
        description: 'Smartphone screen mockup with status bar, screen container, and home bar',
        width: 240,
        height: 420,
        shapes: [
          { type: 'Rectangle', left: 0, top: 0, width: 240, height: 420, corners: [24, 24, 24, 24], fillColor: '#ffffff', strokeColor: '#1e293b', strokeWidth: 3, text: '9:41 📶 🔋', fontColor: '#64748b', fontSize: 11, fontWeight: 600, horzAlign: 'center', vertAlign: 'top' },
          { type: 'Rectangle', left: 20, top: 50, width: 200, height: 120, corners: [8, 8, 8, 8], fillColor: '#f1f5f9', strokeColor: '#cbd5e1', strokeWidth: 1, text: 'Hero Card / Image', fontColor: '#94a3b8', fontSize: 13, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Rectangle', left: 20, top: 190, width: 200, height: 40, corners: [6, 6, 6, 6], fillColor: '#2563eb', strokeColor: '#1d4ed8', strokeWidth: 1, text: 'Get Started', fontColor: '#ffffff', fontSize: 13, fontWeight: 600, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Rectangle', left: 80, top: 395, width: 80, height: 4, corners: [2, 2, 2, 2], fillColor: '#94a3b8', strokeColor: '#94a3b8', strokeWidth: 1, text: '', horzAlign: 'center', vertAlign: 'middle' },
        ],
      },
      {
        id: 'ui-modal-dialog',
        name: 'Modal Dialog Window',
        category: StencilCategory.UI_WIREFRAMING,
        description: 'Dialog box with title, body text, Cancel, and Confirm buttons',
        width: 320,
        height: 180,
        shapes: [
          { type: 'Rectangle', left: 0, top: 0, width: 320, height: 180, corners: [12, 12, 12, 12], fillColor: '#ffffff', strokeColor: '#0f172a', strokeWidth: 2, text: 'Confirm Deletion\n\nAre you sure you want to proceed?\nThis action cannot be undone.', fontColor: '#1e293b', fontSize: 13, fontWeight: 500, horzAlign: 'left', vertAlign: 'top' },
          { type: 'Rectangle', left: 120, top: 125, width: 80, height: 36, corners: [6, 6, 6, 6], fillColor: '#f1f5f9', strokeColor: '#cbd5e1', strokeWidth: 1, text: 'Cancel', fontColor: '#475569', fontSize: 12, fontWeight: 500, horzAlign: 'center', vertAlign: 'middle' },
          { type: 'Rectangle', left: 215, top: 125, width: 85, height: 36, corners: [6, 6, 6, 6], fillColor: '#ef4444', strokeColor: '#dc2626', strokeWidth: 1, text: 'Delete', fontColor: '#ffffff', fontSize: 12, fontWeight: 600, horzAlign: 'center', vertAlign: 'middle' },
        ],
      },
    ],
  },
  {
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
  },
];

export function getPrebuiltCollections(): StencilCollection[] {
  return PREBUILT_STENCIL_COLLECTIONS;
}

export function getAllPrebuiltStencils(): StencilItem[] {
  return PREBUILT_STENCIL_COLLECTIONS.flatMap((col) => col.stencils);
}
