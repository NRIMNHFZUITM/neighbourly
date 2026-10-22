import {
  BLOCKS,
  HALAL_LABELS,
  HALAL_STATUSES,
  NEIGHBOURHOODS,
  RequestApprovalInput,
  ShopApplicationInput,
  VerifyUnitInput,
  neighbourhoodCenter,
  type Me,
  type RequestApprovalInputType,
  type ShopApplicationInputType,
} from "@neighbourly/shared";
import { Clock3, KeyRound, LogOut, Repeat, ShieldCheck, Store, UserCheck } from "lucide-react";
import { lazy, Suspense, useState, type FormEvent } from "react";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { errorMessage } from "@/lib/api";
import { validate, type FieldErrors } from "@/lib/forms";
import { homePathFor, useCurrentUser, useDemoLogin, useLogout, useRequestApproval, useShopApplication, useVerifyUnit } from "./api";

const DEMO_CODES = ["ELM-VC14-4821", "ELM-GA03-7702", "ELM-DE10-3315"];

// Leaflet only loads if someone applies as a shop.
const LocationPicker = lazy(() => import("@/components/map/LocationPicker").then((m) => ({ default: m.LocationPicker })));

function UnitCodeForm() {
  const verify = useVerifyUnit();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(VerifyUnitInput, { code });
    if (result.errors) return setError(result.errors.code ?? "Enter your code");
    setError(null);
    verify.mutate(result.data, { onSuccess: () => toast.success("You're verified. Welcome to Neighbourly!") });
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-neutral-600">
        Every unit has a one-time code on its welcome letter from Township Management. Entering it verifies you instantly.
      </p>
      <Field label="Unit code" htmlFor="code" error={error ?? (verify.isError ? errorMessage(verify.error) : null)}>
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ELM-XXXX-0000" className="font-mono tracking-wider" />
      </Field>
      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
        <p className="font-semibold">Demo codes (unclaimed units)</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {DEMO_CODES.map((c) => (
            <button key={c} type="button" onClick={() => setCode(c)} className="rounded-md bg-white px-2 py-1 font-mono font-semibold ring-1 ring-amber-200 hover:ring-amber-400">
              {c}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={verify.isPending}>
        <KeyRound /> Verify my unit
      </Button>
    </form>
  );
}

function ApprovalForm() {
  const request = useRequestApproval();
  const [form, setForm] = useState<RequestApprovalInputType>({ neighbourhoodId: "elmina-valley", block: "A", unitNo: "", note: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(RequestApprovalInput, form);
    if (result.errors) return setErrors(result.errors);
    request.mutate(result.data);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-neutral-600">No code? Tell us where you live and Township Management will check it against their records.</p>
      <Field label="Neighbourhood" htmlFor="hood">
        <Select id="hood" value={form.neighbourhoodId} onChange={(e) => setForm({ ...form, neighbourhoodId: e.target.value as RequestApprovalInputType["neighbourhoodId"] })}>
          {NEIGHBOURHOODS.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Block" htmlFor="block">
          <Select id="block" value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value as RequestApprovalInputType["block"] })}>
            {BLOCKS.map((b) => (
              <option key={b} value={b}>
                Block {b}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unit number" htmlFor="unit" error={errors.unitNo}>
          <Input id="unit" value={form.unitNo} onChange={(e) => setForm({ ...form, unitNo: e.target.value })} placeholder="e.g. C-12" />
        </Field>
      </div>
      <Field label="Anything that helps us verify you (optional)" htmlFor="note">
        <Textarea id="note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Moved in last month, tenant" />
      </Field>
      <p className="text-xs text-neutral-500">Your unit number is only visible to you and Township Management.</p>
      {request.isError && <p className="text-sm text-rose-600">{errorMessage(request.error)}</p>}
      <Button type="submit" className="w-full" size="lg" variant="secondary" loading={request.isPending}>
        <UserCheck /> Request approval
      </Button>
    </form>
  );
}

function ShopForm() {
  const apply = useShopApplication();
  const [form, setForm] = useState<ShopApplicationInputType>({
    shopName: "",
    category: "",
    halal: "halal",
    openingHours: "",
    address: "",
    ssmNo: "",
    neighbourhoodId: "elmina-valley",
    location: neighbourhoodCenter("elmina-valley"),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pinMoved, setPinMoved] = useState(false);
  const set = <K extends keyof ShopApplicationInputType>(k: K, v: ShopApplicationInputType[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(ShopApplicationInput, form);
    if (result.errors) return setErrors(result.errors);
    apply.mutate(result.data);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Shop name" htmlFor="shopName" error={errors.shopName}>
        <Input id="shopName" value={form.shopName} onChange={(e) => set("shopName", e.target.value)} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Type of business" htmlFor="category" error={errors.category}>
          <Input id="category" value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Bakery, café" />
        </Field>
        <Field label="Halal status" htmlFor="halal">
          <Select id="halal" value={form.halal} onChange={(e) => set("halal", e.target.value as ShopApplicationInputType["halal"])}>
            {HALAL_STATUSES.map((h) => (
              <option key={h} value={h}>
                {HALAL_LABELS[h]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Opening hours" htmlFor="hours" error={errors.openingHours}>
        <Input id="hours" value={form.openingHours} onChange={(e) => set("openingHours", e.target.value)} placeholder="e.g. 8:00 am – 9:00 pm daily" />
      </Field>
      <Field label="Shop address" htmlFor="address" error={errors.address} hint="Shop addresses are public, unlike residents'.">
        <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nearest neighbourhood" htmlFor="shop-hood">
          <Select
            id="shop-hood"
            value={form.neighbourhoodId}
            onChange={(e) => {
              const id = e.target.value as ShopApplicationInputType["neighbourhoodId"];
              // Move the pin with the neighbourhood until the owner places it themselves.
              setForm({ ...form, neighbourhoodId: id, location: pinMoved ? form.location : neighbourhoodCenter(id) });
            }}
          >
            {NEIGHBOURHOODS.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="SSM registration no." htmlFor="ssm" error={errors.ssmNo} hint="Only Township Management sees this">
          <Input id="ssm" value={form.ssmNo} onChange={(e) => set("ssmNo", e.target.value)} placeholder="e.g. 202301045512" />
        </Field>
      </div>
      <Field label="Shop location" hint="Your shop appears on the Places map so neighbours can find you.">
        <Suspense fallback={<Skeleton className="h-56 w-full rounded-2xl" />}>
          <LocationPicker
            value={form.location ?? neighbourhoodCenter(form.neighbourhoodId)}
            onChange={(location) => {
              setPinMoved(true);
              set("location", location);
            }}
            className="h-56"
          />
        </Suspense>
      </Field>
      {apply.isError && <p className="text-sm text-rose-600">{errorMessage(apply.error)}</p>}
      <Button type="submit" className="w-full" size="lg" loading={apply.isPending}>
        <Store /> Submit shop application
      </Button>
    </form>
  );
}

function Pending({ me }: { me: Me }) {
  const demoLogin = useDemoLogin();
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-700">
        <Clock3 className="size-7" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-neutral-900">Waiting for Township Management</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {me.role === "shop"
            ? "They'll check your SSM registration and approve your shop account."
            : "They'll check your unit against their records, usually within one working day."}{" "}
          We'll notify you as soon as you're verified.
        </p>
      </div>
      <div className="rounded-xl bg-neutral-50 p-4 text-left text-sm text-neutral-600">
        <p className="font-semibold text-neutral-800">Trying the demo?</p>
        <p className="mt-1">Switch to the Township Management account, approve yourself under Verifications, then come back.</p>
        <Button className="mt-3" variant="outline" size="sm" onClick={() => demoLogin.mutate("u-admin")} loading={demoLogin.isPending}>
          <Repeat /> Switch to Township Management
        </Button>
      </div>
    </div>
  );
}

export function VerifyPage() {
  const me = useCurrentUser();
  const logout = useLogout();
  if (me.role === "admin" || me.verification === "verified") return <Navigate to={homePathFor(me)} replace />;

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="mb-8 flex w-full max-w-lg items-center justify-between">
        <Logo />
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut /> Log out
        </Button>
      </div>
      <div className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
        {me.verification === "pending" ? (
          <Pending me={me} />
        ) : (
          <>
            <div className="mb-5 flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <ShieldCheck className="size-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-neutral-900">{me.role === "shop" ? "Verify your shop" : "Verify where you live"}</h1>
                <p className="mt-0.5 text-sm text-neutral-500">
                  Neighbourly is only for verified {me.role === "shop" ? "local businesses and residents" : "residents"} of City of Elmina. It's what
                  keeps it private.
                </p>
              </div>
            </div>
            {me.verification === "rejected" && (
              <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                Your last request wasn't approved. Please check your details or visit the Township Management Office.
              </p>
            )}
            {me.role === "shop" ? (
              <ShopForm />
            ) : (
              <Tabs defaultValue="code">
                <TabsList className="mb-5 grid w-full grid-cols-2">
                  <TabsTrigger value="code">I have a unit code</TabsTrigger>
                  <TabsTrigger value="approval">Request approval</TabsTrigger>
                </TabsList>
                <TabsContent value="code">
                  <UnitCodeForm />
                </TabsContent>
                <TabsContent value="approval">
                  <ApprovalForm />
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </div>
    </div>
  );
}
