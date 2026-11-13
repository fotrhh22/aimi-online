import { z } from "zod";
export const Nickname = z
  .string()
  .trim()
  .transform((value) => value.normalize("NFC").replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(2)
      .max(12)
      .regex(/^[\p{L}\p{N}_ ]+$/u),
  );
export const ProfileInput = z.object({ name: Nickname }).strict();
