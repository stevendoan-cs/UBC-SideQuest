import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Screen, pixelButton } from "@/components/app-shell";
import { QuestHomeLink } from "@/components/quest-home-link";
import { useQuest, validateMatchSearch } from "@/lib/use-quest";
import bg from "@/assets/cartoon-campus.jpg";

export const Route = createFileRoute("/map")({
  validateSearch: validateMatchSearch,
  head: () => ({ meta: [
    { title: "Quest Map — UBC SideQuest" },
    { name: "description", content: "The map for your UBC campus side quest." },
    { property: "og:title", content: "Quest Map — UBC SideQuest" },
    { property: "og:description", content: "The map for your UBC campus side quest." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: QuestMap,
});

/** Search text for a campus spot, e.g. "UBC Nest" -> "UBC Nest, University of British Columbia, Vancouver". */
export function mapQuery(location: string): string {
  return `${location}, University of British Columbia, Vancouver, BC`;
}

function QuestMap() {
  const { matchId } = Route.useSearch();
  const { id, quest } = useQuest(matchId);
  const location = quest.data?.quest?.location;
  const q = location ? encodeURIComponent(mapQuery(location)) : null;

  return <Screen bg={bg}>
    <h1 className="title-chip text-center text-2xl text-brand">Quest Map</h1>
    {location && <p className="title-chip mt-4 flex items-center justify-center gap-2 text-lg font-bold"><MapPin size={20} aria-hidden="true" />Meet at {location}</p>}
    <div id="quest-map" aria-label={location ? `Map of ${location}` : "Quest map"} className="pixel-frame my-6 flex min-h-[55svh] flex-1 items-center justify-center overflow-hidden bg-muted/90">
      {q ? (
        <iframe title={`Map of ${location}`} src={`https://www.google.com/maps?q=${q}&output=embed`} className="h-full min-h-[55svh] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground"><MapPin size={36} aria-hidden="true" /><span className="text-lg font-bold">{quest.isLoading ? "Loading map…" : "No active quest to show"}</span></div>
      )}
    </div>
    <div className="space-y-4">
      {q && <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noreferrer" className={`${pixelButton("gold")} gap-2`}><ExternalLink size={20} aria-hidden="true" />Open in Google Maps</a>}
      {id && <Link to="/quest" search={{ matchId: id }} className={`${pixelButton("quest")} gap-2`}><ArrowLeft size={20} aria-hidden="true" />Back to Quest</Link>}
      <QuestHomeLink />
    </div>
  </Screen>;
}
