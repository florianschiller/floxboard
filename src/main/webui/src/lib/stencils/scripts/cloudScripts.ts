// Database Cylinder Node with 3D perspective and status indicators
export const databaseCylinder = `function draw(ctx, shape) {
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
  if (shape.fontColor === '$foreground') {
    ctx.fillStyle = '#64748b';
  } else {
    ctx.fillStyle = shape.fontColor;
  }
  ctx.font = 'bold 12px Roboto, sans-serif';
  ctx.fillText(title, w / 2, h / 2 - 2);
  ctx.font = '10px Roboto, sans-serif';
  ctx.fillText(sub, w / 2, h / 2 + 13);
  ctx.restore();
}`;

// Cloud VPC / Subnet Boundary with multi-curved lobes
export const cloudBoundary = `function draw(ctx, shape) {
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
}`;

// Server Blade Rack with drive bays and status LEDs
export const serverBladeRack = `function draw(ctx, shape) {
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
}`;
