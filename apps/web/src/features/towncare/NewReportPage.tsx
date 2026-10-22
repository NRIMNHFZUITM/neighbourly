import {
  CreateReportInput,
  REPORT_CATEGORIES,
  REPORT_CATEGORY_META,
  anonymousLabel,
  neighbourhoodCenter,
  type LatLng,
  type ReportCategory,
} from "@neighbourly/shared";
import { EyeOff, ShieldAlert, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { FormPage } from "@/components/layout";
import { LocationPicker } from "@/components/map/LocationPicker";
import { PhotoPicker, type PickedPhoto } from "@/components/PhotoPicker";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { validate, type FieldErrors } from "@/lib/forms";
import { useCurrentUser } from "../auth/api";
import { useCreateReport } from "./api";

export function NewReportPage() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const create = useCreateReport();
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LatLng>(() => neighbourhoodCenter(me.neighbourhoodId));
  const [locationLabel, setLocationLabel] = useState("");
  const [showName, setShowName] = useState(me.privacy.showNameOnReports);
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(CreateReportInput, {
      title,
      description,
      category: category ?? undefined,
      location,
      locationLabel: locationLabel || undefined,
      photoPath: null,
      showName,
    });
    if (result.errors) {
      setErrors(result.errors);
      toast.error("Please check the highlighted fields.");
      return;
    }
    const { photoPath: _ignored, ...input } = result.data;
    create.mutate(
      { input, photo },
      {
        onSuccess: (report) => {
          toast.success("Report submitted", { description: "We'll notify you when Township Management updates it." });
          navigate(`/towncare/${report.id}`, { replace: true });
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <FormPage
        title="Report an issue"
        description="Potholes, broken lights, rubbish or wildlife. Township Management sees every report."
        closeTo="/towncare"
        footer={
          <Button type="submit" size="lg" className="w-full md:w-auto" loading={create.isPending}>
            Submit report
          </Button>
        }
      >
        <div className="space-y-6">
          <Field label="Photo" hint="Optional, but it helps the team find and fix the problem faster.">
            <PhotoPicker value={photo} onChange={setPhoto} label="Take or choose a photo" />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-neutral-800">What kind of issue?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {REPORT_CATEGORIES.map((c) => {
                const meta = REPORT_CATEGORY_META[c];
                const on = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setCategory(c)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                      on ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-neutral-200 bg-white hover:border-neutral-300",
                    )}
                  >
                    <span className="text-xl" aria-hidden>
                      {meta.emoji}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">{meta.label}</span>
                    <span className="text-xs text-neutral-500">{meta.description}</span>
                  </button>
                );
              })}
            </div>
            {errors.category && <p className="mt-1.5 text-xs font-medium text-rose-600">Pick a category</p>}
            {category === "wildlife" && (
              <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <ShieldAlert className="size-4 shrink-0" />
                If an animal is inside a home or someone is in danger, call 999 (or Bomba on 994) first. Your report will alert neighbours nearby.
              </p>
            )}
          </fieldset>

          <Field label="Title" htmlFor="title" error={errors.title}>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pothole near the Block C junction" maxLength={80} />
          </Field>
          <Field label="What's happening?" htmlFor="desc" error={errors.description}>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem and anything that helps the team find it."
              maxLength={1000}
            />
          </Field>

          <Field label="Where is it?" error={errors.location ? "Drop the pin inside City of Elmina" : null}>
            <LocationPicker value={location} onChange={setLocation} />
          </Field>
          <Field label="Location description (optional)" htmlFor="loc">
            <Input id="loc" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="e.g. In front of Block C playground" maxLength={80} />
          </Field>

          <div className="rounded-2xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <label htmlFor="show-name" className="cursor-pointer">
                <span className="block text-sm font-semibold text-neutral-900">Show my name on this report</span>
                <span className="mt-0.5 block text-sm text-neutral-500">Township Management always sees who reported, so they can follow up.</span>
              </label>
              <Switch id="show-name" checked={showName} onCheckedChange={setShowName} />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm">
              {showName ? <UserRound className="size-4 text-neutral-500" /> : <EyeOff className="size-4 text-neutral-500" />}
              <span className="text-neutral-500">Neighbours will see:</span>
              <span className="font-semibold text-neutral-900">{showName ? me.name : anonymousLabel(me)}</span>
            </div>
          </div>
        </div>
      </FormPage>
    </form>
  );
}
