import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { errorMessage, useProfile } from "@/lib/api";

/**
 * Guards member pages. Signed-out visitors go to sign-in; signed-in users without a SideQuest
 * profile go to the onboarding flow (verify, then profile setup) unless `requireProfile` is off.
 * This only controls what the UI shows. The backend independently verifies every request's token.
 */
export function SessionGate({ children, requireProfile = true }: { children: ReactNode; requireProfile?: boolean }) {
  const navigate = useNavigate();
  const { status } = useAuth();
  const profile = useProfile();
  const needsOnboarding = requireProfile && status === "signedIn" && profile.isSuccess && profile.data === null;

  useEffect(() => {
    if (status === "signedOut") void navigate({ to: "/", replace: true });
  }, [status, navigate]);

  useEffect(() => {
    if (needsOnboarding) void navigate({ to: "/verify", replace: true });
  }, [needsOnboarding, navigate]);

  if (status !== "signedIn") return status === "loading" ? <GateMessage loading>Loading…</GateMessage> : null;
  if (!requireProfile) return children;
  if (profile.isError) {
    return (
      <GateMessage>
        <p>{errorMessage(profile.error)}</p>
        <button type="button" onClick={() => void profile.refetch()} className="mt-4 underline underline-offset-4 font-bold">
          Try again
        </button>
      </GateMessage>
    );
  }
  if (!profile.data) return <GateMessage loading>Loading your profile…</GateMessage>;
  return children;
}

function GateMessage({ children, loading = false }: { children: ReactNode; loading?: boolean }) {
  return (
    <div role="status" className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-lg font-bold">
      {loading && <LoaderCircle className="mb-3 animate-spin motion-reduce:animate-none" size={32} aria-hidden="true" />}
      {children}
    </div>
  );
}
