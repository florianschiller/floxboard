// UML Class Box with 3 distinct compartments: Header, Attributes, Operations
export const umlClassBox = `function draw(ctx, shape) {
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
}`;
