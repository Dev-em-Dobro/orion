// F014 — route handlers do Better Auth (OAuth callback + magic link).

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
