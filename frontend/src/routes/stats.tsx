import { createFileRoute } from "@tanstack/react-router";
import { Panel, SubPage } from "@/components/app-shell";
import { useProfile } from "@/lib/api";
import bg from "@/assets/cartoon-chan.jpg";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Stats — UBC SideQuest" },
      { name: "description", content: "Your activity and quest stats will appear here." },
      { property: "og:title", content: "Stats — UBC SideQuest" },
      { property: "og:description", content: "Your activity and quest stats will appear here." },
    ],
  }),
  component: Stats,
});

function Stats() {
  const { data: profile } = useProfile({ fresh: true });
  const stats = profile?.stats ?? { completedQuests: 0, totalXp: 0 };
  return (
    <SubPage bg={bg} title="Stats" illustration="stats" text="Your SideQuest progress.">
      <div className="grid grid-cols-2 gap-4">
        <Panel className="text-center">
          <p className="text-4xl font-extrabold text-brand" data-testid="completed-quests">{stats.completedQuests}</p>
          <p className="mt-1 text-base font-bold">Quests completed</p>
        </Panel>
        <Panel className="text-center">
          <p className="text-4xl font-extrabold text-brand" data-testid="total-xp">{stats.totalXp}</p>
          <p className="mt-1 text-base font-bold">Total XP</p>
        </Panel>
      </div>
    </SubPage>
  );
}
