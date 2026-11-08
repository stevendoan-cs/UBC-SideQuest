
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  Logo,
  Panel,
  PrimaryButton,
  Screen,
} from "@/components/app-shell";
import bg from "@/assets/cartoon-nest.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign In — UBC SideQuest" },
      {
        name: "description",
        content: "Sign in to UBC SideQuest to find quests around campus.",
      },
      { property: "og:title", content: "Sign In — UBC SideQuest" },
      {
        property: "og:description",
        content: "Sign in to UBC SideQuest to find quests around campus.",
      },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();

  const {
    loginWithRedirect,
    isAuthenticated,
    isLoading,
    error,
  } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: "/home", replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSignIn = async () => {
    console.log("SIGN IN BUTTON CLICKED");

    try {
      await loginWithRedirect();
    } catch (error) {
      console.error("AUTH0 LOGIN ERROR:", error);
    }
  };

  return (
    <Screen bg={bg} publicPage>
      <div className="mt-10 mb-auto pb-6">
        <Logo />
      </div>

      <Panel>
        {isLoading ? (
          <p className="text-center">Loading...</p>
        ) : (
          <>
            {error && (
              <p className="mb-4 text-center text-red-600">
                Authentication error: {error.message}
              </p>
            )}

            <div className="space-y-5">
              <PrimaryButton
                type="button"
                onClick={handleSignIn}
              >
                Sign In
              </PrimaryButton>
            </div>

            <p className="mt-5 text-center text-base">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-brand font-bold underline underline-offset-4"
              >
                Create Account
              </Link>
            </p>
          </>
        )}
      </Panel>
    </Screen>
  );
}
