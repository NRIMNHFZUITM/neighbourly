import { z } from "zod";
import { CLAIM_STATUSES, DIETARY_TAGS, FOOD_STATUSES, FOOD_TYPES, HALAL_STATUSES } from "../constants";
import { IdentitySchema, LatLngSchema, isoDate } from "./common";

export const FoodClaimSchema = z.object({
  id: z.string(),
  status: z.enum(CLAIM_STATUSES),
  note: z.string().nullable(),
  createdAt: isoDate(),
  claimer: IdentitySchema,
  /** Shown to the claimer and the giver once confirmed, so no phone numbers need to be swapped. */
  pickupCode: z.string().nullable(),
});
export type FoodClaim = z.infer<typeof FoodClaimSchema>;

export const FoodListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  foodType: z.enum(FOOD_TYPES),
  quantity: z.string(),
  estWeightKg: z.number(),
  halal: z.enum(HALAL_STATUSES),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)),
  photoUrl: z.string().nullable(),
  /** A public meeting point chosen by the giver (exact home addresses stay private). */
  pickupPoint: z.string(),
  location: LatLngSchema,
  neighbourhoodId: z.string(),
  pickupStart: isoDate(),
  pickupEnd: isoDate(),
  expiresAt: isoDate(),
  status: z.enum(FOOD_STATUSES),
  giver: IdentitySchema,
  fromShop: z.boolean(),
  priceNote: z.string().nullable(),
  isMine: z.boolean(),
  /** Open requests (an aggregate, safe to show everyone). */
  requests: z.number().int(),
  myClaim: FoodClaimSchema.nullable(),
  createdAt: isoDate(),
});
export type FoodListing = z.infer<typeof FoodListingSchema>;

export const FoodListingDetailSchema = FoodListingSchema.extend({
  /** Populated for the giver and admins only. */
  claims: z.array(FoodClaimSchema),
});
export type FoodListingDetail = z.infer<typeof FoodListingDetailSchema>;

export const CreateFoodInput = z
  .object({
    title: z.string().trim().min(3, "Add a title").max(80),
    description: z.string().trim().max(500),
    foodType: z.enum(FOOD_TYPES),
    quantity: z.string().trim().min(1, "How much is there?").max(40),
    estWeightKg: z.number().min(0.1, "At least 0.1 kg").max(50),
    halal: z.enum(HALAL_STATUSES),
    dietaryTags: z.array(z.enum(DIETARY_TAGS)),
    photoPath: z.string().nullable(),
    pickupPoint: z.string().trim().min(3, "Where should neighbours pick it up?").max(80),
    location: LatLngSchema,
    pickupStart: isoDate(),
    pickupEnd: isoDate(),
    expiresAt: isoDate(),
    priceNote: z.string().trim().max(40).nullable(),
  })
  .refine((v) => new Date(v.pickupEnd) > new Date(v.pickupStart), {
    message: "Pickup must end after it starts",
    path: ["pickupEnd"],
  });
export type CreateFoodInputType = z.infer<typeof CreateFoodInput>;

export const ClaimInput = z.object({
  note: z.string().trim().max(200).optional(),
});

export const ImpactSchema = z.object({
  me: z.object({
    shared: z.number().int(),
    givenKg: z.number(),
    received: z.number().int(),
    receivedKg: z.number(),
  }),
  community: z.object({
    listings: z.number().int(),
    collected: z.number().int(),
    kgSaved: z.number(),
    kgThisMonth: z.number(),
    neighboursHelped: z.number().int(),
    shopsParticipating: z.number().int(),
    kgFromShops: z.number(),
    kgFromResidents: z.number(),
  }),
  weekly: z.array(z.object({ week: z.string(), residentsKg: z.number(), shopsKg: z.number() })),
});
export type Impact = z.infer<typeof ImpactSchema>;

export const FoodListSchema = z.array(FoodListingSchema);
