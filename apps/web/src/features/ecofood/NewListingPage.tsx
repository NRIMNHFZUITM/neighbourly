import {
  CreateFoodInput,
  DIETARY_LABELS,
  DIETARY_TAGS,
  FOOD_TYPES,
  FOOD_TYPE_META,
  HALAL_STATUSES,
  addDaysToKey,
  formatDayRelative,
  formatHHMM,
  fromMyt,
  mytDateKey,
  mytMinutesOfDay,
  neighbourhoodCenter,
  parseHHMM,
  type DietaryTag,
  type FoodType,
  type HalalStatus,
  type LatLng,
} from "@neighbourly/shared";
import { Check, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { FormPage } from "@/components/layout";
import { LocationPicker } from "@/components/map/LocationPicker";
import { PhotoPicker, type PickedPhoto } from "@/components/PhotoPicker";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { validate, type FieldErrors } from "@/lib/forms";
import { useCurrentUser } from "../auth/api";
import { useCreateListing } from "./api";

const HALAL_COPY: Record<HalalStatus, { title: string; body: string }> = {
  halal: { title: "Halal", body: "All ingredients and preparation are halal" },
  non_halal: { title: "Non-halal", body: "Contains pork, lard, alcohol or similar" },
  not_sure: { title: "Not sure", body: "I don't know the halal status" },
};

const BEST_BEFORE = [
  { value: 0, label: "End of the pickup window" },
  { value: 3, label: "3 hours after pickup" },
  { value: 12, label: "12 hours after pickup" },
  { value: 24, label: "1 day after pickup" },
  { value: 72, label: "3 days after pickup (packaged food)" },
];

function defaultWindow() {
  const now = new Date();
  const nextHour = Math.ceil((mytMinutesOfDay(now) + 30) / 60) * 60;
  if (nextHour > 21 * 60) return { day: addDaysToKey(mytDateKey(now), 1), start: "10:00", end: "12:00" };
  return { day: mytDateKey(now), start: formatHHMM(Math.max(nextHour, 8 * 60)), end: formatHHMM(Math.min(Math.max(nextHour, 8 * 60) + 120, 23 * 60 + 30)) };
}

export function NewListingPage() {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const create = useCreateListing();
  const isShop = me.role === "shop";
  const initial = defaultWindow();
  const today = mytDateKey(new Date());

  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [title, setTitle] = useState("");
  const [foodType, setFoodType] = useState<FoodType>("cooked");
  const [quantity, setQuantity] = useState("");
  const [weight, setWeight] = useState("1");
  const [halal, setHalal] = useState<HalalStatus | null>(isShop ? (me.shop?.halal ?? null) : null);
  const [tags, setTags] = useState<DietaryTag[]>([]);
  const [pickupPoint, setPickupPoint] = useState(isShop ? `${me.shop?.shopName ?? "Shop"} counter` : me.block ? `Block ${me.block} guardhouse` : "");
  const [location, setLocation] = useState<LatLng>(() => neighbourhoodCenter(me.neighbourhoodId));
  const [day, setDay] = useState(initial.day);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [bestBefore, setBestBefore] = useState(3);
  const [priceNote, setPriceNote] = useState(isShop ? "Free" : "");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pickupStart = fromMyt(day, parseHHMM(start));
    const pickupEnd = fromMyt(day, parseHHMM(end));
    const result = validate(CreateFoodInput, {
      title,
      description,
      foodType,
      quantity,
      estWeightKg: Number(weight),
      halal: halal ?? undefined,
      dietaryTags: tags,
      photoPath: null,
      pickupPoint,
      location,
      pickupStart: pickupStart.toISOString(),
      pickupEnd: pickupEnd.toISOString(),
      expiresAt: new Date(pickupEnd.getTime() + bestBefore * 3_600_000).toISOString(),
      priceNote: isShop ? priceNote || "Free" : null,
    });
    if (result.errors) {
      setErrors(result.errors);
      toast.error("Please check the highlighted fields.");
      return;
    }
    const { photoPath: _photoPath, ...input } = result.data;
    create.mutate(
      { input, photo },
      {
        onSuccess: (listing) => {
          toast.success("Your food is listed", { description: "Neighbours nearby can request it now." });
          navigate(`/ecofood/${listing.id}`, { replace: true });
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  const pickupSuggestions = isShop
    ? [`${me.shop?.shopName ?? "Shop"} counter`]
    : me.block
      ? [`Block ${me.block} guardhouse`, `Block ${me.block} lobby`, "Neighbourhood guardhouse"]
      : ["Guardhouse", "Lobby"];

  return (
    <form onSubmit={submit} noValidate>
      <FormPage
        title="Share surplus food"
        description="Good food you can't finish? Post it and a neighbour can pick it up."
        closeTo="/ecofood"
        footer={
          <Button type="submit" size="lg" className="w-full md:w-auto" loading={create.isPending}>
            Post listing
          </Button>
        }
      >
        <div className="space-y-6">
          <Field label="Photo" hint="Food with a photo gets claimed much faster.">
            <PhotoPicker value={photo} onChange={setPhoto} label="Add a photo of the food" />
          </Field>

          <Field label="What are you sharing?" htmlFor="f-title" error={errors.title}>
            <Input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Nasi lemak (6 packs)" maxLength={80} />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-neutral-800">Type of food</legend>
            <div className="flex flex-wrap gap-2">
              {FOOD_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={foodType === t}
                  onClick={() => setFoodType(t)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                    foodType === t ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white text-neutral-700",
                  )}
                >
                  {FOOD_TYPE_META[t].emoji} {FOOD_TYPE_META[t].label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
            <Field label="Quantity" htmlFor="f-qty" error={errors.quantity}>
              <Input id="f-qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 6 packs" maxLength={40} />
            </Field>
            <Field label="Weight (kg)" htmlFor="f-kg" error={errors.estWeightKg}>
              <Input id="f-kg" type="number" inputMode="decimal" min={0.1} max={50} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} />
            </Field>
          </div>
          <p className="-mt-4 text-xs text-neutral-500">A rough guess is fine: a packed meal is about 0.4 kg. It's how we count food saved.</p>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-neutral-800">Halal status</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {HALAL_STATUSES.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={halal === h}
                  onClick={() => setHalal(h)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    halal === h ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20" : "border-neutral-200 bg-white hover:border-neutral-300",
                  )}
                >
                  <span className="block text-sm font-semibold text-neutral-900">{HALAL_COPY[h].title}</span>
                  <span className="block text-xs text-neutral-500">{HALAL_COPY[h].body}</span>
                </button>
              ))}
            </div>
            {errors.halal && <p className="mt-1.5 text-xs font-medium text-rose-600">Choose the halal status so neighbours can decide safely</p>}
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-neutral-800">Dietary notes & allergens</legend>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTags((cur) => (on ? cur.filter((x) => x !== t) : [...cur, t]))}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                      on ? "border-brand-600 bg-brand-600 text-white" : "border-neutral-300 bg-white text-neutral-700",
                    )}
                  >
                    {on && <Check className="size-3.5" />} {DIETARY_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-3 rounded-2xl border border-neutral-200 p-4">
            <p className="text-sm font-semibold text-neutral-900">Pickup</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Day" htmlFor="f-day">
                <Select id="f-day" value={day} onChange={(e) => setDay(e.target.value)}>
                  {[0, 1, 2].map((d) => {
                    const key = addDaysToKey(today, d);
                    return (
                      <option key={key} value={key}>
                        {formatDayRelative(fromMyt(key, 12 * 60))}
                      </option>
                    );
                  })}
                </Select>
              </Field>
              <Field label="From" htmlFor="f-start">
                <Input id="f-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="Until" htmlFor="f-end" error={errors.pickupEnd}>
                <Input id="f-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>
            <Field label="Best before" htmlFor="f-bb">
              <Select id="f-bb" value={bestBefore} onChange={(e) => setBestBefore(Number(e.target.value))}>
                {BEST_BEFORE.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Pickup point" htmlFor="f-point" error={errors.pickupPoint} hint="A public spot. Your home address is never shown.">
              <Input id="f-point" value={pickupPoint} onChange={(e) => setPickupPoint(e.target.value)} maxLength={80} />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {pickupSuggestions.map((s) => (
                <button key={s} type="button" onClick={() => setPickupPoint(s)} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-200">
                  {s}
                </button>
              ))}
            </div>
            <LocationPicker value={location} onChange={setLocation} />
          </div>

          {isShop && (
            <Field label="Price" htmlFor="f-price" hint="Most shops share for free; a discount note is fine too.">
              <Input id="f-price" value={priceNote} onChange={(e) => setPriceNote(e.target.value)} placeholder="Free, or e.g. RM 3 per portion" maxLength={40} />
            </Field>
          )}

          <Field label="Notes (optional)" htmlFor="f-desc">
            <Textarea id="f-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ingredients, how it was stored, what to bring…" maxLength={500} />
          </Field>

          <div className="flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
            <ShieldCheck className="size-5 shrink-0 text-brand-700" />
            <p>
              Share cooked food within 2 hours of cooking, or chill it and share within 24 hours. Never share opened drinks, partly eaten food or
              anything past its expiry date.
            </p>
          </div>
        </div>
      </FormPage>
    </form>
  );
}
