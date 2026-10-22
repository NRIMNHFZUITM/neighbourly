import {
  EventListSchema,
  EventSchema,
  PostDetailSchema,
  PostSchema,
  ProfileActivitySchema,
  PublicProfileListSchema,
  type CreateEventInputType,
  type CreatePostInputType,
  type EventCategory,
  type PostTopic,
} from "@neighbourly/shared";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api, query } from "@/lib/api";

export type Scope = "neighbourhood" | "township";
/** A post topic, or "official" for Township Management announcements and alerts. */
export type TopicFilter = PostTopic | "official" | "all";

export const communityKeys = {
  posts: (scope: Scope, topic: TopicFilter) => ["posts", scope, topic] as const,
  post: (id: string) => ["posts", "detail", id] as const,
  neighbours: (f: object) => ["neighbours", f] as const,
  profile: (id: string) => ["profile", id] as const,
  events: (category: EventCategory | "all") => ["events", category] as const,
};

export const usePosts = (scope: Scope, topic: TopicFilter = "all") =>
  useQuery({
    queryKey: communityKeys.posts(scope, topic),
    queryFn: () => api(`/api/posts${query({ scope, topic })}`, { schema: z.array(PostSchema) }),
    placeholderData: keepPreviousData,
  });

export const usePost = (id: string, enabled = true) =>
  useQuery({ queryKey: communityKeys.post(id), queryFn: () => api(`/api/posts/${id}`, { schema: PostDetailSchema }), enabled });

function useInvalidatePosts() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["posts"] });
    void qc.invalidateQueries({ queryKey: ["feed"] });
  };
}

export function useCreatePost() {
  const invalidate = useInvalidatePosts();
  return useMutation({ mutationFn: (input: CreatePostInputType) => api("/api/posts", { body: input, schema: PostSchema }), onSuccess: invalidate });
}

export function useLikePost() {
  const invalidate = useInvalidatePosts();
  return useMutation({ mutationFn: (id: string) => api(`/api/posts/${id}/like`, { method: "POST", schema: PostSchema }), onSuccess: invalidate });
}

export function useAddPostComment(id: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidatePosts();
  return useMutation({
    mutationFn: (body: string) => api(`/api/posts/${id}/comments`, { body: { body }, schema: PostDetailSchema }),
    onSuccess: (detail) => {
      qc.setQueryData(communityKeys.post(id), detail);
      invalidate();
    },
  });
}

export interface NeighbourFilters {
  neighbourhood?: string;
  interest?: string;
  q?: string;
}

export const useNeighbours = (f: NeighbourFilters) =>
  useQuery({
    queryKey: communityKeys.neighbours(f),
    queryFn: () => api(`/api/neighbours${query({ ...f })}`, { schema: PublicProfileListSchema }),
    placeholderData: keepPreviousData,
  });

export const useProfile = (id: string) =>
  useQuery({ queryKey: communityKeys.profile(id), queryFn: () => api(`/api/users/${id}`, { schema: ProfileActivitySchema }) });

// ---------------------------------------------------------------- events

export const useEvents = (category: EventCategory | "all" = "all") =>
  useQuery({
    queryKey: communityKeys.events(category),
    queryFn: () => api(`/api/events${query({ category })}`, { schema: EventListSchema }),
    placeholderData: keepPreviousData,
  });

function useInvalidateEvents() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["events"] });
}

export function useCreateEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (input: CreateEventInputType) => api("/api/events", { body: input, schema: EventSchema }), onSuccess: invalidate });
}

export function useRsvpEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (id: string) => api(`/api/events/${id}/rsvp`, { method: "POST", schema: EventSchema }), onSuccess: invalidate });
}

export function useCancelEvent() {
  const invalidate = useInvalidateEvents();
  return useMutation({ mutationFn: (id: string) => api(`/api/events/${id}`, { method: "DELETE" }), onSuccess: invalidate });
}
