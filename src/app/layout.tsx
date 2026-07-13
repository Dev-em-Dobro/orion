import type { Metadata } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-sans",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
});

export const metadata: Metadata = {
  title: "Orion",
  description: "Motor de prospecção — encontre e feche clientes locais",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${firaSans.variable} ${firaCode.variable}`}>
      <body className="font-sans antialiased">
        <Sidebar />
        <div className="md:pl-60">{children}</div>
      </body>
    </html>
  );
}
