import { createFileRoute } from "@tanstack/react-router";
import { Logo, Screen } from "@/components/app-shell";
import { SignInPanel } from "@/components/sign-in-panel";
import bg from "@/assets/cartoon-nest.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign In — UBC SideQuest" },
      { name: "description", content: "Sign in to UBC SideQuest to find quests around campus." },
      { property: "og:title", content: "Sign In — UBC SideQuest" },
      { property: "og:description", content: "Sign in to UBC SideQuest to find quests around campus." },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  return (
    <Screen bg={bg} publicPage>
      <div className="mt-10 mb-auto pb-6"><Logo /></div>
      <SignInPanel />
    </Screen>
  );
}
