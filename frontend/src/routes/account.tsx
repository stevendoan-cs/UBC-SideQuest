import { createFileRoute, Link } from "@tanstack/react-router";
import { LogOut, Pencil } from "lucide-react";
import { Panel, PrimaryButton, SubPage, pixelButton } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/api";
import bg from "@/assets/cartoon-koerner.jpg";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Account — UBC SideQuest" },
      { name: "description", content: "View and edit your SideQuest profile." },
      { property: "og:title", content: "Account — UBC SideQuest" },
      { property: "og:description", content: "View and edit your SideQuest profile." },
    ],
  }),
  component: Account,
});

function Account() {
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();
  return (
    <SubPage bg={bg} title="Account" illustration="account" text={user?.email ? `Signed in as ${user.email}` : "Your SideQuest profile."}>
      {profile && (
        <Panel className="mb-6 space-y-2 text-lg">
          <p><span className="font-bold">Name:</span> {profile.displayName}</p>
          <p><span className="font-bold">Interests:</span> {profile.interests.join(", ")}</p>
          <p><span className="font-bold">Free time:</span> {profile.availableMinutes} min</p>
          <p><span className="font-bold">Budget:</span> {profile.maxBudget === 0 ? "Free only" : `Up to $${profile.maxBudget}`}</p>
          <p><span className="font-bold">Vibe:</span> {profile.comfortLevel}</p>
        </Panel>
      )}
      <div className="space-y-4">
        <Link to="/setup" className={`${pixelButton("blue")} gap-3`}><Pencil aria-hidden="true" size={20} />Edit Profile</Link>
        <PrimaryButton onClick={() => void logout()} className="gap-3"><LogOut aria-hidden="true" size={20} />Sign Out</PrimaryButton>
      </div>
    </SubPage>
  );
}
