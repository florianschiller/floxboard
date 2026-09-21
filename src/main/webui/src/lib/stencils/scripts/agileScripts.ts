// Agile User Story Card with persona, status pill, and estimation badge
export const agileStoryCard = `function draw(ctx, shape) {
  const w = shape.width || 240;
  const h = shape.height || 160;
  const props = shape.properties || {};
  const code = props.code || 'US-101';
  const title = props.title || 'User Authentication';
  const persona = props.persona || 'As a User';
  const goal = props.goal || 'I want to sign in with SSO';
  const value = props.value || 'So that I access my boards quickly';
  const points = props.points || '5';
  const status = props.status || 'IN PROGRESS';

  function drawTruncatedText(text, x, y, maxW) {
    let str = text;
    if (ctx.measureText(str).width > maxW) {
      while (str.length > 0 && ctx.measureText(str + '...').width > maxW) {
        str = str.slice(0, -1);
      }
      str = str + '...';
    }
    ctx.fillText(str, x, y);
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

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

  // Row 1: Code Pill (top-left)
  ctx.font = 'bold 10px Roboto, sans-serif';
  const codeW = ctx.measureText(code).width + 12;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(12, 10, codeW, 18, 4);
  } else {
    ctx.rect(12, 10, codeW, 18);
  }
  ctx.fillStyle = '#fef08a';
  ctx.fill();
  ctx.fillStyle = '#854d0e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 12 + codeW / 2, 19);

  // Row 1: Status Tag Pill (next to code)
  ctx.font = 'bold 9px Roboto, sans-serif';
  const statusX = 12 + codeW + 6;
  const maxStatusW = Math.max(16, w - 38 - statusX);
  const measuredStatusW = ctx.measureText(status).width + 12;
  const statusW = Math.min(measuredStatusW, maxStatusW);
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(statusX, 10, statusW, 18, 9);
  } else {
    ctx.rect(statusX, 10, statusW, 18);
  }
  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#713f12';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (measuredStatusW > maxStatusW) {
    drawTruncatedText(status, statusX + 6, 19, statusW - 12);
  } else {
    ctx.fillText(status, statusX + statusW / 2, 19);
  }

  // Row 1: Points Circle Badge (top-right)
  ctx.beginPath();
  ctx.arc(w - 20, 19, 13, 0, 2 * Math.PI);
  ctx.fillStyle = '#eab308';
  ctx.fill();
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(points, w - 20, 19);

  // Row 2: Story Title
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#854d0e';
  ctx.font = 'bold 12px Roboto, sans-serif';
  drawTruncatedText(title, 12, 38, w - 24);

  // Divider
  ctx.beginPath();
  ctx.moveTo(12, 50);
  ctx.lineTo(w - 12, 50);
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Body Text
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#713f12';
  ctx.font = '500 11px Roboto, sans-serif';
  drawTruncatedText('👤 ' + persona, 12, 62, w - 24);
  drawTruncatedText('🎯 ' + goal, 12, 84, w - 24);
  drawTruncatedText('💡 ' + value, 12, 106, w - 24);
  ctx.restore();
}`;

// Agile Mood & Confidence Meter
export const agileMoodMeter = `function draw(ctx, shape) {
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
}`;
