import { z } from "zod";

// Only a short-lived SDK code crosses the client/server boundary. Never accept anonKey.
export const AnonymousLogin = z
  .object({ code: z.string().trim().min(1).max(2048) })
  .strict();
export const SessionResult = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  expiresIn: z.number().int().positive(),
});
