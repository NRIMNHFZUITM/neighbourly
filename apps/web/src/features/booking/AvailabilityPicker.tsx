import {
  addDaysToKey,
  formatMinutes,
  fromMyt,
  mytDateKey,
  type AvailabilityDay,
  type Facility,
  type Slot,
} from "@neighbourly/shared";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Field, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useAvailability } from "./api";

export interface SlotSelection {
  date: string;
  startMinutes: number;
  durationMinutes: number;
}

const weekdayFmt = new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", weekday: "short" });
const dayFmt = new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric" });
const monthFmt = new Intl.DateTimeFormat("en-MY", { timeZone: "Asia/Kuala_Lumpur", month: "short" });

const STATE_LABEL: Record<Slot["state"], string> = {
  free: "Free",
  taken: "Booked",
  maintenance: "Maintenance",
  mine: "Yours",
  past: "Past",
};

/** Consecutive bookable slots from `startIndex`, counting the viewer's own slots when rescheduling. */
function runLength(day: AvailabilityDay, startIndex: number, allowMine: boolean): number {
  let n = 0;
  for (let i = startIndex; i < day.slots.length; i++) {
    const s = day.slots[i]!.state;
    if (s === "free" || (allowMine && s === "mine")) n++;
    else break;
  }
  return n;
}

export function AvailabilityPicker({
  facility,
  value,
  onChange,
  allowMine = false,
}: {
  facility: Facility;
  value: SlotSelection | null;
  onChange: (v: SlotSelection | null) => void;
  /** When rescheduling, the booking's current slots count as available. */
  allowMine?: boolean;
}) {
  const today = mytDateKey(new Date());
  const days = Math.min(facility.advanceDays, 14);
  const [date, setDate] = useState(value?.date ?? today);
  const availability = useAvailability(facility.id, today, days);
  const dayData = availability.data?.find((d) => d.date === date);
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => addDaysToKey(today, i)), [today, days]);

  const selectSlot = (index: number) => {
    if (!dayData) return;
    const slot = dayData.slots[index]!;
    const ok = slot.state === "free" || (allowMine && slot.state === "mine");
    if (!ok) return;
    onChange({ date, startMinutes: slot.startMinutes, durationMinutes: facility.slotMinutes });
  };

  const selectedIndex = value && value.date === date && dayData ? dayData.slots.findIndex((s) => s.startMinutes === value.startMinutes) : -1;
  const maxRun = selectedIndex >= 0 && dayData ? runLength(dayData, selectedIndex, allowMine) : 0;
  const maxSlots = Math.min(maxRun, facility.maxDurationMinutes / facility.slotMinutes);
  const inSelection = (s: Slot) =>
    !!value && value.date === date && s.startMinutes >= value.startMinutes && s.startMinutes < value.startMinutes + value.durationMinutes;

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="radiogroup" aria-label="Date">
        {dates.map((d) => {
          const at = fromMyt(d, 12 * 60);
          const free = availability.data?.find((x) => x.date === d)?.slots.filter((s) => s.state === "free").length;
          const on = d === date;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setDate(d);
                if (value?.date !== d) onChange(null);
              }}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 transition",
                on ? "border-brand-600 bg-brand-700 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300",
              )}
            >
              <span className={cn("text-[11px] font-semibold uppercase", on ? "text-brand-100" : "text-neutral-400")}>
                {d === today ? "Today" : weekdayFmt.format(at)}
              </span>
              <span className="text-lg leading-tight font-bold">{dayFmt.format(at)}</span>
              <span className={cn("text-[10px]", on ? "text-brand-100" : "text-neutral-400")}>
                {free === undefined ? monthFmt.format(at) : free === 0 ? "Full" : `${free} free`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border border-neutral-300 bg-white" /> Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-neutral-200" /> Booked (no names shown)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="nb-stripes size-3 rounded bg-amber-100" /> Maintenance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded bg-brand-100 ring-1 ring-brand-300" /> Yours
        </span>
      </div>

      {!dayData ? (
        <div className="grid h-40 place-items-center text-neutral-400">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5", availability.isPlaceholderData && "opacity-60")}>
          {dayData.slots.map((s, i) => {
            const selectable = s.state === "free" || (allowMine && s.state === "mine");
            const selected = inSelection(s);
            return (
              <button
                key={s.start}
                type="button"
                disabled={!selectable}
                onClick={() => selectSlot(i)}
                aria-pressed={selected}
                aria-label={`${formatMinutes(s.startMinutes)}, ${STATE_LABEL[s.state]}`}
                className={cn(
                  "flex flex-col items-start rounded-xl border px-3 py-2 text-left transition",
                  selected && "border-brand-600 bg-brand-600 text-white shadow-sm",
                  !selected && s.state === "free" && "border-neutral-200 bg-white hover:border-brand-400 hover:bg-brand-50",
                  !selected && s.state === "taken" && "cursor-not-allowed border-transparent bg-neutral-100 text-neutral-400",
                  !selected && s.state === "maintenance" && "nb-stripes cursor-not-allowed border-amber-200 bg-amber-50 text-amber-800",
                  !selected && s.state === "mine" && "border-brand-300 bg-brand-50 text-brand-800",
                  !selected && s.state === "past" && "cursor-not-allowed border-transparent bg-transparent text-neutral-300",
                )}
              >
                <span className="text-sm font-bold">{formatMinutes(s.startMinutes)}</span>
                <span className={cn("text-[11px] font-medium", selected ? "text-brand-100" : "")}>{selected ? "Selected" : STATE_LABEL[s.state]}</span>
              </button>
            );
          })}
        </div>
      )}

      {value && value.date === date && selectedIndex >= 0 && (
        <Field label="How long?" htmlFor="duration">
          <Select
            id="duration"
            value={value.durationMinutes}
            onChange={(e) => onChange({ ...value, durationMinutes: Number(e.target.value) })}
          >
            {Array.from({ length: Math.max(maxSlots, 1) }, (_, k) => (k + 1) * facility.slotMinutes).map((m) => (
              <option key={m} value={m}>
                {m / 60} {m === 60 ? "hour" : "hours"} (until {formatMinutes(value.startMinutes + m)})
              </option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  );
}
