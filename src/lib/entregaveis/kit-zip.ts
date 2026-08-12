// F020 — monta kits .zip a partir do catálogo + content/entregaveis/.

import { entregavelPorSlug, type KitZip } from "./catalogo";
import { lerArquivoEntregavel } from "./servir";
import { montarZip, type ArquivoZip } from "./zip";

export async function montarKitZipPorSlug(
  slug: string,
): Promise<{ body: Buffer; nomeArquivo: string } | null> {
  const item = entregavelPorSlug(slug);
  if (!item?.kitZip || !item.pasta) return null;

  const body = await montarKitZip(item.pasta, item.kitZip);
  if (!body) return null;
  return { body, nomeArquivo: item.kitZip.nomeArquivo };
}

export async function montarKitZip(
  pasta: string,
  kit: KitZip,
): Promise<Buffer | null> {
  const arquivos: ArquivoZip[] = [];

  for (const relativo of kit.arquivos) {
    const lido = await lerArquivoEntregavel([pasta, ...relativo.split("/")]);
    if (!lido) return null;
    arquivos.push({
      nome: `${kit.pastaInterna}/${relativo}`,
      conteudo: lido.body,
    });
  }

  return montarZip(arquivos);
}
