import { ReportDetailSchema, ReportListSchema, ReportSchema, type CreateReportInputType } from "@neighbourly/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, query } from "@/lib/api";
import { uploadPhoto } from "@/lib/upload";
import type { PickedPhoto } from "@/components/PhotoPicker";

export interface ReportFilters {
  category?: string;
  status?: string;
  scope?: "all" | "mine";
  neighbourhood?: string;
}

export const reportKeys = {
  all: ["reports"] as const,
  list: (f: ReportFilters) => ["reports", "list", f] as const,
  detail: (id: string) => ["reports", "detail", id] as const,
};

export function useReports(filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.list(filters),
    queryFn: () => api(`/api/reports${query({ ...filters })}`, { schema: ReportListSchema }),
    placeholderData: keepPreviousData,
  });
}

export function useReport(id: string) {
  return useQuery({ queryKey: reportKeys.detail(id), queryFn: () => api(`/api/reports/${id}`, { schema: ReportDetailSchema }) });
}

function useInvalidateReports() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: reportKeys.all });
    void qc.invalidateQueries({ queryKey: ["feed"] });
    void qc.invalidateQueries({ queryKey: ["alerts"] });
  };
}

export function useCreateReport() {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: async ({ input, photo }: { input: Omit<CreateReportInputType, "photoPath">; photo: PickedPhoto | null }) => {
      const photoPath = photo ? await uploadPhoto(photo.blob, "report") : null;
      return api("/api/reports", { body: { ...input, photoPath }, schema: ReportSchema });
    },
    onSuccess: invalidate,
  });
}

export function useToggleSupport(id: string) {
  const invalidate = useInvalidateReports();
  return useMutation({
    mutationFn: () => api(`/api/reports/${id}/support`, { method: "POST", schema: ReportSchema }),
    onSuccess: invalidate,
  });
}

export function useAddReportComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api(`/api/reports/${id}/comments`, { body: { body }, schema: ReportDetailSchema }),
    onSuccess: (detail) => {
      qc.setQueryData(reportKeys.detail(id), detail);
      void qc.invalidateQueries({ queryKey: ["reports", "list"] });
    },
  });
}
