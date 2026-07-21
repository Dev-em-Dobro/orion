import type { LlmProviderId } from "./tipos";

export class LlmError extends Error {
  constructor(
    public status: number,
    message: string,
    public provider?: LlmProviderId,
  ) {
    super(message);
    this.name = "LlmError";
  }
}
