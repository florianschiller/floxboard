// BPMN Gateway Decision Diamond
export const bpmnGateway = `function draw(ctx, shape) {
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
}`;

// BPMN Event Trigger (Start / Intermediate / End)
export const bpmnEvent = `function draw(ctx, shape) {
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
}`;
