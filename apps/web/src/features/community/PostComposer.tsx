import { CreatePostInput, POST_TOPICS, POST_TOPIC_META, neighbourhoodName, type PostTopic } from "@neighbourly/shared";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { NameAvatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { validate } from "@/lib/forms";
import { useCurrentUser } from "../auth/api";
import { useCreatePost, type Scope } from "./api";

export function PostComposer() {
  const me = useCurrentUser();
  const create = useCreatePost();
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<Scope>(me.neighbourhoodId ? "neighbourhood" : "township");
  const [topic, setTopic] = useState<PostTopic>("general");
  const [focused, setFocused] = useState(false);
  const area = neighbourhoodName(me.neighbourhoodId);
  const name = me.role === "shop" && me.shop ? me.shop.shopName : me.name;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(CreatePostInput, { body, scope, topic });
    if (result.errors) return toast.error(result.errors.body ?? "Write something first");
    create.mutate(result.data, {
      onSuccess: () => {
        setBody("");
        setTopic("general");
        setFocused(false);
        toast.success("Posted");
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-card">
      <div className="flex gap-3">
        <NameAvatar name={name} seed={me.id} kind={me.role === "shop" ? "shop" : "person"} size="sm" className="mt-1" />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={area ? `Share something with ${area}…` : "Share something with the township…"}
          maxLength={1000}
          className="min-h-11 resize-none border-transparent bg-neutral-50 shadow-none focus:bg-white"
          rows={focused ? 3 : 1}
          aria-label="New post"
        />
      </div>
      {(focused || body) && (
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
          <Select value={topic} onChange={(e) => setTopic(e.target.value as PostTopic)} className="h-9 w-auto text-xs" aria-label="Topic">
            {POST_TOPICS.map((t) => (
              <option key={t} value={t}>
                {POST_TOPIC_META[t].emoji} {POST_TOPIC_META[t].label}
              </option>
            ))}
          </Select>
          <Select value={scope} onChange={(e) => setScope(e.target.value as Scope)} className="h-9 w-auto text-xs" aria-label="Who can see this">
            {area && <option value="neighbourhood">{area} only</option>}
            <option value="township">All of City of Elmina</option>
          </Select>
          <Button type="submit" size="sm" className="h-9" loading={create.isPending} disabled={!body.trim()}>
            Post
          </Button>
        </div>
      )}
    </form>
  );
}
