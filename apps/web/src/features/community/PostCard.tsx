import { POST_TOPIC_META, formatRelative, neighbourhoodName, type Post } from "@neighbourly/shared";
import { Heart, Megaphone, MessageSquare, ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { IdentityLine } from "@/components/IdentityLine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAddPostComment, useLikePost, usePost } from "./api";

function Comments({ postId }: { postId: string }) {
  const { data, isPending } = usePost(postId);
  const add = useAddPostComment(postId);
  const [body, setBody] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    add.mutate(body.trim(), { onSuccess: () => setBody(""), onError: (err) => toast.error(errorMessage(err)) });
  };
  return (
    <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
      {isPending ? (
        <p className="text-sm text-neutral-400">Loading comments…</p>
      ) : (
        data?.commentList.map((c) => (
          <div key={c.id} className="rounded-xl bg-neutral-50 p-2.5">
            <IdentityLine identity={c.author} meta={formatRelative(c.createdAt)} size="xs" />
            <p className="mt-1.5 text-sm text-neutral-800">{c.body}</p>
          </div>
        ))
      )}
      <form onSubmit={submit} className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a comment…" maxLength={500} className="h-10" />
        <Button type="submit" size="sm" className="h-10" disabled={!body.trim()} loading={add.isPending}>
          Post
        </Button>
      </form>
    </div>
  );
}

export function PostCard({ post, className }: { post: Post; className?: string }) {
  const like = useLikePost();
  const [open, setOpen] = useState(false);
  const scope = post.neighbourhoodId ? neighbourhoodName(post.neighbourhoodId) : "Everyone in City of Elmina";
  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-card",
        post.kind === "alert" ? "border-amber-300 bg-amber-50/40" : post.kind === "announcement" ? "border-brand-200" : "border-neutral-200/80",
        post.hidden && "opacity-60",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <IdentityLine identity={post.author} meta={`${formatRelative(post.createdAt)} · ${scope}`} />
        {post.kind === "alert" && (
          <Badge tone="amber">
            <ShieldAlert /> Safety alert
          </Badge>
        )}
        {post.kind === "announcement" && (
          <Badge tone="brand">
            <Megaphone /> Announcement
          </Badge>
        )}
      </div>
      <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-neutral-800">{post.body}</p>
      {post.kind === "post" && post.topic !== "general" && (
        <p className="mt-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
            {POST_TOPIC_META[post.topic].emoji} {POST_TOPIC_META[post.topic].label}
          </span>
        </p>
      )}
      {post.hidden && <p className="mt-2 text-xs font-semibold text-rose-600">Hidden by moderators</p>}
      <div className="mt-3 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => like.mutate(post.id)}
          aria-pressed={post.likedByMe}
          className={cn(post.likedByMe && "text-rose-600")}
        >
          <Heart className={cn(post.likedByMe && "fill-rose-500 text-rose-500")} /> {post.likes}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <MessageSquare /> {post.comments} {post.comments === 1 ? "comment" : "comments"}
        </Button>
      </div>
      {open && <Comments postId={post.id} />}
    </article>
  );
}
