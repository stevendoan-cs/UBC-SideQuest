import { useQuery } from "@tanstack/react-query";
import { useApi, type QuestView } from "./api";

/** `?matchId=` search param shared by /quest and /map. */
export function validateMatchSearch(search: Record<string, unknown>): { matchId?: string } {
  return typeof search["matchId"] === "string" && search["matchId"] ? { matchId: search["matchId"] } : {};
}

/** How often to refresh a quest: fast while it's generating, slower while waiting on a partner. */
export function questRefetchInterval(view: QuestView | undefined): number | false {
  if (!view) return 3000;
  if (view.matchStatus === "generating" || view.questStatus === "pending") return 1500;
  if (view.matchStatus === "active") return 4000;
  return false;
}

/**
 * The quest for `matchId`, or, when no id is given (e.g. opening /quest directly), the user's
 * current open match from the queue status.
 */
export function useQuest(matchId: string | undefined) {
  const api = useApi();
  const current = useQuery({
    queryKey: ["queueStatus"],
    queryFn: () => api.queueStatus(),
    enabled: !matchId,
  });
  const id = matchId ?? current.data?.matchId ?? undefined;
  const quest = useQuery({
    queryKey: ["quest", id],
    queryFn: () => api.getQuest(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => questRefetchInterval(query.state.data),
  });
  const noMatch = !matchId && current.isSuccess && !current.data.matchId;
  return { id, quest, noMatch, lookupError: current.error };
}
