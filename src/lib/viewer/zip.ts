// Minimal ZIP writer, "store" method only (no compression). This is legal
// per the ZIP spec and is all a 3MF file needs — 3MF readers accept
// uncompressed entries, and mesh XML doesn't need to be small. Written from
// scratch (no dependency) since store-method ZIP is a small, well-defined
// binary format: local file headers + central directory + end record.

const LOCAL_FILE_SIG = 0x04034b50;
const CENTRAL_DIR_SIG = 0x02014b50;
const END_OF_CENTRAL_DIR_SIG = 0x06054b50;

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// DOS date/time encoding used by the ZIP format (local + central headers).
function dosDateTime(d: Date): { time: number; date: number } {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

class ByteWriter {
  private chunks: Uint8Array[] = [];
  private length = 0;

  push(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  uint16(n: number) {
    const b = new Uint8Array(2);
    new DataView(b.buffer).setUint16(0, n, true);
    this.push(b);
  }

  uint32(n: number) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, n, true);
    this.push(b);
  }

  bytes(b: Uint8Array) {
    this.push(b);
  }

  get offset() {
    return this.length;
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.length);
    let pos = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, pos);
      pos += chunk.length;
    }
    return out;
  }
}

export function createZipStore(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const writer = new ByteWriter();
  const now = new Date();
  const { time, date } = dosDateTime(now);

  const centralDirectoryEntries: { nameBytes: Uint8Array; crc: number; size: number; localHeaderOffset: number }[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeaderOffset = writer.offset;

    writer.uint32(LOCAL_FILE_SIG);
    writer.uint16(20); // version needed to extract
    writer.uint16(0); // general purpose bit flag
    writer.uint16(0); // compression method: stored
    writer.uint16(time);
    writer.uint16(date);
    writer.uint32(crc);
    writer.uint32(entry.data.length); // compressed size == uncompressed for "stored"
    writer.uint32(entry.data.length);
    writer.uint16(nameBytes.length);
    writer.uint16(0); // extra field length
    writer.bytes(nameBytes);
    writer.bytes(entry.data);

    centralDirectoryEntries.push({ nameBytes, crc, size: entry.data.length, localHeaderOffset });
  }

  const centralDirectoryStart = writer.offset;

  for (const cd of centralDirectoryEntries) {
    writer.uint32(CENTRAL_DIR_SIG);
    writer.uint16(20); // version made by
    writer.uint16(20); // version needed to extract
    writer.uint16(0); // general purpose bit flag
    writer.uint16(0); // compression method
    writer.uint16(time);
    writer.uint16(date);
    writer.uint32(cd.crc);
    writer.uint32(cd.size);
    writer.uint32(cd.size);
    writer.uint16(cd.nameBytes.length);
    writer.uint16(0); // extra field length
    writer.uint16(0); // file comment length
    writer.uint16(0); // disk number start
    writer.uint16(0); // internal file attributes
    writer.uint32(0); // external file attributes
    writer.uint32(cd.localHeaderOffset);
    writer.bytes(cd.nameBytes);
  }

  const centralDirectorySize = writer.offset - centralDirectoryStart;

  writer.uint32(END_OF_CENTRAL_DIR_SIG);
  writer.uint16(0); // number of this disk
  writer.uint16(0); // disk where central directory starts
  writer.uint16(centralDirectoryEntries.length); // records on this disk
  writer.uint16(centralDirectoryEntries.length); // total records
  writer.uint32(centralDirectorySize);
  writer.uint32(centralDirectoryStart);
  writer.uint16(0); // comment length

  return writer.toUint8Array();
}
