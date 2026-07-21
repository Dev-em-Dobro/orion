-- F017 — provedor de IA escolhido pelo aluno (default anthropic).

CREATE TYPE "LlmProvider" AS ENUM ('anthropic', 'openai', 'gemini');

ALTER TABLE "user_api_keys"
  ADD COLUMN "llm_provider" "LlmProvider" NOT NULL DEFAULT 'anthropic';
