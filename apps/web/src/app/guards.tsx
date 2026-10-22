import { Loader2 } from "lucide-react";
import { Link, Navigate, Outlet, isRouteErrorResponse, useLocation, useRouteError } from "react-router";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import { homePathFor, useCurrentUser, useMe } from "@/features/auth/api";

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3 text-neutral-500">
        <LogoMark className="size-12" />
        <Loader2 className="size-5 animate-spin" />
      </div>
    </div>
  );
}

/**
 * The account couldn't be loaded for a reason other than an expired session (a 401 already
 * clears the token and sends people to log in). Waits for the person instead of redirecting,
 * because bouncing between /login and /home would refetch in a loop.
 */
function SessionError({ onRetry }: { onRetry: () => void }) {
  const setToken = useSession((s) => s.setToken);
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <LogoMark className="mx-auto mb-4 size-12" />
        <h1 className="text-xl font-bold text-neutral-900">Can't reach Neighbourly</h1>
        <p className="mt-2 text-sm text-neutral-500">Check your connection and try again. If you're running the demo, reloading the page restarts the sample data.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={onRetry}>Try again</Button>
          <Button variant="outline" onClick={() => setToken(null)}>
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Signed in (verified or not). Used by the verify and onboarding steps. */
export function RequireSession() {
  const token = useSession((s) => s.token);
  const me = useMe();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // A failed background refresh keeps the last known account, like PublicOnly does.
  if (me.data) return <Outlet />;
  if (me.isError) return <SessionError onRetry={() => void me.refetch()} />;
  return <Splash />;
}

/** Signed in, verified and onboarded: the main app. */
export function RequireVerified() {
  const token = useSession((s) => s.token);
  const me = useMe();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!me.data) return me.isError ? <SessionError onRetry={() => void me.refetch()} /> : <Splash />;
  const home = homePathFor(me.data);
  if (home === "/verify" || home === "/onboarding") return <Navigate to={home} replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const me = useCurrentUser();
  if (me.role !== "admin") return <Navigate to="/home" replace />;
  return <Outlet />;
}

/** Login and sign-up pages send signed-in users to their home. */
export function PublicOnly() {
  const token = useSession((s) => s.token);
  const me = useMe();
  if (token && me.data) return <Navigate to={homePathFor(me.data)} replace />;
  return <Outlet />;
}

export function RouteError() {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <LogoMark className="mx-auto mb-4 size-12" />
        <h1 className="text-xl font-bold text-neutral-900">{notFound ? "Page not found" : "Something went wrong"}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {notFound ? "That page doesn't exist." : "Please reload the page. If it keeps happening, reset the demo data from the account menu."}
        </p>
        <Button asChild className="mt-5">
          <Link to="/">Back to Neighbourly</Link>
        </Button>
      </div>
    </div>
  );
}
