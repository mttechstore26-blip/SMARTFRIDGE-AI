/* global Buffer, URL */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = new URL('../public/', import.meta.url);
mkdirSync(out, { recursive: true });

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name, bytes) {
  const type = Buffer.from(name, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, bytes])));
  return Buffer.concat([length, type, bytes, checksum]);
}
function roundedRect(x, y, left, top, right, bottom, radius) {
  const cx = Math.max(left + radius, Math.min(right - radius, x));
  const cy = Math.max(top + radius, Math.min(bottom - radius, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}
function colorAt(x, y) {
  // Pixel coordinates are normalized to the 128px original SmartFridge logo.
  if (!roundedRect(x, y, 0, 0, 128, 128, 29)) return [0, 0, 0, 0];
  let color = [47, 107, 89, 255];
  if (roundedRect(x, y, 38, 31, 90, 97, 3)) color = [244, 245, 239, 255];
  const line = (top, right) => y >= top && y < top + 6 && x >= 48 && x < right;
  if (line(44, 80) || line(58, 80) || line(72, 67)) color = [47, 107, 89, 255];
  if ((x - 82) ** 2 + (y - 83) ** 2 < 15 ** 2) color = [242, 185, 75, 255];
  // White check: two thick segments.
  function distanceSegment(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
  }
  if (distanceSegment(75, 83, 80, 88) < 2.2 || distanceSegment(80, 88, 89, 77) < 2.2) color = [255, 255, 255, 255];
  return color;
}
function png(size) {
  const rows = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) {
      const xx = (x + 0.5) * 128 / size, yy = (y + 0.5) * 128 / size;
      const pixel = colorAt(xx, yy);
      for (let c = 0; c < 4; c++) rows[row + 1 + x * 4 + c] = pixel[c];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
for (const size of [180, 192, 512]) {
  writeFileSync(new URL(`./icon-${size}.png`, out), png(size));
}
