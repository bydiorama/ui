/**
 * What Aspekta's figures actually are — read from the shipped font file.
 *
 * ADR 0011 item 5 replaced a mono face with `font-variant-numeric:
 * tabular-nums` and asked for the face to be checked first. Checked
 * 2026-11-11: AspektaVF has NO `tnum` feature, and its default digits are
 * proportional (advances 367–602 units). `tabular-nums` is therefore a no-op
 * in this face: columns of figures right-align on their last digit but do
 * not line up digit by digit, and a figure that changes in place (a tooltip
 * value, a live counter) changes width.
 *
 * Per ADR 0011 that is a gap filed against the face, not a reason for a
 * second family. This test pins the fact so it cannot be forgotten in both
 * directions: if a font update adds `tnum`, it fails — then delete the
 * "no tabular figures" knownGaps lines (chart, chart-card, stat-tiles, meter, table, range-slider) and
 * flip this test to assert the feature instead.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";

const FONT = new URL("./AspektaVF.woff2", import.meta.url);

/** The WOFF2 known-table index (spec §5.1), enough to name every table here. */
const KNOWN = ["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ", "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp", "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF", "GPOS", "GSUB"];

function tables(file: Buffer): Map<string, Buffer> {
  const count = file.readUInt16BE(12);
  let p = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const c = file[p++]!;
      v = (v << 7) | (c & 0x7f);
      if (!(c & 0x80)) return v;
    }
    throw new Error("bad UIntBase128");
  };
  const dir: { tag: string; length: number }[] = [];
  for (let i = 0; i < count; i++) {
    const flags = file[p++]!;
    let tag: string;
    if ((flags & 0x3f) === 0x3f) {
      tag = file.toString("latin1", p, p + 4);
      p += 4;
    } else tag = KNOWN[flags & 0x3f] ?? `#${flags & 0x3f}`;
    const version = (flags >> 6) & 3;
    let length = base128();
    const transformed = tag === "glyf" || tag === "loca" ? version === 0 : version !== 0;
    if (transformed) length = base128();
    dir.push({ tag, length });
  }
  const data = brotliDecompressSync(file.subarray(p, p + file.readUInt32BE(20)));
  const out = new Map<string, Buffer>();
  let offset = 0;
  for (const { tag, length } of dir) {
    out.set(tag, data.subarray(offset, offset + length));
    offset += length;
  }
  return out;
}

const font = tables(readFileSync(FONT));

function features(tag: "GSUB" | "GPOS"): Set<string> {
  const t = font.get(tag);
  if (!t) return new Set();
  const list = t.readUInt16BE(6);
  const n = t.readUInt16BE(list);
  return new Set(Array.from({ length: n }, (_, i) => t.toString("latin1", list + 2 + i * 6, list + 6 + i * 6)));
}

function glyphFor(code: number): number {
  const cmap = font.get("cmap")!;
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const offset = cmap.readUInt32BE(8 + i * 8);
    if (cmap.readUInt16BE(4 + i * 8) !== 3 || cmap.readUInt16BE(offset) !== 4) continue;
    const segX2 = cmap.readUInt16BE(offset + 6);
    const ends = offset + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      if (cmap.readUInt16BE(ends + s * 2) < code) continue;
      const start = cmap.readUInt16BE(starts + s * 2);
      if (start > code) return 0;
      const delta = cmap.readInt16BE(deltas + s * 2);
      const range = cmap.readUInt16BE(ranges + s * 2);
      if (!range) return (code + delta) & 0xffff;
      const g = cmap.readUInt16BE(ranges + s * 2 + range + (code - start) * 2);
      return g ? (g + delta) & 0xffff : 0;
    }
  }
  throw new Error("no Windows Unicode BMP cmap");
}

function advance(glyph: number): number {
  const metrics = font.get("hhea")!.readUInt16BE(34);
  return font.get("hmtx")!.readUInt16BE(Math.min(glyph, metrics - 1) * 4);
}

test("Aspekta ships no tnum feature, so tabular-nums is a no-op (ADR 0011 item 5)", () => {
  assert.equal(
    features("GSUB").has("tnum"),
    false,
    "Aspekta now ships tnum: remove the 'no tabular figures' knownGaps lines and assert the feature here instead.",
  );
});

test("Aspekta's default digits are proportional", () => {
  const widths = [..."0123456789"].map((d) => advance(glyphFor(d.charCodeAt(0))));
  assert.equal(widths.every((w) => w > 0), true, "every digit maps to a glyph with an advance");
  // "1" is 367 units, "0" is 602: a 1 beside a 0 in the same column is ~0.24em short.
  assert.deepEqual([Math.min(...widths), Math.max(...widths)], [367, 602]);
});
