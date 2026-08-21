-- F038 — Abordagem por voz (ligacao ou audio).
-- Spec: /specs/02-features/F038-abordagem-por-voz.md
--
-- Canal novo, e nao um `tipo` de whatsapp: o conteudo e um ROTEIRO PRA FALAR,
-- nao um texto pra enviar. Oferecer "Abrir no WhatsApp" nele seria a acao
-- errada em destaque, e o historico da aba precisa distinguir o que foi
-- escrito do que foi falado.
--
-- ADD VALUE e aditivo: nenhum registro existente muda de valor.

-- AlterEnum
ALTER TYPE "Canal" ADD VALUE 'ligacao';
