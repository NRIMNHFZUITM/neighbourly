import {
  FoodListSchema,
  FoodListingDetailSchema,
  ImpactSchema,
  type CreateFoodInputType,
  type FoodListingDetail,
} from "@neighbourly/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, query } from "@/lib/api";
import { uploadPhoto } from "@/lib/upload";
import type { PickedPhoto } from "@/components/PhotoPicker";

export interface FoodFilters {
  view?: "active" | "mine";
  type?: string;
  halal?: boolean;
  source?: "all" | "shops" | "residents";
}

export const foodKeys = {
  all: ["food"] as const,
  list: (f: FoodFilters) => ["food", "list", f] as const,
  detail: (id: string) => ["food", "detail", id] as const,
  impact: ["food", "impact"] as const,
};

export function useFoodListings(filters: FoodFilters) {
  return useQuery({
    queryKey: foodKeys.list(filters),
    queryFn: () => api(`/api/food${query({ ...filters, halal: filters.halal || undefined })}`, { schema: FoodListSchema }),
    placeholderData: keepPreviousData,
  });
}

export function useFoodListing(id: string) {
  return useQuery({ queryKey: foodKeys.detail(id), queryFn: () => api(`/api/food/${id}`, { schema: FoodListingDetailSchema }) });
}

export function useImpact() {
  return useQuery({ queryKey: foodKeys.impact, queryFn: () => api("/api/food/impact", { schema: ImpactSchema }) });
}

function useListingMutation<TVars = void>(id: string, request: (vars: TVars) => Promise<FoodListingDetail>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (detail) => {
      qc.setQueryData(foodKeys.detail(id), detail);
      void qc.invalidateQueries({ queryKey: ["food", "list"] });
      void qc.invalidateQueries({ queryKey: foodKeys.impact });
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

const post = (path: string, body?: unknown) =>
  api(path, { method: "POST", body: body ?? {}, schema: FoodListingDetailSchema });

export const useRequestFood = (id: string) => useListingMutation(id, (note: string) => post(`/api/food/${id}/claims`, { note: note || undefined }));
export const useConfirmClaim = (id: string) => useListingMutation(id, (claimId: string) => post(`/api/food/${id}/claims/${claimId}/confirm`));
export const useDeclineClaim = (id: string) => useListingMutation(id, (claimId: string) => post(`/api/food/${id}/claims/${claimId}/decline`));
export const useCancelClaim = (id: string) => useListingMutation(id, (claimId: string) => post(`/api/food/${id}/claims/${claimId}/cancel`));
export const useMarkCollected = (id: string) => useListingMutation(id, () => post(`/api/food/${id}/collected`));
export const useCancelListing = (id: string) => useListingMutation(id, () => post(`/api/food/${id}/cancel`));

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, photo }: { input: Omit<CreateFoodInputType, "photoPath">; photo: PickedPhoto | null }) => {
      const photoPath = photo ? await uploadPhoto(photo.blob, "food") : null;
      return api("/api/food", { body: { ...input, photoPath }, schema: FoodListingDetailSchema });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: foodKeys.all });
      void qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
