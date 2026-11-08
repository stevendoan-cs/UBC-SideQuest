import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Check, Clock, Compass, LoaderCircle, MapPin, Star, Users, X } from "lucide-react";
import { Panel, PrimaryButton, Screen, pixelButton } from "@/components/app-shell";
import { CampusIllustration } from "@/components/campus-illustration";
import { QuestHomeLink } from "@/components/quest-home-link";
import { errorMessage, profileQueryKey, useApi, type QuestView } from "@/lib/api";
import { useQuest, validateMatchSearch } from "@/lib/use-quest";
import bg from "@/assets/cartoon-moa.jpg";

export const Route = createFileRoute("/quest")({
  validateSearch: validateMatchSearch,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Side Quest — UBC SideQuest" },
      { name: "description", content: "Your SideQuest: a campus adventure with another UBC student." },
      { property: "og:title", content: "Side Quest — UBC SideQuest" },
      { property: "og:description", content: "Your SideQuest: a campus adventure with another UBC student." },
    ],
  }),
  component: SideQuest,
});

function SideQuest() {
  const { matchId } = Route.useSearch();
  const { id, quest, noMatch, lookupError } = useQuest(matchId);
  const view = quest.data;

  let body;
  if (noMatch) body = <NoQuest text="You don't have an active quest right now." />;
  else if (lookupError || quest.isError) body = <NoQuest text={errorMessage(lookupError ?? quest.error)} />;
  else if (!view || view.questStatus === "pending") body = <Generating partner={view?.partner?.displayName} />;
  else if (view.matchStatus === "cancelled") body = <NoQuest text={`This quest was cancelled${view.partner ? ` (you were matched with ${view.partner.displayName})` : ""}.`} />;
  else if (view.quest) body = <QuestCard view={view} matchId={id as string} />;
  else body = <NoQuest text="This quest isn't available any more." />;

  return <Screen bg={bg}>
    <h1 className="title-chip text-center text-2xl text-brand">SIDE QUEST</h1>
    {body}
  </Screen>;
}

function Generating({ partner }: { partner: string | undefined }) {
  return <>
    <div className="flex flex-1 items-center py-8">
      <Panel className="w-full text-center">
        <CampusIllustration kind="quest" />
        {partner && <p className="mt-4 text-lg font-bold">You matched with {partner}!</p>}
        <p role="status" className="mt-3 flex items-center justify-center gap-3 text-xl font-extrabold">
          <LoaderCircle className="animate-spin motion-reduce:animate-none" size={24} aria-hidden="true" /> Creating your quest…
        </p>
      </Panel>
    </div>
    <QuestHomeLink />
  </>;
}

function NoQuest({ text }: { text: string }) {
  return <>
    <div className="flex flex-1 items-center py-8">
      <Panel className="w-full text-center">
        <CampusIllustration kind="quest" />
        <p className="mt-5 text-xl font-bold">{text}</p>
      </Panel>
    </div>
    <div className="space-y-4">
      <Link to="/queue" className={`${pixelButton("quest")} gap-2`}><Compass size={22} aria-hidden="true" />Find a Quest</Link>
      <QuestHomeLink />
    </div>
  </>;
}

function QuestCard({ view, matchId }: { view: QuestView; matchId: string }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const quest = view.quest!;
  const partner = view.partner?.displayName ?? "your partner";
  const done = view.matchStatus === "completed";

  // Completion can arrive by polling (partner confirmed last), so refresh stats when it does.
  useEffect(() => {
    if (done) void queryClient.invalidateQueries({ queryKey: profileQueryKey });
  }, [done, queryClient]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["quest", matchId] });
    void queryClient.invalidateQueries({ queryKey: profileQueryKey });
  };
  const complete = useMutation({ mutationFn: () => api.completeQuest(matchId), onSettled: refresh });
  const cancel = useMutation({
    mutationFn: () => api.cancelMatch(matchId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["quest", matchId] });
      void navigate({ to: "/home" });
    },
  });
  const actionError = complete.error ?? cancel.error;

  return <>
    <div className="flex flex-1 items-center py-6">
      <Panel className="w-full text-center">
        <CampusIllustration kind="quest" />
        <h2 className="mt-4 text-2xl font-extrabold leading-snug text-brand">{quest.title}</h2>
        <p className="mt-3 text-lg leading-relaxed">{quest.description}</p>
        <ul className="mt-4 flex flex-wrap justify-center gap-2 text-base font-bold">
          <li className="pixel-box flex items-center gap-1.5 bg-input px-3 py-1.5"><MapPin size={18} aria-hidden="true" />{quest.location}</li>
          <li className="pixel-box flex items-center gap-1.5 bg-input px-3 py-1.5"><Clock size={18} aria-hidden="true" />{quest.durationMinutes} min</li>
          <li className="pixel-box flex items-center gap-1.5 bg-input px-3 py-1.5"><Star size={18} aria-hidden="true" />{quest.xp} XP</li>
        </ul>
        <p className="mt-4 flex items-center justify-center gap-2 text-lg font-semibold"><Users size={20} aria-hidden="true" />With {partner}</p>
        {done ? (
          <p role="status" className="mt-4 text-xl font-extrabold text-brand">Quest complete! +{quest.xp} XP</p>
        ) : view.completion.confirmedByMe ? (
          <p role="status" className="mt-4 text-lg font-bold">Waiting for {partner} to confirm…</p>
        ) : view.completion.partnerConfirmed ? (
          <p role="status" className="mt-4 text-lg font-bold">{partner} marked it done. Confirm to finish!</p>
        ) : null}
        {actionError && <p role="alert" className="mt-3 text-base text-destructive text-pixel-shadow">{errorMessage(actionError)}</p>}
      </Panel>
    </div>
    <div className="space-y-4">
      {done ? (
        <>
          <Link to="/stats" className={`${pixelButton("quest")} gap-2`}><Star size={22} aria-hidden="true" />View Stats</Link>
          <Link to="/queue" className={`${pixelButton("gold")} gap-2`}><Compass size={22} aria-hidden="true" />Find Another Quest</Link>
        </>
      ) : (
        <>
          <Link to="/map" search={{ matchId }} className={`${pixelButton("gold")} gap-2`}><MapPin size={22} aria-hidden="true" />View on Map</Link>
          <PrimaryButton variant="quest" className="gap-2" disabled={view.completion.confirmedByMe || complete.isPending} onClick={() => complete.mutate()}>
            <Check size={22} aria-hidden="true" />{view.completion.confirmedByMe ? "Marked Complete" : "We Did It!"}
          </PrimaryButton>
          <PrimaryButton variant="blue" className="gap-2" disabled={cancel.isPending} onClick={() => {
            if (window.confirm(`Cancel this quest with ${partner}?`)) cancel.mutate();
          }}>
            <X size={20} aria-hidden="true" />Cancel Quest
          </PrimaryButton>
        </>
      )}
      <QuestHomeLink />
    </div>
  </>;
}
