import {
  anonymousLabel,
  neighbourhoodName,
  type NotificationPrefs,
  type PrivacySettings,
} from "@neighbourly/shared";
import { useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, EyeOff, Lock, LogOut, RotateCcw, UserRound } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SwitchRow } from "@/components/ui/switch";
import { api, errorMessage } from "@/lib/api";
import { useCurrentUser, useDemoLogin, useLogout, useUpdateMe } from "../auth/api";

function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="font-bold text-neutral-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function SettingsPage() {
  const me = useCurrentUser();
  const update = useUpdateMe();
  const logout = useLogout();
  const demoLogin = useDemoLogin();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState({ name: me.name, bio: me.bio, phone: me.phone ?? "" });

  const onError = (err: unknown) => toast.error(errorMessage(err));
  const setPrivacy = (patch: Partial<PrivacySettings>) => update.mutate({ privacy: patch }, { onSuccess: () => toast.success("Privacy updated"), onError });
  const setPrefs = (patch: Partial<NotificationPrefs>) => update.mutate({ notificationPrefs: patch }, { onError });

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ name: profile.name, bio: profile.bio, phone: profile.phone || null }, { onSuccess: () => toast.success("Profile saved"), onError });
  };

  const resetDemo = async () => {
    await api("/api/demo/reset", { method: "POST" });
    queryClient.clear();
    toast.success("Demo data reset");
    demoLogin.mutate(me.id, { onError: () => logout() });
  };

  const isResident = me.role === "resident";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Privacy & settings" description="You decide what neighbours see. Township Management can always contact you about your reports." />

      {me.role !== "admin" && (
        <SettingsCard title="What neighbours see">
          <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3">
            <span className="grid size-10 place-items-center rounded-full bg-neutral-200 text-neutral-500">
              {me.privacy.showNameOnReports ? <UserRound className="size-5" /> : <EyeOff className="size-5" />}
            </span>
            <div className="text-sm">
              <p className="text-xs text-neutral-500">On your reports and comments</p>
              <p className="font-semibold text-neutral-900">{me.privacy.showNameOnReports ? me.name : anonymousLabel(me)}</p>
            </div>
          </div>
          <div className="mt-2 divide-y divide-neutral-100">
            <SwitchRow
              id="s-dir"
              label="Show me in the neighbour directory"
              description="Your name, block, bio and interests. Verified residents only."
              checked={me.privacy.showInDirectory}
              onCheckedChange={(v) => setPrivacy({ showInDirectory: v })}
            />
            {isResident && (
              <SwitchRow
                id="s-rep"
                label="Show my name on new reports"
                description="Off: neighbours see your block, not your name. You can still choose per report."
                checked={me.privacy.showNameOnReports}
                onCheckedChange={(v) => setPrivacy({ showNameOnReports: v })}
              />
            )}
            {isResident && (
              <SwitchRow
                id="s-claim"
                label="Show my name when I request food"
                description="Off: the giver sees your block, not your name."
                checked={me.privacy.showNameOnClaims}
                onCheckedChange={(v) => setPrivacy({ showNameOnClaims: v })}
              />
            )}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
            <Lock className="size-3.5" /> Your phone, email and unit number are never shown to other residents.
          </p>
        </SettingsCard>
      )}

      <SettingsCard title="Profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Name" htmlFor="p-name">
            <Input id="p-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} maxLength={60} />
          </Field>
          <Field label="About you" htmlFor="p-bio" hint="Shown on your public profile">
            <Textarea id="p-bio" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} maxLength={240} className="min-h-20" />
          </Field>
          <Field label="Phone" htmlFor="p-phone" hint="Private. Only Township Management can see it.">
            <Input id="p-phone" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={20} />
          </Field>
          <Button type="submit" loading={update.isPending}>
            Save profile
          </Button>
        </form>
      </SettingsCard>

      <SettingsCard title="Notifications">
        <div className="divide-y divide-neutral-100">
          <SwitchRow id="sn-reports" label="Report updates" checked={me.notificationPrefs.reports} onCheckedChange={(v) => setPrefs({ reports: v })} />
          <SwitchRow id="sn-food" label="EcoFood requests and confirmations" checked={me.notificationPrefs.food} onCheckedChange={(v) => setPrefs({ food: v })} />
          <SwitchRow id="sn-bookings" label="Booking approvals and changes" checked={me.notificationPrefs.bookings} onCheckedChange={(v) => setPrefs({ bookings: v })} />
          <SwitchRow id="sn-alerts" label="Safety and wildlife alerts" checked={me.notificationPrefs.alerts} onCheckedChange={(v) => setPrefs({ alerts: v })} />
          <SwitchRow id="sn-community" label="Comments on my posts" checked={me.notificationPrefs.community} onCheckedChange={(v) => setPrefs({ community: v })} />
        </div>
      </SettingsCard>

      <SettingsCard title="Account">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Email</dt>
            <dd className="font-medium text-neutral-900">{me.email}</dd>
          </div>
          {me.role !== "admin" && (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">{me.role === "shop" ? "Shop" : "Home"}</dt>
              <dd className="text-right font-medium text-neutral-900">
                {me.role === "shop" ? me.shop?.shopName : `Unit ${me.unitNo}, Block ${me.block}, ${neighbourhoodName(me.neighbourhoodId)}`}
              </dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <dt className="text-neutral-500">Status</dt>
            <dd>
              <Badge tone="green">
                <BadgeCheck /> {me.role === "admin" ? "Township Management" : "Verified"}
              </Badge>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-neutral-500">To delete your account and personal data (PDPA), ask the assistant to create a support ticket.</p>
      </SettingsCard>

      <SettingsCard title="Demo tools" description="This prototype runs on sample data stored in your browser.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void resetDemo()}>
            <RotateCcw /> Reset demo data
          </Button>
          <Button variant="ghost" onClick={logout}>
            <LogOut /> Log out
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}
