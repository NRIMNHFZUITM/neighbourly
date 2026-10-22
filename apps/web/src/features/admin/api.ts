import {
  AdminBookingListSchema,
  AdminBookingSchema,
  AdminOverviewSchema,
  AdminReportListSchema,
  AdminReportSchema,
  AdminTicketListSchema,
  AdminTicketSchema,
  PostSchema,
  VerificationRequestListSchema,
  VerificationRequestSchema,
  type CreateAlertInputType,
  type MaintenanceBlockInputType,
  type UpdateReportInputType,
} from "@neighbourly/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, query } from "@/lib/api";

export const adminKeys = {
  overview: ["admin", "overview"] as const,
  reports: (f: object) => ["admin", "reports", f] as const,
  bookings: (view: string) => ["admin", "bookings", view] as const,
  verifications: ["admin", "verifications"] as const,
  tickets: ["admin", "tickets"] as const,
};

/** Dashboard counts refresh on a short interval (plan 7.3, step 6: "query refresh"). */
export const useAdminOverview = () =>
  useQuery({ queryKey: adminKeys.overview, queryFn: () => api("/api/admin/overview", { schema: AdminOverviewSchema }), refetchInterval: 15_000 });

export const useAdminReports = (f: { status?: string; category?: string }) =>
  useQuery({
    queryKey: adminKeys.reports(f),
    queryFn: () => api(`/api/admin/reports${query({ ...f })}`, { schema: AdminReportListSchema }),
    placeholderData: keepPreviousData,
  });

function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["admin"] });
    void qc.invalidateQueries({ queryKey: ["reports"] });
    void qc.invalidateQueries({ queryKey: ["feed"] });
    void qc.invalidateQueries({ queryKey: ["availability"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useUpdateReport() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateReportInputType & { id: string }) =>
      api(`/api/admin/reports/${id}`, { method: "PATCH", body: input, schema: AdminReportSchema }),
    onSuccess: invalidate,
  });
}

export function useReplyToReport() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api(`/api/admin/reports/${id}/reply`, { body: { body }, schema: AdminReportSchema }),
    onSuccess: invalidate,
  });
}

export const useAdminBookings = (view: "pending" | "upcoming") =>
  useQuery({ queryKey: adminKeys.bookings(view), queryFn: () => api(`/api/admin/bookings${query({ view })}`, { schema: AdminBookingListSchema }) });

export function useDecideBooking() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: "approve" | "reject"; note?: string }) =>
      api(`/api/admin/bookings/${id}/${action}`, { body: { note }, schema: AdminBookingSchema }),
    onSuccess: invalidate,
  });
}

export function useCreateMaintenance() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (input: MaintenanceBlockInputType) => api("/api/admin/maintenance", { body: input, schema: AdminBookingSchema }),
    onSuccess: invalidate,
  });
}

export const useVerifications = () =>
  useQuery({ queryKey: adminKeys.verifications, queryFn: () => api("/api/admin/verifications", { schema: VerificationRequestListSchema }) });

export function useDecideVerification() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: "approve" | "reject" }) =>
      api(`/api/admin/verifications/${userId}/${action}`, { method: "POST", schema: VerificationRequestSchema }),
    onSuccess: invalidate,
  });
}

export const useAdminTickets = () => useQuery({ queryKey: adminKeys.tickets, queryFn: () => api("/api/admin/tickets", { schema: AdminTicketListSchema }) });

export function useCloseTicket() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (id: string) => api(`/api/admin/tickets/${id}/close`, { method: "POST", schema: AdminTicketSchema }),
    onSuccess: invalidate,
  });
}

export function useCreateAlert() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (input: CreateAlertInputType) => api("/api/admin/alerts", { body: input, schema: PostSchema }),
    onSuccess: invalidate,
  });
}
