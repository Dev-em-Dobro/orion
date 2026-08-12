// Monta ZIP sem compressão (STORE) — suficiente para kits de markdown/HTML.

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export type ArquivoZip = {
  /** Caminho relativo dentro do zip (ex.: meu-portfolio/index.html). */
  nome: string;
  conteudo: Buffer;
};

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

/** Zip PKZIP 2.0 com método STORE (sem deflate). */
export function montarZip(arquivos: ArquivoZip[]): Buffer {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let offset = 0;

  for (const arq of arquivos) {
    const nomeBuf = Buffer.from(arq.nome, "utf8");
    const crc = crc32(arq.conteudo);
    const size = arq.conteudo.length;

    const local = Buffer.concat([
      u32(0x04034b50), // local file header
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method STORE
      u16(0), // mod time
      u16(0), // mod date
      u32(crc),
      u32(size),
      u32(size),
      u16(nomeBuf.length),
      u16(0), // extra len
      nomeBuf,
      arq.conteudo,
    ]);

    const central = Buffer.concat([
      u32(0x02014b50), // central directory
      u16(20), // version made by
      u16(20), // version needed
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(size),
      u32(size),
      u16(nomeBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nomeBuf,
    ]);

    locais.push(local);
    centrais.push(central);
    offset += local.length;
  }

  const centralDir = Buffer.concat(centrais);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(arquivos.length),
    u16(arquivos.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...locais, centralDir, end]);
}
