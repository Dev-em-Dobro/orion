import { BannerChaves } from "@/components/banner-chaves";
import { SugerirForm } from "./sugerir-form";

export default function ConteudoPage() {
  return (
    <>
      <BannerChaves />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Vídeo-Funil</h1>
        <p className="mt-1 text-sm text-muted">
          Ideias de vídeo pro YouTube que funcionam como funil e levam ao
          diagnóstico gratuito (F007).
        </p>

        <div className="mt-6">
          <SugerirForm />
        </div>
      </main>
    </>
  );
}
