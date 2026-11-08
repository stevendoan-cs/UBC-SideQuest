import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Logo, Panel, PrimaryButton, Screen } from "@/components/app-shell";
import bg from "@/assets/cartoon-clocktower.jpg";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Create Account — UBC SideQuest" },
      { name: "description", content: "Create your UBC SideQuest account." },
      { property: "og:title", content: "Create Account — UBC SideQuest" },
      { property: "og:description", content: "Create your UBC SideQuest account." },
    ],
  }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: "/verify", replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <Screen bg={bg} publicPage>
      <div className="mt-6 mb-auto pb-6">
        <Logo />
      </div>
      <Panel>
        <h2 className="mb-5 text-center text-xl text-brand">
          Create your account
        </h2>

        {isLoading ? (
          <p className="text-center">Loading...</p>
        ) : (
          <>
            <PrimaryButton
              type="button"
              onClick={() =>
                void loginWithRedirect({
                  authorizationParams: {
                    screen_hint: "signup",
                  },
                })
              }
            >
              Create Account
            </PrimaryButton>

            <p className="mt-5 text-center text-base">
              Already have an account?{" "}
              <Link
                to="/"
                className="text-brand font-bold underline underline-offset-4"
              >
                Sign In
              </Link>
            </p>
          </>
        )}
      </Panel>
    </Screen>
  );
}