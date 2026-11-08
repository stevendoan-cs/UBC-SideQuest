import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, Users } from "lucide-react";
import { Screen, pixelButton } from "@/components/app-shell";
import { errorMessage, isApiError, useApi } from "@/lib/api";
import bg from "@/assets/cartoon-campus.jpg";

export const Route = createFileRoute("/queue")({
  head: () => ({ meta: [
    { title: "Finding Your SideQuest — UBC SideQuest" },
    { name: "description", content: "Find your next campus adventure with another UBC student." },
    { property: "og:title", content: "Finding Your SideQuest — UBC SideQuest" },
    { property: "og:description", content: "Find your next campus adventure with another UBC student." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Queue,
});

export const QUEUE_POLL_MS = 2000;
/** Grace period before leaving the queue on unmount; a quick remount (React strict mode) cancels it. */
const LEAVE_DELAY_MS = 300;
let pendingLeave: ReturnType<typeof setTimeout> | undefined;

function Queue() {
  const api = useApi();
  const navigate = useNavigate();
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const matched = useRef(false);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    clearTimeout(pendingLeave);
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inflight: Promise<unknown> = Promise.resolve();

    async function tick(join: boolean) {
      try {
        const request = join ? apiRef.current.joinQueue() : apiRef.current.queueStatus();
        inflight = request.catch(() => undefined);
        const result = await request;
        if (result.matchId) matched.current = true;
        if (stopped) return;
        setError(null);
        if (result.matchId) {
          void navigate({ to: "/quest", search: { matchId: result.matchId }, replace: true });
          return;
        }
        // Not in the queue any more (e.g. it was cleared): join again.
        const rejoin = result.status === "idle";
        setWaitingSince((s) => s ?? Date.now());
        timer = setTimeout(() => void tick(rejoin), rejoin ? 0 : QUEUE_POLL_MS);
      } catch (err) {
        if (stopped) return;
        if (isApiError(err, "PROFILE_REQUIRED")) {
          void navigate({ to: "/setup", replace: true });
          return;
        }
        setError(errorMessage(err));
        timer = setTimeout(() => void tick(join), QUEUE_POLL_MS * 2);
      }
    }

    void tick(true);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(clock);
      // Leaving the page without a match takes you out of the queue, so nobody gets paired
      // with someone who already left.
      // Waits for any in-flight join so the leave can't overtake it.
      const lastRequest = inflight;
      pendingLeave = setTimeout(() => {
        void lastRequest
          .then(() => (matched.current ? undefined : apiRef.current.leaveQueue()))
          .catch(() => undefined);
      }, LEAVE_DELAY_MS);
    };
  }, [navigate]);

  const seconds = waitingSince ? Math.max(0, Math.floor((now - waitingSince) / 1000)) : 0;

  return <Screen bg={bg}>
    <h1 className="title-chip text-center text-2xl text-brand">Finding Your SideQuest...</h1>
    <div className="min-h-48 flex-1" />
    <div className="mt-6 space-y-4">
      <div role="status" className="title-chip flex items-center justify-center gap-3 text-lg font-bold">
        <Users size={22} aria-hidden="true" />
        <span>{waitingSince ? "Players Queued: 1/2" : "Joining queue…"}</span>
        <LoaderCircle className="shrink-0 animate-spin motion-reduce:animate-none" size={22} aria-hidden="true" />
      </div>
      <p className="title-chip text-center text-base font-semibold" aria-live="polite">
        {error ?? (waitingSince ? `Looking for another student… ${seconds}s` : "Hang tight…")}
      </p>
      <button type="button" onClick={() => void navigate({ to: "/home" })} className={`${pixelButton("blue")} gap-2`}>
        <ArrowLeft size={20} aria-hidden="true" />Leave Queue
      </button>
    </div>
  </Screen>;
}
