#!/usr/bin/env node
/**
 * build-sprite-sheet.mjs — Pure Node.js sprite sheet builder
 *
 * Stitches individual PNG frames into a single sprite sheet image
 * without any external dependencies. Uses only built-in modules
 * (zlib, fs, path, crypto).
 *
 * Usage:
 *   node scripts/build-sprite-sheet.mjs
 *
 * Config driven by sprite_v3.json in the sprite model directory.
 * Default target: public/models/sprites/
 *
 * How it works:
 *   1. Reads sprite_v3.json to get row/frame layout
 *   2. Decodes each source PNG → raw RGBA pixels (zlib.inflate + unfilter)
 *   3. Assembles a grid: columns = maxFrames × frameW, rows = numRows × frameH
 *   4. Encodes back to a single PNG (zlib.deflate + filter)
 *   5. Writes spritesheet.png next to the config
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { inflateSync, deflateSync } from "zlib";

// ── PNG primitives ──────────────────────────────────────

const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function readChunks(buf) {
  const chunks = [];
  let off = 8; // skip signature
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString("ascii");
    const data = buf.subarray(off + 8, off + 8 + len);
    const crc = buf.readUInt32BE(off + 8 + len);
    chunks.push({ type, data, crc });
    off += 12 + len;
    if (type === "IEND") break;
  }
  return chunks;
}

function decodePng(buf) {
  const chunks = readChunks(buf);
  const ihdr = chunks[0];
  if (ihdr.type !== "IHDR") throw new Error("Missing IHDR");
  const w = ihdr.data.readUInt32BE(0);
  const h = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];

  // Collect IDAT chunks
  const idatBufs = chunks.filter((c) => c.type === "IDAT").map((c) => c.data);
  const compressed = Buffer.concat(idatBufs);
  const decompressed = inflateSync(compressed);

  // Parse scanlines
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = w * bytesPerPixel + 1; // +1 for filter byte
  const raw = Buffer.alloc(w * h * 4); // always output RGBA

  for (let y = 0; y < h; y++) {
    const filter = decompressed[y * stride];
    const line = decompressed.subarray(y * stride + 1, (y + 1) * stride);

    // Unfilter
    let prevLine = raw.subarray((y - 1) * w * 4, y * w * 4);
    switch (filter) {
      case 0: // None
        break;
      case 1: // Sub
        for (let x = bytesPerPixel; x < line.length; x++)
          line[x] = (line[x] + line[x - bytesPerPixel]) & 0xff;
        break;
      case 2: // Up
        for (let x = 0; x < line.length; x++)
          line[x] = (line[x] + (prevLine[mapIdx(x, bytesPerPixel)] ?? 0)) & 0xff;
        break;
      case 3: // Average
        for (let x = 0; x < line.length; x++) {
          const a = x >= bytesPerPixel ? line[x - bytesPerPixel] : 0;
          const b = prevLine[mapIdx(x, bytesPerPixel)] ?? 0;
          line[x] = (line[x] + ((a + b) >> 1)) & 0xff;
        }
        break;
      case 4: // Paeth
        for (let x = 0; x < line.length; x++) {
          const a = x >= bytesPerPixel ? line[x - bytesPerPixel] : 0;
          const b = prevLine[mapIdx(x, bytesPerPixel)] ?? 0;
          const c = x >= bytesPerPixel ? (prevLine[mapIdx(x - bytesPerPixel, bytesPerPixel)] ?? 0) : 0;
          line[x] = (line[x] + paethPredictor(a, b, c)) & 0xff;
        }
        break;
    }

    // Convert to RGBA
    for (let x = 0; x < w; x++) {
      const dst = (y * w + x) * 4;
      if (colorType === 6) {
        // RGBA
        const src = x * 4;
        raw[dst] = line[src];
        raw[dst + 1] = line[src + 1];
        raw[dst + 2] = line[src + 2];
        raw[dst + 3] = line[src + 3];
      } else if (colorType === 2) {
        // RGB → RGBA
        const src = x * 3;
        raw[dst] = line[src];
        raw[dst + 1] = line[src + 1];
        raw[dst + 2] = line[src + 2];
        raw[dst + 3] = 255;
      } else {
        // Grayscale → RGBA
        raw[dst] = line[x];
        raw[dst + 1] = line[x];
        raw[dst + 2] = line[x];
        raw[dst + 3] = 255;
      }
    }
  }

  return { width: w, height: h, pixels: raw };
}

function mapIdx(x, bpp) {
  // Map from line byte index to RGBA pixel index in prevLine
  if (bpp === 4) return x;
  if (bpp === 3) return Math.floor(x / 3) * 4 + (x % 3);
  return x * 4;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// ── PNG encoder ─────────────────────────────────────────

function encodePng(width, height, pixels) {
  // Build scanlines with filter byte (filter type 0 = None for simplicity)
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: None
    pixels.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(raw, { level: 9 });

  // Build chunks
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const chunks = [
    { type: "IHDR", data: ihdr },
    { type: "IDAT", data: compressed },
    { type: "IEND", data: Buffer.alloc(0) },
  ];

  const parts = [PNG_SIG];
  for (const c of chunks) {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(c.data.length, 0);
    const typeBuf = Buffer.from(c.type, "ascii");
    const crcInput = Buffer.concat([typeBuf, c.data]);
    const crc = crc32(crcInput);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    parts.push(lenBuf, typeBuf, c.data, crcBuf);
  }

  return Buffer.concat(parts);
}

// CRC32 (PNG uses standard CRC-32)
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Sprite sheet assembly ───────────────────────────────

function buildSheet(modelDir) {
  const configPath = existsSync(join(modelDir, "sprite.json"))
    ? join(modelDir, "sprite.json")
    : join(modelDir, "sprite_v3.json");
  const config = JSON.parse(readFileSync(configPath, "utf-8"));
  if (config.type !== "sprite" || !config.sheet || !config.states) {
    throw new Error("Invalid sprite_v3.json: must be V3 format with 'sheet' and 'states'");
  }

  const { frameW, frameH, states } = config;

  const sourceFiles = new Set(readdirSync(modelDir).filter((f) => f.endsWith(".png") && f !== config.sheet));

  const findFrameFile = (stateId, col) => {
    const candidates = [
      `${stateId}_${col}.png`,
      `${stateId}_${String(col).padStart(2, "0")}.png`,
      `${config.name?.toLowerCase?.().split(" ")[0] ?? ""}_${stateId}_${String(col).padStart(2, "0")}.png`,
      `${config.name?.toLowerCase?.().split(" ")[0] ?? ""}_${stateId}_${col}.png`,
    ].filter(Boolean);
    return candidates.find((file) => sourceFiles.has(file)) ?? null;
  };

  const stateIds = Object.keys(states);
  const maxFrames = Math.max(...stateIds.map((s) => states[s].frames));
  const totalWidth = maxFrames * frameW;
  const totalHeight = stateIds.length * frameH;

  console.log(`Sheet: ${totalWidth}×${totalHeight}, ${stateIds.length} rows, max ${maxFrames} frames/row`);

  const out = Buffer.alloc(totalWidth * totalHeight * 4); // RGBA

  for (let rowIdx = 0; rowIdx < stateIds.length; rowIdx++) {
    const stateId = stateIds[rowIdx];
    const numFrames = states[stateId].frames;
    for (let col = 0; col < numFrames; col++) {
      const srcFile = findFrameFile(stateId, col);
      if (!srcFile) {
        console.warn(`  [warn] row ${rowIdx} (${stateId}) frame ${col}: no source file`);
        continue;
      }

      const srcPath = join(modelDir, srcFile);
      let decoded;
      try {
        decoded = decodePng(readFileSync(srcPath));
      } catch {
        console.warn(`  [warn] cannot decode ${srcFile}, skipping`);
        continue;
      }

      if (decoded.width !== frameW || decoded.height !== frameH) {
        console.warn(
          `  [warn] ${srcFile} is ${decoded.width}×${decoded.height}, expected ${frameW}×${frameH}`
        );
      }

      // Copy to sheet
      const srcW = Math.min(decoded.width, frameW);
      const srcH = Math.min(decoded.height, frameH);
      const dstX = col * frameW;
      const dstY = rowIdx * frameH;

      for (let sy = 0; sy < srcH; sy++) {
        const srcOff = sy * decoded.width * 4;
        const dstOff = ((dstY + sy) * totalWidth + dstX) * 4;
        decoded.pixels.copy(out, dstOff, srcOff, srcOff + srcW * 4);
      }
    }
  }

  const png = encodePng(totalWidth, totalHeight, out);
  const outPath = join(modelDir, config.sheet);
  writeFileSync(outPath, png);
  console.log(`Wrote: ${outPath} (${(png.length / 1024).toFixed(0)} KB)`);
}

// ── Main ────────────────────────────────────────────────

const modelDir = process.argv[2] || "public/models/sprites";
console.log(`Building sprite sheet for: ${modelDir}`);
buildSheet(modelDir);
console.log("Done.");
