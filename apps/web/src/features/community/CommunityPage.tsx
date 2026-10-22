import { POST_TOPICS, POST_TOPIC_META } from "@neighbourly/shared";
import { MessagesSquare } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EmptyState, ErrorState, FilterChips, ListSkeleton, PageHeader, SegmentedNav } from "@/components/layout";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { usePosts, type Scope, type TopicFilter } from "./api";
import { PostCard } from "./PostCard";
import { PostComposer } from "./PostComposer";

export const COMMUNITY_TABS = [
  { to: "/community", label: "Feed" },
  { to: "/community/events", label: "Events" },
  { to: "/community/neighbours", label: "Neighbours" },
];

/** Shared header for the Community tabs (feed, events, neighbours). */
export function CommunityHeader({ actions }: { actions?: ReactNode }) {
  return (
    <>
      <PageHeader title="Community" description="Updates, events and neighbours from verified residents of City of Elmina." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedNav items={COMMUNITY_TABS} />
        {actions}
      </div>
    </>
  );
}

const topicOptions: Array<{ value: TopicFilter; label: string }> = [
  { value: "all", label: "All topics" },
  { value: "official", label: "📢 Official" },
  ...POST_TOPICS.map((t) => ({ value: t, label: `${POST_TOPIC_META[t].emoji} ${POST_TOPIC_META[t].label}` })),
];

export function CommunityPage() {
  const [scope, setScope] = useState<Scope>("neighbourhood");
  const [topic, setTopic] = useState<TopicFilter>("all");
  const posts = usePosts(scope, topic);
  return (
    <div className="mx-auto max-w-2xl">
      <CommunityHeader />
      <div className="mb-4 space-y-2.5">
        <FilterChips label="Topic" value={topic} onChange={setTopic} options={topicOptions} />
        <div className="flex items-center justify-between gap-3">
          <p className="min-h-4 text-xs text-neutral-500" aria-live="polite">
            {posts.data ? `${posts.data.length} ${posts.data.length === 1 ? "post" : "posts"}` : null}
          </p>
          <Select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="h-9 w-auto text-xs" aria-label="Show posts from">
            <option value="neighbourhood">My neighbourhood</option>
            <option value="township">Whole township</option>
          </Select>
        </div>
      </div>
      <PostComposer />
      <div className={cn("mt-4 space-y-3", posts.isPlaceholderData && "opacity-60 transition-opacity")}>
        {posts.isPending ? (
          <ListSkeleton />
        ) : posts.isError ? (
          <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
        ) : posts.data.length === 0 ? (
          topic === "all" ? (
            <EmptyState icon={<MessagesSquare />} title="No posts yet" description="Be the first to say hello to your neighbours." />
          ) : (
            <EmptyState
              icon={<MessagesSquare />}
              title={topic === "official" ? "No announcements yet" : `No posts in ${POST_TOPIC_META[topic].label} yet`}
              description={scope === "neighbourhood" ? "Try the whole township, or start one yourself." : "Start one yourself with the box above."}
            />
          )
        ) : (
          posts.data.map((p) => <PostCard key={p.id} post={p} />)
        )}
      </div>
    </div>
  );
}
