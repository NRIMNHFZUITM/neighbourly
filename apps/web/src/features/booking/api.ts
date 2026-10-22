import {
  AvailabilitySchema,
  BookingListSchema,
  BookingSchema,
  FacilityListSchema,
  FacilitySchema,
  type CreateBookingInputType,
  type RescheduleBookingInputType,
} from "@neighbourly/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, query } from "@/lib/api";

export const bookingKeys = {
  facilities: ["facilities"] as const,
  facility: (id: string) => ["facilities", id] as const,
  availability: (id: string, from: string, days: number) => ["availability", id, from, days] as const,
  mine: ["bookings", "mine"] as const,
};

export const useFacilities = () =>
  useQuery({ queryKey: bookingKeys.facilities, queryFn: () => api("/api/facilities", { schema: FacilityListSchema }), staleTime: 5 * 60_000 });

export const useFacility = (id: string) =>
  useQuery({ queryKey: bookingKeys.facility(id), queryFn: () => api(`/api/facilities/${id}`, { schema: FacilitySchema }), staleTime: 5 * 60_000 });

export function useAvailability(id: string, from: string, days: number) {
  return useQuery({
    queryKey: bookingKeys.availability(id, from, days),
    queryFn: () => api(`/api/facilities/${id}/availability${query({ from, days })}`, { schema: AvailabilitySchema }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export const useMyBookings = () => useQuery({ queryKey: bookingKeys.mine, queryFn: () => api("/api/bookings/mine", { schema: BookingListSchema }) });

function useInvalidateBookings() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["availability"] });
    void qc.invalidateQueries({ queryKey: bookingKeys.mine });
    void qc.invalidateQueries({ queryKey: ["admin"] });
  };
}

export function useCreateBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: CreateBookingInputType) => api("/api/bookings", { body: input, schema: BookingSchema }),
    onSuccess: invalidate,
  });
}

export function useCancelBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (id: string) => api(`/api/bookings/${id}/cancel`, { method: "POST", schema: BookingSchema }),
    onSuccess: invalidate,
  });
}

export function useRescheduleBooking() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: ({ id, ...input }: RescheduleBookingInputType & { id: string }) =>
      api(`/api/bookings/${id}/reschedule`, { body: input, schema: BookingSchema }),
    onSuccess: invalidate,
  });
}
