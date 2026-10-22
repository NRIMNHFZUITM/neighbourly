import { SignupInput, type SignupInputType } from "@neighbourly/shared";
import { Home, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { validate, type FieldErrors } from "@/lib/forms";
import { useSignup } from "./api";

export function SignupPage() {
  const signup = useSignup();
  const [form, setForm] = useState<SignupInputType>({ name: "", email: "", password: "", accountType: "resident" });
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validate(SignupInput, form);
    if (result.errors) return setErrors(result.errors);
    setErrors({});
    signup.mutate(result.data);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <Link to="/" className="mb-8">
        <Logo />
      </Link>
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Join your neighbours</h1>
        <p className="mt-1 text-sm text-neutral-500">Next you'll verify that you live in, or run a shop in, City of Elmina.</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-neutral-800">I'm joining as</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["resident", "A resident", Home],
                  ["shop", "A local shop", Store],
                ] as const
              ).map(([value, label, Icon]) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm font-semibold transition",
                    form.accountType === value ? "border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/20" : "border-neutral-300 text-neutral-700",
                  )}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={value}
                    checked={form.accountType === value}
                    onChange={() => setForm({ ...form, accountType: value })}
                    className="sr-only"
                  />
                  <Icon className="size-4" /> {label}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label={form.accountType === "shop" ? "Your name (shop owner)" : "Full name"} htmlFor="name" error={errors.name}>
            <Input id="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" htmlFor="su-email" error={errors.email}>
            <Input id="su-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password" htmlFor="su-password" error={errors.password} hint="At least 8 characters">
            <Input
              id="su-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          {signup.isError && <p className="text-sm font-medium text-rose-600">{errorMessage(signup.error)}</p>}
          <Button type="submit" size="lg" className="w-full" loading={signup.isPending}>
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
