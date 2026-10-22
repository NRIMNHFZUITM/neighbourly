import { NotificationListSchema } from "@neighbourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const notificationsKey = ["notifications"] as const;

/** Polled every 10 seconds: "realtime enough" for the demo; Supabase Realtime can replace it later. */
export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () => api("/api/notifications", { schema: NotificationListSchema }),
    refetchInterval: 10_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationsKey }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationsKey }),
  });
}
