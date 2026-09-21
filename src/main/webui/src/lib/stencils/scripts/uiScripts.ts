// UI Interactive Toggle Switch
export const uiToggleSwitch = `function draw(ctx, shape) {
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
}`;

// UI Wireframe Progress Bar
export const uiProgressBar = `function draw(ctx, shape) {
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
}`;

// UI Search Input with Vector Magnifier
export const uiSearchBar = `function draw(ctx, shape) {
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
}`;
