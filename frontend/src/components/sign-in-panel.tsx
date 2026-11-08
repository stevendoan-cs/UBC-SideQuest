import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Field, Panel, PrimaryButton } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";

/**
 * Shared by the sign-in and create-account pages. With Auth0 the buttons open Auth0's hosted
 * login / sign-up page (passwords are handled there, never here). In local dev mode a name field
 * signs you in as a test user instead.
 */
export function SignInPanel({ signup = false }: { signup?: boolean }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [devName, setDevName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status === "signedIn") void navigate({ to: "/home", replace: true });
  }, [auth.status, navigate]);

  async function go(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    await auth.login({ signup, devName });
    setBusy(false);
  }

  const action = signup ? "Create Account" : "Sign In";
  return (
    <Panel>
      {signup && <h2 className="mb-5 text-center text-xl text-brand">Create your account</h2>}
      {auth.mode === "dev" ? (
        <form onSubmit={go} className="space-y-5">
          <Field label="Test user name (dev mode)" value={devName} onChange={(e) => setDevName(e.target.value)} autoCapitalize="none" placeholder="e.g. alice" required />
          {auth.error && <p role="alert" className="text-base text-destructive text-pixel-shadow">{auth.error}</p>}
          <PrimaryButton type="submit" disabled={busy}>{action}</PrimaryButton>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-center text-lg">
            {signup ? "You'll pick your email and password on our secure sign-in page." : "Sign in to find your next campus quest."}
          </p>
          {auth.error && <p role="alert" className="text-base text-destructive text-pixel-shadow">{auth.error}</p>}
          <PrimaryButton type="button" onClick={() => void go()} disabled={busy || auth.status === "loading"}>
            {busy ? "Opening…" : action}
          </PrimaryButton>
        </div>
      )}
      <p className="mt-5 text-center text-base">
        {signup ? "Already have an account? " : "Don't have an account? "}
        <Link to={signup ? "/" : "/signup"} className="text-brand font-bold underline underline-offset-4">
          {signup ? "Sign In" : "Create Account"}
        </Link>
      </p>
    </Panel>
  );
}
