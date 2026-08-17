import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Libre_Bodoni } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { NOME_PRODUTO } from "@/lib/produto";
import "./globals.css";

export const dynamic = "force-dynamic";

// Inter no lugar de Fira Sans (2026-08-11): x-height alto, desenhada para UI
// de tela. Mesmo tamanho em px, leitura maior. JetBrains Mono para número —
// tabular por construção, com zero cortado, que num painel de score importa.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

// F012 (emenda visual 2026-08-16) — display serif da folha A4 da Proposta.
//
// `preload: false` porque ela não aparece em tela nenhuma: só é usada dentro do
// `@media print` de `globals.css`. Sem isso o Next mandaria um `<link rel=
// "preload">` em toda rota pra baixar uma fonte que ninguém vê até clicar em
// "Baixar PDF" — o mesmo pedágio que a F028 tirou do medidor de uso, agora em
// bytes. Com a regra dentro de `@media print`, o navegador só busca o arquivo
// quando a impressão abre.
const libreBodoni = Libre_Bodoni({
  subsets: ["latin"],
  weight: ["600"],
  preload: false,
  variable: "--font-libre-bodoni",
});

export const metadata: Metadata = {
  // `template` faz a aba virar "Leads · Orion Lead Hunter": quem trabalha com
  // varias abas abertas precisa distinguir a rota E saber de qual app e.
  title: {
    default: NOME_PRODUTO,
    template: `%s · ${NOME_PRODUTO}`,
  },
  description: "Motor de prospecção para alunos — Leads prontos com Dor e Abordagem",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable} ${libreBodoni.variable}`}
    >
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
