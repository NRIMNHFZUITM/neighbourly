import {
  CreateAlertInput,
  NEIGHBOURHOODS,
  REPORT_CATEGORIES,
  REPORT_CATEGORY_META,
  formatRelative,
  type AdminOverview,
  type CreateAlertInputType,
} from "@neighbourly/shared";
import {
  AlertTriangle,
  CalendarClock,
  CircleDot,
  Clock3,
  LifeBuoy,
  Megaphone,
  PawPrint,
  ShieldCheck,
  CheckCircle2,
  Scale,
  Users,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { ChartCard, ChartTooltip } from "@/components/charts/ChartCard";
import { stackedBarShape } from "@/components/charts/StackedBar";
import { CHART, axisTick, fmt1 } from "@/components/charts/theme";
import { ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { StatTile } from "@/components/StatTile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { validate, type FieldErrors } from "@/lib/forms";
import { useAdminOverview, useAdminReports, useCreateAlert } from "./api";

const CATEGORY_NAMES = Object.fromEntries(REPORT_CATEGORIES.map((c) => [c, REPORT_CATEGORY_META[c].short])) as Record<string, string>;
const categoryShape = stackedBarShape(REPORT_CATEGORIES);
const FOOD_KEYS = ["residentsKg", "shopsKg"] as const;
const FOOD_NAMES = { residentsKg: "Neighbours", shopsKg: "Local shops" };
const foodShape = stackedBarShape(FOOD_KEYS);

const duration = (hours: number) => (hours < 24 ? `${fmt1.format(hours)} h` : `${fmt1.format(hours / 24)} days`);

function ReportsByCategory({ data }: { data: AdminOverview["reportsByWeek"] }) {
  return (
    <ChartCard
      title="New reports per week, by category"
      description="Last 8 weeks across City of Elmina"
      legend={REPORT_CATEGORIES.map((c, i) => ({ label: CATEGORY_NAMES[c]!, color: CHART.series[i]!, shape: "rect" as const }))}
      table={{
        columns: ["Week of", ...REPORT_CATEGORIES.map((c) => CATEGORY_NAMES[c]!), "Total"],
        rows: data.map((w) => [w.week, ...REPORT_CATEGORIES.map((c) => w[c]), REPORT_CATEGORIES.reduce((s, c) => s + w[c], 0)]),
      }}
      className="lg:col-span-2"
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={axisTick} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={40} />
          <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={(p) => <ChartTooltip {...p} names={CATEGORY_NAMES} />} />
          {REPORT_CATEGORIES.map((c, i) => (
            <Bar key={c} dataKey={c} name={CATEGORY_NAMES[c]} stackId="r" fill={CHART.series[i]} maxBarSize={24} shape={categoryShape} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ResolutionTime({ data }: { data: AdminOverview["resolutionByCategory"] }) {
  const rows = data.map((d) => ({ label: CATEGORY_NAMES[d.category]!, days: Math.round((d.avgHours / 24) * 10) / 10, resolved: d.resolved }));
  return (
    <ChartCard
      title="Average time to resolve"
      description="Days from report to resolved, last 60 days"
      table={{ columns: ["Category", "Average (days)", "Resolved"], rows: rows.map((r) => [r.label, r.days, r.resolved]) }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 4 }} barCategoryGap="28%">
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={axisTick} width={84} />
          <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={(p) => <ChartTooltip {...p} unit="days" names={{ days: "Average" }} />} />
          <Bar dataKey="days" name="Average" fill={CHART.series[0]} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
            <LabelList dataKey="days" position="right" fill={CHART.ink2} fontSize={12} formatter={(v) => `${String(v)} d`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function FoodSaved({ data }: { data: AdminOverview["foodByWeek"] }) {
  return (
    <ChartCard
      title="Food saved per week"
      description="Kilograms collected through EcoFood"
      legend={FOOD_KEYS.map((k, i) => ({ label: FOOD_NAMES[k], color: CHART.series[i]!, shape: "rect" as const }))}
      table={{ columns: ["Week of", "Neighbours (kg)", "Local shops (kg)"], rows: data.map((w) => [w.week, w.residentsKg, w.shopsKg]) }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={axisTick} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={40} />
          <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={(p) => <ChartTooltip {...p} unit="kg" names={FOOD_NAMES} />} />
          {FOOD_KEYS.map((k, i) => (
            <Bar key={k} dataKey={k} name={FOOD_NAMES[k]} stackId="f" fill={CHART.series[i]} maxBarSize={24} shape={foodShape} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function WildlifeTrend({ data }: { data: AdminOverview["wildlifeByWeek"] }) {
  return (
    <ChartCard
      title="Wildlife sightings per week"
      description="Monkeys, snakes, monitor lizards and wild boar"
      table={{ columns: ["Week of", "Sightings"], rows: data.map((w) => [w.week, w.count]) }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={axisTick} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={40} />
          <Tooltip cursor={{ stroke: CHART.axis, strokeWidth: 1 }} content={(p) => <ChartTooltip {...p} names={{ count: "Sightings" }} />} />
          <Area
            type="monotone"
            dataKey="count"
            name="Sightings"
            stroke={CHART.series[0]}
            strokeWidth={2}
            fill={CHART.series[0]}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, fill: CHART.series[0], stroke: CHART.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function FacilityUse({ data }: { data: AdminOverview["bookingsByFacility"] }) {
  const rows = data.map((d) => ({ label: d.name.replace("Elmina Valley ", "").replace("Elmina Gardens ", ""), hours: d.hours, bookings: d.bookings }));
  return (
    <ChartCard
      title="Facility use"
      description="Hours booked in the last 30 days"
      table={{ columns: ["Facility", "Hours booked", "Bookings"], rows: data.map((d) => [d.name, d.hours, d.bookings]) }}
    >
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 4 }} barCategoryGap="28%">
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={axisTick} width={120} />
          <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={(p) => <ChartTooltip {...p} unit="h" names={{ hours: "Booked" }} />} />
          <Bar dataKey="hours" name="Booked" fill={CHART.series[0]} radius={[0, 4, 4, 0]} maxBarSize={18} isAnimationActive={false}>
            <LabelList dataKey="hours" position="right" fill={CHART.ink2} fontSize={12} formatter={(v) => `${String(v)} h`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function AlertDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateAlert();
  const [form, setForm] = useState<CreateAlertInputType>({ title: "", body: "", neighbourhoodId: null });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(CreateAlertInput, form);
    if (result.errors) return setErrors(result.errors);
    create.mutate(result.data, {
      onSuccess: () => {
        toast.success("Alert posted and residents notified");
        setForm({ title: "", body: "", neighbourhoodId: null });
        onClose();
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Post a safety alert" description="Shown at the top of residents' Home feed and sent as a notification.">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Title" htmlFor="a-title" error={errors.title}>
            <Input id="a-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Water interruption on Thursday" />
          </Field>
          <Field label="Message" htmlFor="a-body" error={errors.body}>
            <Textarea id="a-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <Field label="Who should see it?" htmlFor="a-hood">
            <Select id="a-hood" value={form.neighbourhoodId ?? ""} onChange={(e) => setForm({ ...form, neighbourhoodId: e.target.value || null })}>
              <option value="">Everyone in City of Elmina</option>
              {NEIGHBOURHOODS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} only
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              <Megaphone /> Post alert
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NeedsAttention({ k }: { k: AdminOverview["kpis"] }) {
  const open = useAdminReports({ status: "open" });
  const items = [
    { to: "/admin/verifications", label: "Verification requests", count: k.pendingVerifications, icon: <ShieldCheck /> },
    { to: "/admin/bookings", label: "Booking requests", count: k.pendingBookings, icon: <CalendarClock /> },
    { to: "/admin/tickets", label: "Open support tickets", count: k.openTickets, icon: <LifeBuoy /> },
  ];
  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-neutral-900">
        <AlertTriangle className="size-4 text-amber-600" /> Needs attention
      </h3>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-neutral-50 [&_svg]:size-4 [&_svg]:text-neutral-400">
              {i.icon}
              <span className="flex-1 text-neutral-700">{i.label}</span>
              <span className={i.count ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800" : "text-xs text-neutral-400"}>{i.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h4 className="mt-4 mb-2 text-xs font-bold tracking-wide text-neutral-400 uppercase">Newest open reports</h4>
      <ul className="space-y-1">
        {(open.data ?? []).slice(0, 5).map((r) => (
          <li key={r.id}>
            <Link to={`/admin/reports?focus=${r.id}`} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-neutral-50">
              <span aria-hidden>{REPORT_CATEGORY_META[r.category].emoji}</span>
              <span className="flex-1 truncate text-neutral-700">{r.title}</span>
              <span className="shrink-0 text-xs text-neutral-400">{formatRelative(r.createdAt)}</span>
            </Link>
          </li>
        ))}
        {open.data?.length === 0 && <li className="px-2 text-sm text-neutral-500">No open reports. Nice work!</li>}
      </ul>
      <Button asChild variant="outline" size="sm" className="mt-3 w-full">
        <Link to="/admin/reports">Manage reports</Link>
      </Button>
    </Card>
  );
}

export function AdminOverviewPage() {
  const { data, isPending, isError, error, refetch } = useAdminOverview();
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Township dashboard"
        description="How City of Elmina is doing, from resident activity across TownCare, EcoFood and facilities."
        actions={
          <Button variant="outline" onClick={() => setAlertOpen(true)}>
            <Megaphone /> Post safety alert
          </Button>
        }
      />
      <AlertDialog open={alertOpen} onClose={() => setAlertOpen(false)} />
      {isPending ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Open reports" value={data.kpis.openReports} hint={`${data.kpis.inProgressReports} in progress`} icon={<CircleDot />} />
            <StatTile label="Resolved, last 30 days" value={data.kpis.resolvedThisMonth} icon={<CheckCircle2 />} hint={`${data.statusSplit.resolved} resolved in total`} />
            <StatTile label="Average time to resolve" value={duration(data.kpis.avgResolutionHours)} hint="Last 60 days" icon={<Clock3 />} />
            <StatTile
              label="Food saved, last 30 days"
              value={fmt1.format(data.kpis.foodSavedKgThisMonth)}
              unit="kg"
              icon={<Scale />}
              trend={data.foodByWeek.map((w) => w.residentsKg + w.shopsKg)}
            />
            <StatTile label="Active residents" value={data.kpis.activeResidents} hint={`of ${data.kpis.verifiedResidents} verified, last 30 days`} icon={<Users />} />
            <StatTile label="Bookings, last 30 days" value={data.kpis.bookingsThisMonth} hint={`${data.kpis.pendingBookings} awaiting approval`} icon={<CalendarClock />} />
            <StatTile label="Wildlife sightings, 7 days" value={data.kpis.wildlifeAlerts7d} icon={<PawPrint />} trend={data.wildlifeByWeek.map((w) => w.count)} />
            <StatTile label="Open support tickets" value={data.kpis.openTickets} icon={<LifeBuoy />} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
              <ReportsByCategory data={data.reportsByWeek} />
              <ResolutionTime data={data.resolutionByCategory} />
              <WildlifeTrend data={data.wildlifeByWeek} />
              <FoodSaved data={data.foodByWeek} />
              <FacilityUse data={data.bookingsByFacility} />
            </div>
            <div className="space-y-5">
              <NeedsAttention k={data.kpis} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
