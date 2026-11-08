import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Logo, Panel, Screen } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import bg from "@/assets/cartoon-nest.jpg";

// Auth0 redirects here after login/sign-up with ?code=…&state=… (or ?error=…).
export const Route = createFileRoute("/callback")({
  head: () => ({ meta: [{ title: "Signing In — UBC SideQuest" }, { name: "robots", content: "noindex" }] }),
  component: Callback,
});

function Callback() {
  const { handleCallback } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback()
      .then((to) => navigate({ to, replace: true }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Sign-in failed."));
  }, [handleCallback, navigate]);

  return (
    <Screen bg={bg} publicPage>
      <div className="mt-10 mb-auto pb-6"><Logo /></div>
      <Panel className="text-center">
        {error ? (
          <>
            <p role="alert" className="text-lg text-destructive text-pixel-shadow">{error}</p>
            <Link to="/" className="mt-4 inline-block text-brand font-bold underline underline-offset-4">Back to Sign In</Link>
          </>
        ) : (
          <p role="status" className="flex items-center justify-center gap-3 text-lg font-bold">
            <LoaderCircle className="animate-spin motion-reduce:animate-none" size={22} aria-hidden="true" /> Signing you in…
          </p>
        )}
      </Panel>
    </Screen>
  );
}
