import { z } from "zod";

export const isoDate = () => z.iso.datetime({ offset: true });
export const dateKey = () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLngSchema>;

/**
 * How a person appears to the current viewer. Built only by the privacy presenters:
 * when `kind` is "anonymous" there is deliberately no userId or avatar, so an anonymous
 * report or food claim cannot be linked back to a profile.
 */
export const IdentitySchema = z.object({
  kind: z.enum(["person", "anonymous", "shop", "management"]),
  displayName: z.string(),
  userId: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  neighbourhoodId: z.string().nullable(),
  block: z.string().nullable(),
  isYou: z.boolean(),
  /** The person is anonymous to other residents (shown to the owner and admins only). */
  hiddenFromOthers: z.boolean(),
});
export type Identity = z.infer<typeof IdentitySchema>;

export const OkSchema = z.object({ ok: z.literal(true) });

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
