import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_URL } from "./config";
import { useAuth } from "./auth";

// Typed client for the SideQuest backend (backend/README.md §5). Every request carries the
// signed-in user's access token; the backend derives the user id from it.

export const COMFORT_LEVELS = ["chill", "adventure", "chaos"] as const;
export type ComfortLevel = (typeof COMFORT_LEVELS)[number];

export interface ProfileInput {
  displayName: string;
  interests: string[];
  comfortLevel: ComfortLevel;
  availableMinutes: number;
  maxBudget: number;
}

export interface Profile extends ProfileInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  stats: { completedQuests: number; totalXp: number };
}

export type QueueStatus =
  | { status: "idle"; matchId: null; joinedAt: null }
  | { status: "waiting"; matchId: null; joinedAt: string }
  | { status: "generating" | "active"; matchId: string; joinedAt: null };

export interface JoinResult {
  status: "waiting" | "matched";
  matchId: string | null;
}

export type MatchStatus = "generating" | "active" | "completed" | "cancelled";

export interface Quest {
  id: string;
  title: string;
  description: string;
  location: string;
  durationMinutes: number;
  xp: number;
  createdAt: string;
}

export interface QuestView {
  matchId: string;
  matchStatus: MatchStatus;
  questStatus: "pending" | "ready" | "unavailable";
  quest: Quest | null;
  partner: { displayName: string } | null;
  completion: { confirmedByMe: boolean; partnerConfirmed: boolean };
}

export interface CompletionResult {
  matchId: string;
  matchStatus: "active" | "completed";
  confirmedByMe: boolean;
  partnerConfirmed: boolean;
  waitingForPartner: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

/** A short, user-facing explanation of any error thrown by the API client. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "NETWORK_ERROR") return "Can't reach the SideQuest server. Check your connection and try again.";
    if (error.status === 401) return "Your session expired. Please sign in again.";
    if (error.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
      const first = error.details[0] as { path?: string; message?: string } | undefined;
      if (first?.message) return first.path ? `${first.path}: ${first.message}` : first.message;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

type GetToken = () => Promise<string>;
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export function createApi(getToken: GetToken, fetchImpl: FetchLike = (input, init) => fetch(input, init)) {
  async function request<T>(method: "GET" | "POST" | "PUT", path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = { accept: "application/json", authorization: `Bearer ${token}` };
    if (body !== undefined) headers["content-type"] = "application/json";

    let response: Response;
    try {
      response = await fetchImpl(`${API_URL}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError(0, "NETWORK_ERROR", "Network error");
    }

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      /* empty or non-JSON body */
    }
    if (!response.ok) {
      const err = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      throw new ApiError(response.status, err?.code ?? `HTTP_${response.status}`, err?.message ?? `Request failed (${response.status})`, err?.details);
    }
    return payload as T;
  }

  const id = (matchId: string) => encodeURIComponent(matchId);

  return {
    /** The signed-in user's profile, or null if they haven't created one yet. */
    async getProfile(): Promise<Profile | null> {
      try {
        return await request<Profile>("GET", "/api/profile");
      } catch (error) {
        if (isApiError(error, "PROFILE_NOT_FOUND")) return null;
        throw error;
      }
    },
    saveProfile: (input: ProfileInput) => request<Profile>("PUT", "/api/profile", input),
    joinQueue: () => request<JoinResult>("POST", "/api/queue/join"),
    leaveQueue: () => request<{ status: "idle"; left: boolean }>("POST", "/api/queue/leave"),
    queueStatus: () => request<QueueStatus>("GET", "/api/queue/status"),
    getQuest: (matchId: string) => request<QuestView>("GET", `/api/quests/${id(matchId)}`),
    completeQuest: (matchId: string) => request<CompletionResult>("POST", `/api/quests/${id(matchId)}/complete`),
    cancelMatch: (matchId: string) => request<{ matchId: string; matchStatus: "cancelled" }>("POST", `/api/matches/${id(matchId)}/cancel`),
  };
}

export type Api = ReturnType<typeof createApi>;

export function useApi(): Api {
  const { getToken } = useAuth();
  return useMemo(() => createApi(getToken), [getToken]);
}

export const profileQueryKey = ["profile"] as const;

/** The signed-in user's profile. `fresh` always refetches on mount (e.g. the stats page). */
export function useProfile({ fresh = false }: { fresh?: boolean } = {}) {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: () => api.getProfile(),
    enabled: status === "signedIn",
    staleTime: 30_000,
    ...(fresh ? { refetchOnMount: "always" as const } : {}),
    retry: (count, error) => !(error instanceof ApiError && error.status > 0 && error.status < 500) && count < 2,
  });
}
