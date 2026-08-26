/**
 * Prototype: a reef creature as composable parts, the way a Nimiq identicon is.
 *
 * Nothing here is wired into the app. It exists to answer one question — can a
 * seed produce a creature somebody wants to collect — before the shipped
 * renderer is rebuilt around it.
 *
 * Slots, all driven by the specimen's seed:
 *   crest   8   the "hat". The most collectible-feeling part.
 *   eyes    8   expression lives here
 *   mouth   7
 *   pattern 6
 *   fin     5
 *   colour  12 main x 6 belly
 * => 8*8*7*6*5*12*6 = 967,680 per species, before tier colouring.
 */

/**
 * Deterministic, and decorrelated.
 *
 * A plain LCG seeded with `seed * k` has neighbouring seeds producing
 * neighbouring first outputs — which showed up immediately as a sheet of
 * creatures sorted into colour bands. Running the seed through an avalanche
 * mix first is what breaks that.
 */
function mix32(n) {
  let x = n >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97) >>> 0;
  return (x ^ (x >>> 15)) >>> 0;
}

export function rng(seed) {
  let s = mix32(seed) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** One independent stream per slot, so no two choices move together. */
const at = (seed, slot, n) => mix32(seed + slot * 0x9e3779b9) % n;

const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];

const MAIN = [
  '#FC8702', '#D94432', '#E9B213', '#2E6FD9', '#0582CA',
  '#7A6BC9', '#21BCA5', '#FA7268', '#88B04B', '#B4653A',
  '#E85D9E', '#4FC3E8',
];
const BELLY = ['#FFF3D6', '#FFE0C2', '#FFFFFF', '#FFE8F0', '#EAF7E4', '#E4F2FF'];

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amount)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Everything about one creature, decided once from its seed. */
export function characterFor(seed) {
  const r = rng(seed + 977);
  return {
    main: MAIN[at(seed, 1, MAIN.length)],
    belly: BELLY[at(seed, 2, BELLY.length)],
    crest: at(seed, 3, 8),
    eyes: at(seed, 4, 8),
    mouth: at(seed, 5, 7),
    pattern: at(seed, 6, 6),
    fin: at(seed, 7, 5),
    blush: at(seed, 8, 100) < 55,
    plump: 0.82 + (at(seed, 9, 1000) / 1000) * 0.42,
  };
}

/* ------------------------------ parts ------------------------------ */

function crest(ctx, L, H, c, kind, t) {
  const bob = Math.sin(t * 2.1) * L * 0.012;
  ctx.fillStyle = shade(c.main, -34);
  ctx.save();
  ctx.translate(L * 0.06, -H * 0.5 + bob);
  switch (kind) {
    case 0: break;                                        // bare
    case 1:                                               // spikes
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * L * 0.1 - L * 0.05, 0);
        ctx.lineTo(i * L * 0.1, -L * 0.16);
        ctx.lineTo(i * L * 0.1 + L * 0.05, 0);
        ctx.fill();
      }
      break;
    case 2:                                               // plume
      ctx.beginPath();
      ctx.moveTo(-L * 0.1, 0);
      ctx.quadraticCurveTo(-L * 0.02, -L * 0.3, L * 0.14, -L * 0.16);
      ctx.quadraticCurveTo(L * 0.02, -L * 0.12, L * 0.1, 0);
      ctx.fill();
      break;
    case 3:                                               // horn
      ctx.beginPath();
      ctx.moveTo(-L * 0.04, 0);
      ctx.quadraticCurveTo(L * 0.02, -L * 0.26, L * 0.1, -L * 0.2);
      ctx.quadraticCurveTo(L * 0.03, -L * 0.1, L * 0.05, 0);
      ctx.fill();
      break;
    case 4:                                               // antennae
      ctx.strokeStyle = shade(c.main, -34);
      ctx.lineWidth = Math.max(1, L * 0.016);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * L * 0.05, 0);
        ctx.quadraticCurveTo(s * L * 0.1, -L * 0.16, s * L * 0.05, -L * 0.22);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(s * L * 0.05, -L * 0.24, L * 0.028, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 5:                                               // sail fin
      ctx.beginPath();
      ctx.moveTo(-L * 0.16, 0);
      ctx.quadraticCurveTo(0, -L * 0.24, L * 0.16, 0);
      ctx.fill();
      break;
    case 6:                                               // tuft
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.ellipse(i * L * 0.055, -L * 0.08, L * 0.035, L * 0.075, i * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    default:                                              // crown
      ctx.beginPath();
      ctx.moveTo(-L * 0.11, 0);
      ctx.lineTo(-L * 0.11, -L * 0.13);
      ctx.lineTo(-L * 0.04, -L * 0.07);
      ctx.lineTo(0, -L * 0.17);
      ctx.lineTo(L * 0.04, -L * 0.07);
      ctx.lineTo(L * 0.11, -L * 0.13);
      ctx.lineTo(L * 0.11, 0);
      ctx.fill();
  }
  ctx.restore();
}

function eyes(ctx, L, kind, t, seed) {
  const x = L * 0.24, y = -L * 0.07;
  const R = L * 0.105;
  // Blink on a per-creature clock, as in the shipped renderer.
  const period = 4.1 + (seed % 9) * 0.53;
  const phase = (t + seed * 0.41) % period;
  const lid = phase < 0.16 ? 1 - Math.abs(phase - 0.08) / 0.08 : 0;
  const open = Math.max(0.06, 1 - lid * 0.9);
  const gaze = Math.sin(t * 0.47 + seed) * R * 0.18;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, open);

  // "Determined": a normal eye with a brow over it. Drawn as a wedge on its
  // own it just read as a black arrow stuck to the fish.
  const brow = kind === 5;
  if (kind === 6) {                                       // wink: a line
    ctx.strokeStyle = '#12222c';
    ctx.lineWidth = Math.max(1.2, R * 0.32);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-R * 0.7, 0); ctx.lineTo(R * 0.7, 0); ctx.stroke();
    ctx.restore();
    return;
  }

  const big = kind === 1 ? 1.28 : kind === 2 ? 0.82 : 1;
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.beginPath(); ctx.arc(0, 0, R * big, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#12222c';
  const pr = kind === 3 ? R * 0.34 : kind === 4 ? R * 0.66 : R * 0.5;
  ctx.beginPath(); ctx.arc(gaze + R * 0.12, 0, pr * big, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.arc(gaze - R * 0.2 * big, -R * 0.32 * big, R * 0.26 * big, 0, Math.PI * 2);
  ctx.fill();

  if (brow) {
    ctx.strokeStyle = '#12222c';
    ctx.lineWidth = Math.max(1.2, R * 0.3);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-R * 0.95, -R * 1.15);
    ctx.lineTo(R * 0.75, -R * 0.6);
    ctx.stroke();
  }
  if (kind === 7) {                                       // sparkle: second glint
    ctx.beginPath();
    ctx.arc(gaze + R * 0.3 * big, R * 0.28 * big, R * 0.13 * big, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function mouth(ctx, L, kind, t) {
  const x = L * 0.42, y = L * 0.06;
  ctx.strokeStyle = '#12222c';
  ctx.fillStyle = '#12222c';
  ctx.lineWidth = Math.max(1, L * 0.018);
  ctx.lineCap = 'round';
  const chew = 1 + Math.sin(t * 3.4) * 0.18;
  ctx.save();
  ctx.translate(x, y);
  switch (kind) {
    case 0:                                               // smile
      ctx.beginPath(); ctx.arc(0, -L * 0.03, L * 0.06, 0.25, Math.PI - 0.25); ctx.stroke(); break;
    case 1:                                               // open O
      ctx.beginPath(); ctx.ellipse(0, 0, L * 0.036, L * 0.045 * chew, 0, 0, Math.PI * 2); ctx.fill(); break;
    case 2:                                               // grin
      ctx.beginPath();
      ctx.moveTo(-L * 0.06, -L * 0.02);
      ctx.quadraticCurveTo(0, L * 0.06 * chew, L * 0.06, -L * 0.02);
      ctx.closePath(); ctx.fill(); break;
    case 3:                                               // flat
      ctx.beginPath(); ctx.moveTo(-L * 0.05, 0); ctx.lineTo(L * 0.04, 0); ctx.stroke(); break;
    case 4:                                               // pout
      ctx.beginPath(); ctx.arc(0, L * 0.05, L * 0.055, Math.PI + 0.3, -0.3); ctx.stroke(); break;
    case 5:                                               // pursed
      ctx.beginPath();
      ctx.ellipse(L * 0.015, 0, L * 0.028, L * 0.034 * chew, 0, 0, Math.PI * 2);
      ctx.stroke(); break;
    default:                                              // tongue
      ctx.beginPath(); ctx.arc(0, -L * 0.02, L * 0.055, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#F2789F';
      ctx.beginPath(); ctx.ellipse(0, L * 0.035 * chew, L * 0.03, L * 0.022, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function pattern(ctx, L, H, c, kind) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.5, H * 0.5, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = shade(c.main, -40);
  switch (kind) {
    case 0: break;
    case 1:                                               // vertical bands
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * L * 0.13 - L * 0.03, -H, L * 0.06, H * 2);
      break;
    case 2:                                               // spots
      for (let i = 0; i < 7; i++) {
        const a = i * 2.399;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * L * 0.22, Math.sin(a) * H * 0.26, L * 0.033, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 3:                                               // dorsal wash
      ctx.fillRect(-L, -H, L * 2, H * 0.42);
      break;
    case 4:                                               // lateral stripe
      ctx.fillRect(-L, -H * 0.1, L * 2, H * 0.16);
      break;
    default:                                              // freckles
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(L * 0.3, -H * 0.1 + i * H * 0.09, L * 0.016, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  ctx.restore();
}

/* ------------------------------ the creature ------------------------------ */

export function drawCharacter(ctx, L, seed, t) {
  const c = characterFor(seed);
  const H = L * 0.62 * c.plump;
  const wag = Math.sin(t * 5.2 + seed) * L * 0.13;

  // Tail, behind everything.
  ctx.fillStyle = shade(c.main, -18);
  ctx.save();
  ctx.translate(-L * 0.44, 0);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-L * 0.16, wag * 0.4, -L * 0.28, wag - H * 0.44);
  ctx.quadraticCurveTo(-L * 0.14, wag * 0.5, -L * 0.28, wag + H * 0.44);
  ctx.quadraticCurveTo(-L * 0.16, wag * 0.4, 0, 0);
  ctx.fill();
  ctx.restore();

  crest(ctx, L, H, c, c.crest, t);

  // Body.
  ctx.fillStyle = c.main;
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.5, H * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  pattern(ctx, L, H, c, c.pattern);

  // Belly last, and clipped to the body: a soft underside rather than a slab
  // floating on top of the pattern. Low and forward, so the face has room.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, L * 0.5, H * 0.5, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = c.belly;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.ellipse(L * 0.12, H * 0.46, L * 0.4, H * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Side fin, waving. Translucent and sitting forward on the belly — opaque
  // and centred it read as a shadow blob rather than a limb.
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = shade(c.main, -30);
  ctx.translate(L * 0.14, H * 0.26);
  ctx.rotate(0.55 + Math.sin(t * 4.1 + seed) * 0.3);
  const fw = [0.09, 0.12, 0.1, 0.13, 0.08][c.fin];
  ctx.beginPath();
  ctx.ellipse(0, 0, L * fw, H * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (c.blush) {
    ctx.fillStyle = 'rgba(255,120,140,.34)';
    ctx.beginPath();
    ctx.ellipse(L * 0.33, L * 0.02, L * 0.05, L * 0.032, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  eyes(ctx, L, c.eyes, t, seed);
  mouth(ctx, L, c.mouth, t);
}
