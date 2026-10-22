import {
  INTERESTS,
  INTEREST_LABELS,
  anonymousLabel,
  neighbourhoodName,
  type Interest,
  type NotificationPrefs,
  type PrivacySettings,
} from "@neighbourly/shared";
import { ArrowLeft, ArrowRight, Check, EyeOff, UserRound } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { SwitchRow } from "@/components/ui/switch";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { homePathFor, useCurrentUser, useUpdateMe } from "./api";

const STEPS = ["Interests", "Notifications", "Privacy"] as const;

export function OnboardingPage() {
  const me = useCurrentUser();
  const update = useUpdateMe();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<Interest[]>(me.interests);
  const [prefs, setPrefs] = useState<NotificationPrefs>(me.notificationPrefs);
  const [privacy, setPrivacy] = useState<PrivacySettings>(me.privacy);

  if (me.role === "admin" || me.verification !== "verified") return <Navigate to={homePathFor(me)} replace />;
  if (me.onboarded) return <Navigate to="/home" replace />;

  const finish = () =>
    update.mutate(
      { interests, notificationPrefs: prefs, privacy, onboarded: true },
      {
        onSuccess: () => {
          toast.success(`Welcome to ${neighbourhoodName(me.neighbourhoodId) ?? "City of Elmina"}!`);
          navigate("/home", { replace: true });
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );

  const toggle = (i: Interest) => setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <Logo className="mb-8" />
      <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
        <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                  i < step ? "bg-brand-600 text-white" : i === step ? "bg-brand-100 text-brand-800 ring-2 ring-brand-500" : "bg-neutral-100 text-neutral-400",
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn("hidden text-xs font-semibold sm:block", i === step ? "text-neutral-900" : "text-neutral-400")}>{s}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-neutral-200" />}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div>
            <h1 className="text-xl font-bold text-neutral-900">What do you care about, {me.name.split(" ")[0]}?</h1>
            <p className="mt-1 text-sm text-neutral-500">We'll use this to highlight posts and neighbours with the same interests.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const on = interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(i)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                      on ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400",
                    )}
                  >
                    {on && <Check className="size-4" />} {INTEREST_LABELS[i]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 className="text-xl font-bold text-neutral-900">What should we tell you about?</h1>
            <p className="mt-1 text-sm text-neutral-500">You can change these any time in Privacy & settings.</p>
            <div className="mt-3 divide-y divide-neutral-100">
              <SwitchRow id="n-reports" label="Report updates" description="When a report you raised or follow changes status" checked={prefs.reports} onCheckedChange={(v) => setPrefs({ ...prefs, reports: v })} />
              <SwitchRow id="n-food" label="EcoFood" description="Requests for your food and confirmations of your requests" checked={prefs.food} onCheckedChange={(v) => setPrefs({ ...prefs, food: v })} />
              <SwitchRow id="n-bookings" label="Bookings" description="Approvals and changes to your facility bookings" checked={prefs.bookings} onCheckedChange={(v) => setPrefs({ ...prefs, bookings: v })} />
              <SwitchRow id="n-alerts" label="Safety & wildlife alerts" description="Sightings and announcements for your neighbourhood" checked={prefs.alerts} onCheckedChange={(v) => setPrefs({ ...prefs, alerts: v })} />
              <SwitchRow id="n-community" label="Community" description="Comments on your posts" checked={prefs.community} onCheckedChange={(v) => setPrefs({ ...prefs, community: v })} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Choose what neighbours see</h1>
            <p className="mt-1 text-sm text-neutral-500">Private by default. Your phone, email and unit number are never shown to residents.</p>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-neutral-50 p-3">
              <span className="grid size-9 place-items-center rounded-full bg-neutral-200 text-neutral-500">
                {privacy.showNameOnReports ? <UserRound className="size-5" /> : <EyeOff className="size-5" />}
              </span>
              <div className="text-sm">
                <p className="text-xs text-neutral-500">On your reports, neighbours will see</p>
                <p className="font-semibold text-neutral-900">{privacy.showNameOnReports ? me.name : anonymousLabel(me)}</p>
              </div>
            </div>
            <div className="mt-2 divide-y divide-neutral-100">
              <SwitchRow id="p-dir" label="Show me in the neighbour directory" description="Your name, block and interests, for verified residents only" checked={privacy.showInDirectory} onCheckedChange={(v) => setPrivacy({ ...privacy, showInDirectory: v })} />
              <SwitchRow id="p-rep" label="Show my name on new reports" description="Off: neighbours see your block, not your name" checked={privacy.showNameOnReports} onCheckedChange={(v) => setPrivacy({ ...privacy, showNameOnReports: v })} />
              <SwitchRow id="p-claim" label="Show my name when I request food" description="Off: the giver sees your block, not your name" checked={privacy.showNameOnClaims} onCheckedChange={(v) => setPrivacy({ ...privacy, showNameOnClaims: v })} />
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
            <ArrowLeft /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Next <ArrowRight />
            </Button>
          ) : (
            <Button onClick={finish} loading={update.isPending}>
              Finish <Check />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
