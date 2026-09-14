import { createHash } from "node:crypto";

export function hashSha256(texto: string) {
  return createHash("sha256").update(texto).digest("hex");
}
