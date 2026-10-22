import { PlacesSchema } from "@neighbourly/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const usePlaces = () => useQuery({ queryKey: ["places"], queryFn: () => api("/api/places", { schema: PlacesSchema }) });
