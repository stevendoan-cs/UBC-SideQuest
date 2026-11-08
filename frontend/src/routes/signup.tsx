import { createFileRoute } from "@tanstack/react-router";
import { Logo, Screen } from "@/components/app-shell";
import { SignInPanel } from "@/components/sign-in-panel";
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
  return (
    <Screen bg={bg} publicPage>
      <div className="mt-6 mb-auto pb-6"><Logo /></div>
      <SignInPanel signup />
    </Screen>
  );
}
