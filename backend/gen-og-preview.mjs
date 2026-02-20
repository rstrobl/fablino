import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs';

// Register Nunito
registerFont('/tmp/fonts/Nunito-Bold.ttf', { family: 'Nunito', weight: 'bold' });
registerFont('/tmp/fonts/Nunito-ExtraBold.ttf', { family: 'Nunito', weight: '800' });
registerFont('/tmp/fonts/Nunito.ttf', { family: 'Nunito', weight: 'normal' });

async function loadTwemoji(emoji) {
  const codepoints = [...emoji]
    .map(c => c.codePointAt(0).toString(16))
    .filter(cp => cp !== 'fe0f')
    .join('-');
  const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints}.png`;
  try { return await loadImage(url); } catch { return null; }
}

const CHAR_EMOJI = {
  child_m: '👦', child_f: '👧', adult_m: '👨', adult_f: '👩',
  elder_m: '👴', elder_f: '👵', male: '👨', female: '👩',
};

function getEmoji(name, gender) {
  if (name.toLowerCase() === 'erzähler') return '📖';
  if (gender === 'creature') {
    const n = name.toLowerCase();
    if (n.includes('drach') || n.includes('dragon')) return '🐉';
    if (n.includes('fuchs') || n.includes('fox')) return '🦊';
    if (n.includes('bär') || n.includes('bear')) return '🐻';
    if (n.includes('wolf')) return '🐺';
    if (n.includes('katze') || n.includes('cat')) return '🐱';
    if (n.includes('hase') || n.includes('rabbit')) return '🐰';
    if (n.includes('eule') || n.includes('owl')) return '🦉';
    return '🐉';
  }
  return CHAR_EMOJI[gender] || '✨';
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateOG() {
  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#F0FAF8');
  grad.addColorStop(0.5, '#FFF8F0');
  grad.addColorStop(1, '#FFF5E8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Large decorative circles
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#3D9B8F';
  ctx.beginPath(); ctx.arc(-40, H + 40, 250, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#F0917A';
  ctx.beginPath(); ctx.arc(W + 30, -30, 200, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Top accent bar
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, '#3D9B8F');
  topGrad.addColorStop(1, '#F0917A');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 8);

  // Load & draw logo
  try {
    const logo = await loadImage('/root/.openclaw/workspace/fablino/frontend/public/logo.png');
    ctx.drawImage(logo, 50, 30, 140, 70);
  } catch {}

  // Headphone twemoji + "Hörspiel" badge
  const headphone = await loadTwemoji('🎧');
  const badgeX = 60, badgeY = 120;
  // Badge pill background
  ctx.fillStyle = 'rgba(61, 155, 143, 0.1)';
  ctx.beginPath(); ctx.roundRect(badgeX, badgeY, 180, 40, 20); ctx.fill();
  ctx.strokeStyle = 'rgba(61, 155, 143, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(badgeX, badgeY, 180, 40, 20); ctx.stroke();
  if (headphone) ctx.drawImage(headphone, badgeX + 12, badgeY + 6, 28, 28);
  ctx.fillStyle = '#2D7A70';
  ctx.font = 'bold 18px Nunito';
  ctx.fillText('HÖRSPIEL', badgeX + 48, badgeY + 27);

  // Title
  ctx.fillStyle = '#2D3748';
  ctx.font = '800 46px Nunito';
  const title = 'Der kleine Ritter Konstantin und der einsame Drache';
  const titleLines = wrapText(ctx, title, W - 120);
  let ty = 210;
  for (const line of titleLines) {
    ctx.fillText(line, 60, ty);
    ty += 58;
  }

  // Characters row
  const chars = [
    { name: 'Konstantin', gender: 'child_m' },
    { name: 'Donnerzahn', gender: 'creature' },
    { name: 'Mama', gender: 'adult_f' },
    { name: 'Papa', gender: 'adult_m' },
    { name: 'Iris', gender: 'child_f' },
  ];

  let cx = 60;
  const cy = ty + 20;
  const iconSize = 36;

  for (const c of chars) {
    const emoji = getEmoji(c.name, c.gender);
    const img = await loadTwemoji(emoji);

    ctx.font = 'bold 19px Nunito';
    const nameW = ctx.measureText(c.name).width;
    const totalW = iconSize + 10 + nameW + 28;

    // Pill background
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.06)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.roundRect(cx, cy, totalW, 50, 25); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Border
    ctx.strokeStyle = '#E8DDD4';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx, cy, totalW, 50, 25); ctx.stroke();

    // Icon
    if (img) ctx.drawImage(img, cx + 12, cy + 7, iconSize, iconSize);

    // Name
    ctx.fillStyle = '#4A5568';
    ctx.font = 'bold 19px Nunito';
    ctx.fillText(c.name, cx + 12 + iconSize + 8, cy + 32);

    cx += totalW + 10;
  }

  // Summary
  ctx.fillStyle = '#718096';
  ctx.font = 'normal 20px Nunito';
  const summary = '„Als der kleine Ritter Konstantin zum geheimnisvollen Drachenberg reitet, erwartet ihn ein Abenteuer, das ganz anders verläuft als gedacht."';
  const summaryLines = wrapText(ctx, summary, W - 120);
  let sy = H - 80;
  for (let i = summaryLines.length - 1; i >= 0; i--) {
    ctx.fillText(summaryLines[i], 60, sy);
    sy -= 28;
  }

  // Bottom accent
  const botGrad = ctx.createLinearGradient(0, 0, W, 0);
  botGrad.addColorStop(0, '#F0917A');
  botGrad.addColorStop(1, '#3D9B8F');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H - 6, W, 6);

  const buf = canvas.toBuffer('image/png');
  fs.writeFileSync('/tmp/og-preview-v2.png', buf);
  console.log('Done: /tmp/og-preview-v2.png');
}

generateOG().catch(console.error);
