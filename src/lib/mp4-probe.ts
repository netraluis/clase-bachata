// Lee del contenedor MP4 el códec, las dimensiones y la duración sin
// decodificar nada: solo recorre las cajas (ftyp/moov/trak/.../stsd).
// Sirve para dos cosas: rechazar HEVC aunque venga en .mp4, y obtener
// width/height/duration cuando el navegador no tiene el códec instalado.

export type Mp4Info = {
  videoCodec: string | null; // 'avc1' (H.264), 'hvc1'/'hev1' (HEVC), 'av01', 'vp09', ...
  audioCodec: string | null; // 'mp4a' (AAC), ...
  width: number | null;
  height: number | null;
  duration: number | null; // segundos
};

const td = new TextDecoder("latin1");

async function readBytes(file: File, start: number, len: number): Promise<DataView> {
  return new DataView(await file.slice(start, start + len).arrayBuffer());
}

// Devuelve [tipo, tamaño, offsetCabecera] de la caja en `pos`
async function boxHeader(file: File, pos: number): Promise<[string, number, number] | null> {
  if (pos + 8 > file.size) return null;
  const v = await readBytes(file, pos, 16);
  let size = v.getUint32(0);
  const type = td.decode(new Uint8Array(v.buffer, 4, 4));
  let hdr = 8;
  if (size === 1) {
    size = Number(v.getBigUint64(8));
    hdr = 16;
  } else if (size === 0) {
    size = file.size - pos;
  }
  if (size < hdr) return null;
  return [type, size, hdr];
}

function* boxes(buf: DataView, start: number, end: number): Generator<[string, number, number]> {
  let pos = start;
  while (pos + 8 <= end) {
    let size = buf.getUint32(pos);
    const type = td.decode(new Uint8Array(buf.buffer, buf.byteOffset + pos + 4, 4));
    let hdr = 8;
    if (size === 1) {
      size = Number(buf.getBigUint64(pos + 8));
      hdr = 16;
    } else if (size === 0) size = end - pos;
    if (size < hdr) return;
    yield [type, pos + hdr, pos + size];
    pos += size;
  }
}

function find(buf: DataView, start: number, end: number, path: string[]): [number, number] | null {
  let range: [number, number] = [start, end];
  for (const name of path) {
    let hit: [number, number] | null = null;
    for (const [t, s, e] of boxes(buf, range[0], range[1])) {
      if (t === name) {
        hit = [s, e];
        break;
      }
    }
    if (!hit) return null;
    range = hit;
  }
  return range;
}

export async function probeMp4(file: File): Promise<Mp4Info | null> {
  // 1. Localizar moov entre las cajas de primer nivel (puede estar al final)
  let pos = 0;
  let moov: [number, number] | null = null;
  for (let i = 0; i < 64 && pos < file.size; i++) {
    const h = await boxHeader(file, pos);
    if (!h) break;
    const [type, size, hdr] = h;
    if (type === "moov") {
      moov = [pos + hdr, pos + size];
      break;
    }
    pos += size;
  }
  if (!moov || moov[1] - moov[0] > 32 * 1024 * 1024) return null;

  const buf = await readBytes(file, moov[0], moov[1] - moov[0]);
  const info: Mp4Info = { videoCodec: null, audioCodec: null, width: null, height: null, duration: null };

  // 2. Duración: mvhd
  const mvhd = find(buf, 0, buf.byteLength, ["mvhd"]);
  if (mvhd) {
    const version = buf.getUint8(mvhd[0]);
    if (version === 1) {
      const timescale = buf.getUint32(mvhd[0] + 20);
      const duration = Number(buf.getBigUint64(mvhd[0] + 24));
      info.duration = duration / timescale;
    } else {
      const timescale = buf.getUint32(mvhd[0] + 12);
      const duration = buf.getUint32(mvhd[0] + 16);
      info.duration = duration / timescale;
    }
  }

  // 3. Cada trak: hdlr (vide/soun) + stsd (códec, dimensiones) + tkhd (rotación)
  for (const [t, s, e] of boxes(buf, 0, buf.byteLength)) {
    if (t !== "trak") continue;
    const hdlr = find(buf, s, e, ["mdia", "hdlr"]);
    if (!hdlr) continue;
    const handler = td.decode(new Uint8Array(buf.buffer, buf.byteOffset + hdlr[0] + 8, 4));
    const stsd = find(buf, s, e, ["mdia", "minf", "stbl", "stsd"]);
    if (!stsd) continue;
    // stsd: version/flags (4) + entry_count (4) + primera entrada
    const entryStart = stsd[0] + 8;
    const codec = td.decode(new Uint8Array(buf.buffer, buf.byteOffset + entryStart + 4, 4));

    if (handler === "vide" && !info.videoCodec) {
      info.videoCodec = codec;
      // VisualSampleEntry: 8 hdr + 6 reserved + 2 data_ref + 16 predefinidos → width/height
      let w = buf.getUint16(entryStart + 8 + 6 + 2 + 16);
      let h = buf.getUint16(entryStart + 8 + 6 + 2 + 16 + 2);
      // Rotación en la matriz de tkhd: si es 90/270, intercambiar
      const tkhd = find(buf, s, e, ["tkhd"]);
      if (tkhd) {
        const v = buf.getUint8(tkhd[0]);
        const m = tkhd[0] + (v === 1 ? 48 : 36) + 4; // matriz 3x3 fixed 16.16
        const a = buf.getInt32(m) / 65536;
        const b = buf.getInt32(m + 4) / 65536;
        if (Math.abs(a) < 0.01 && Math.abs(b) > 0.99) [w, h] = [h, w];
      }
      info.width = w;
      info.height = h;
    } else if (handler === "soun" && !info.audioCodec) {
      info.audioCodec = codec;
    }
  }

  return info;
}

export function isHevc(codec: string | null): boolean {
  return codec === "hvc1" || codec === "hev1" || codec === "dvh1" || codec === "dvhe";
}

export function isH264(codec: string | null): boolean {
  return codec === "avc1" || codec === "avc3";
}
