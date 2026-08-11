import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: NOME_PRODUTO,
  description: "Motor de prospecção para alunos — Leads prontos com Dor e Outreach",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
