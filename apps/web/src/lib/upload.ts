import { z } from "zod";
import { api } from "./api";

const SignedUploadSchema = z.object({ uploadUrl: z.string(), path: z.string() });

/**
 * Signed-URL upload: ask the API for a short-lived upload URL, then PUT the file straight
 * to storage. Photos never pass through the API server (plan section 6.5).
 */
export async function uploadPhoto(blob: Blob, purpose: "report" | "food"): Promise<string> {
  const { uploadUrl, path } = await api("/api/uploads", {
    body: { contentType: blob.type, size: blob.size, purpose },
    schema: SignedUploadSchema,
  });
  const res = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": blob.type }, body: blob });
  if (!res.ok) throw new Error("Photo upload failed. Please try again.");
  return path;
}
