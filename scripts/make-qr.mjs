#!/usr/bin/env node
/**
 * The bridge from a desktop browser to a phone.
 *
 * Generated once rather than at runtime: the URL never changes, so a build
 * artefact costs nothing and keeps the encoder out of both the server and the
 * bundle. Regenerate with `npm run qr` if the origin ever moves.
 *
 * It encodes the https page, not the nimiqpay:// deep link — phone cameras
 * routinely refuse to open custom schemes, and /open offers the deep link as a
 * tap once you are there.
 */
import { writeFileSync } from 'node:fs';
import QRCode from 'qrcode';
import { createCanvas, Image } from '@napi-rs/canvas';
import jsQRImport from 'jsqr';

const jsQR = jsQRImport.default ?? jsQRImport;

const ORIGIN = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://reef.nimiq.cafe';
const TARGET = `${ORIGIN}/open`;

const svg = await QRCode.toString(TARGET, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 1,
  // currentColor so the code inherits the page's ink and stays legible in
  // both themes; a hardcoded black vanishes on a dark ground.
  color: { dark: '#000000', light: '#0000' },
});

const themed = svg
  .replace(/stroke="#000000"/g, 'stroke="currentColor"')
  .replace('<svg ', '<svg role="img" aria-label="Scan to open Reef on a phone" ');

// Decode what was actually produced. A QR that does not scan fails silently —
// it looks exactly like one that does, and the only report is somebody giving
// up. The recolouring above is the part most likely to break it.
const size = 620;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');
const image = new Image();
image.src = Buffer.from(themed.replace(/currentColor/g, '#000'));
ctx.fillStyle = '#fff';
ctx.fillRect(0, 0, size, size);
ctx.drawImage(image, 0, 0, size, size);

const decoded = jsQR(ctx.getImageData(0, 0, size, size).data, size, size);
if (decoded?.data !== TARGET) {
  console.error(`  FAILED to decode: got ${decoded?.data ?? 'nothing'}, wanted ${TARGET}`);
  process.exit(1);
}

writeFileSync('public/open-qr.svg', themed);
console.log(`  public/open-qr.svg -> ${TARGET} (${themed.length} bytes, decodes)`);
