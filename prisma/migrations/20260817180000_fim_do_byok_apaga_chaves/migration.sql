-- F016 — encerramento do BYOK: as chaves dos alunos saem do banco.
-- Spec: /specs/02-features/F016-configuracao-de-chaves.md ("Encerramento")
--
-- Não é limpeza cosmética. Guardar credencial de um terceiro que o app não usa
-- mais é dado sem finalidade — e o levantamento de 2026-08-17 no staging achou
-- 33 chaves do Google guardadas, das quais 32 já eram de contas em modo `orion`
-- (ou seja, paradas sem uso desde antes desta decisão).
--
-- Só DADO. Nenhuma coluna é derrubada: a máquina do BYOK fica no código,
-- desligada pela flag `BYOK_NOVOS_ALUNOS` (mesmo padrão da pausa de planos da
-- F035). Reabrir a flag devolve a tela; as chaves, não — cada aluno cola a dele
-- de novo, o que é o comportamento certo depois de um apagamento.
--
-- Irreversível por natureza: o texto em claro nunca esteve aqui (ADR-009), e o
-- ciphertext apagado não volta nem com a master key.

UPDATE "user_api_keys" SET
  key_mode = 'orion',

  google_ciphertext = NULL,
  google_iv = NULL,
  google_auth_tag = NULL,
  google_last4 = NULL,
  google_status = 'faltando',

  anthropic_ciphertext = NULL,
  anthropic_iv = NULL,
  anthropic_auth_tag = NULL,
  anthropic_last4 = NULL,
  anthropic_status = 'faltando',

  openai_ciphertext = NULL,
  openai_iv = NULL,
  openai_auth_tag = NULL,
  openai_last4 = NULL,
  openai_status = 'faltando',

  gemini_ciphertext = NULL,
  gemini_iv = NULL,
  gemini_auth_tag = NULL,
  gemini_last4 = NULL,
  gemini_status = 'faltando',

  screenshotone_ciphertext = NULL,
  screenshotone_iv = NULL,
  screenshotone_auth_tag = NULL,
  screenshotone_last4 = NULL,
  screenshotone_status = 'faltando';
