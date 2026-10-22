import {
  AuthResponseSchema,
  DemoAccountSchema,
  MeSchema,
  PublicStatsSchema,
  type AuthResponse,
  type Me,
  type RequestApprovalInputType,
  type ShopApplicationInputType,
  type SignupInputType,
  type UpdateMeInputType,
} from "@neighbourly/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { z } from "zod";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useChatStore } from "../chat/store";

export const meKey = ["me"] as const;

export function useMe() {
  const token = useSession((s) => s.token);
  return useQuery({
    queryKey: meKey,
    queryFn: () => api("/api/me", { schema: MeSchema }),
    enabled: !!token,
    staleTime: 60_000,
  });
}

/** For components rendered inside the auth guards, where the user is always loaded. */
export function useCurrentUser(): Me {
  const { data } = useMe();
  if (!data) throw new Error("useCurrentUser used outside an authenticated route");
  return data;
}

export const homePathFor = (me: Pick<Me, "role" | "verification" | "onboarded">) => {
  if (me.role !== "admin" && me.verification !== "verified") return "/verify";
  if (me.role !== "admin" && !me.onboarded) return "/onboarding";
  return me.role === "admin" ? "/admin" : "/home";
};

/** Stores the new session and drops everything cached for the previous account. */
export function useStartSession() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return (auth: AuthResponse, opts: { redirect?: boolean } = { redirect: true }) => {
    useSession.getState().setToken(auth.token);
    queryClient.clear();
    useChatStore.getState().reset();
    queryClient.setQueryData(meKey, auth.user);
    if (opts.redirect !== false) navigate(homePathFor(auth.user), { replace: true });
  };
}

export function useLogin() {
  const start = useStartSession();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) => api("/api/auth/login", { body: input, schema: AuthResponseSchema }),
    onSuccess: (auth) => start(auth),
  });
}

export function useDemoLogin() {
  const start = useStartSession();
  return useMutation({
    mutationFn: (userId: string) => api("/api/auth/demo-login", { body: { userId }, schema: AuthResponseSchema }),
    onSuccess: (auth) => start(auth),
  });
}

export function useSignup() {
  const start = useStartSession();
  return useMutation({
    mutationFn: (input: SignupInputType) => api("/api/auth/signup", { body: input, schema: AuthResponseSchema }),
    onSuccess: (auth) => start(auth),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return () => {
    void api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    useSession.getState().setToken(null);
    useChatStore.getState().reset();
    queryClient.clear();
    navigate("/", { replace: true });
  };
}

export function useDemoAccounts() {
  return useQuery({
    queryKey: ["demo-accounts"],
    queryFn: () => api("/api/auth/demo-accounts", { schema: z.array(DemoAccountSchema) }),
    staleTime: Infinity,
  });
}

function useMeMutation<TInput>(path: string, method: "POST" | "PATCH" = "POST") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => api(path, { method, body: input, schema: MeSchema }),
    onSuccess: (me) => queryClient.setQueryData(meKey, me),
  });
}

export const useVerifyUnit = () => useMeMutation<{ code: string }>("/api/auth/verify-unit");
export const useRequestApproval = () => useMeMutation<RequestApprovalInputType>("/api/auth/request-approval");
export const useShopApplication = () => useMeMutation<ShopApplicationInputType>("/api/auth/shop-application");
export const useUpdateMe = () => useMeMutation<UpdateMeInputType>("/api/me", "PATCH");

export function usePublicStats() {
  return useQuery({ queryKey: ["public-stats"], queryFn: () => api("/api/public/stats", { schema: PublicStatsSchema }) });
}
