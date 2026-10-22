import { Gift, HandHeart, HeartHandshake, PackageCheck, Scale, Store } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, ChartTooltip } from "@/components/charts/ChartCard";
import { stackedBarShape } from "@/components/charts/StackedBar";
import { CHART, axisTick, fmt1 } from "@/components/charts/theme";
import { ErrorState, ListSkeleton, SegmentedNav } from "@/components/layout";
import { StatTile } from "@/components/StatTile";
import { Card } from "@/components/ui/card";
import { useImpact } from "./api";
import { ECOFOOD_TABS, EcoFoodHeader } from "./EcoFoodPage";

const SERIES = ["residentsKg", "shopsKg"] as const;
const NAMES = { residentsKg: "Neighbours", shopsKg: "Local shops" };
const shape = stackedBarShape(SERIES);

export function ImpactPage() {
  const { data, isPending, isError, error, refetch } = useImpact();

  return (
    <div>
      <EcoFoodHeader />
      <SegmentedNav items={ECOFOOD_TABS} className="mb-5" />
      {isPending ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 gap-6 bg-linear-to-br from-brand-50 to-white p-6 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
                <p className="text-sm font-semibold text-brand-800">City of Elmina has kept</p>
                <p className="mt-1 text-6xl font-semibold tracking-tight text-neutral-900">
                  {fmt1.format(data.community.kgSaved)}
                  <span className="ml-2 text-2xl font-medium text-neutral-500">kg</span>
                </p>
                <p className="mt-1 text-sm text-neutral-600">of good food out of landfill, across {data.community.collected} collected listings.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="This month" value={fmt1.format(data.community.kgThisMonth)} unit="kg" icon={<Scale />} />
                <StatTile label="Neighbours helped" value={data.community.neighboursHelped} icon={<HeartHandshake />} />
                <StatTile label="From local shops" value={fmt1.format(data.community.kgFromShops)} unit="kg" icon={<Store />} />
                <StatTile label="Shops taking part" value={data.community.shopsParticipating} icon={<PackageCheck />} />
              </div>
            </div>
          </Card>

          <ChartCard
            title="Food saved per week"
            description="Kilograms collected, by who shared it. Last 8 weeks."
            legend={[
              { label: NAMES.residentsKg, color: CHART.series[0], shape: "rect" },
              { label: NAMES.shopsKg, color: CHART.series[1], shape: "rect" },
            ]}
            table={{
              columns: ["Week of", "Neighbours (kg)", "Local shops (kg)", "Total (kg)"],
              rows: data.weekly.map((w) => [w.week, w.residentsKg, w.shopsKg, fmt1.format(w.residentsKg + w.shopsKg)]),
            }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.weekly} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: CHART.axis }} tick={axisTick} />
                <YAxis tickLine={false} axisLine={false} tick={axisTick} width={44} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(11,11,11,0.04)" }} content={(p) => <ChartTooltip {...p} unit="kg" names={NAMES} />} />
                {SERIES.map((key, i) => (
                  <Bar key={key} dataKey={key} name={NAMES[key]} stackId="kg" fill={CHART.series[i]} maxBarSize={24} shape={shape} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <Card className="p-5">
            <h2 className="mb-3 font-bold text-neutral-900">Your impact</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Listings you shared" value={data.me.shared} icon={<Gift />} />
              <StatTile label="Food you gave" value={fmt1.format(data.me.givenKg)} unit="kg" icon={<HandHeart />} />
              <StatTile label="Pickups you made" value={data.me.received} icon={<PackageCheck />} />
              <StatTile label="Food you rescued" value={fmt1.format(data.me.receivedKg)} unit="kg" icon={<Scale />} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
