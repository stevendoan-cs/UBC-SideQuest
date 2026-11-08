import { describe, expect, it, vi } from "vitest";
import { ApiError, createApi, errorMessage } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { questRefetchInterval, validateMatchSearch } from "@/lib/use-quest";
import { mapQuery } from "@/routes/map";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function setup(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const api = createApi(async () => "tok", async (url, init) => {
    calls.push({ url, init });
    return respond(url, init);
  });
  return { api, calls };
}

describe("API client", () => {
  it("defaults to the deployed backend over HTTPS", () => {
    expect(API_URL).toBe("https://45-32-230-78.sslip.io");
  });

  it("sends the bearer token and JSON body to the right endpoint", async () => {
    const { api, calls } = setup(() => json({ id: "u1" }));
    const input = { displayName: "Ana", interests: ["music"], comfortLevel: "chill" as const, availableMinutes: 30, maxBudget: 5 };
    await api.saveProfile(input);
    expect(calls[0]!.url).toBe(`${API_URL}/api/profile`);
    expect(calls[0]!.init.method).toBe("PUT");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer tok");
    expect(headers["content-type"]).toBe("application/json");
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual(input);
  });

  it("maps every call to the documented route", async () => {
    const { api, calls } = setup(() => json({}));
    await api.joinQueue();
    await api.leaveQueue();
    await api.queueStatus();
    await api.getQuest("match/1");
    await api.completeQuest("m1");
    await api.cancelMatch("m1");
    expect(calls.map((c) => `${c.init.method} ${c.url.replace(API_URL, "")}`)).toEqual([
      "POST /api/queue/join",
      "POST /api/queue/leave",
      "GET /api/queue/status",
      "GET /api/quests/match%2F1",
      "POST /api/quests/m1/complete",
      "POST /api/matches/m1/cancel",
    ]);
    expect(calls[0]!.init.body).toBeUndefined();
  });

  it("returns null when the user has no profile yet", async () => {
    const { api } = setup(() => json({ error: { code: "PROFILE_NOT_FOUND", message: "No profile yet." } }, 404));
    expect(await api.getProfile()).toBeNull();
  });

  it("raises ApiError with the backend's code, message and details", async () => {
    const { api } = setup(() => json({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: [{ path: "interests", message: "pick at least one interest" }] } }, 400));
    const err = await api.saveProfile({ displayName: "A", interests: [], comfortLevel: "chill", availableMinutes: 30, maxBudget: 0 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).code).toBe("VALIDATION_ERROR");
    expect(errorMessage(err)).toBe("interests: pick at least one interest");
  });

  it("turns network failures and non-JSON errors into friendly ApiErrors", async () => {
    const offline = setup(() => { throw new TypeError("Failed to fetch"); });
    const err = await offline.api.queueStatus().catch((e: unknown) => e);
    expect((err as ApiError).code).toBe("NETWORK_ERROR");
    expect(errorMessage(err)).toMatch(/Can't reach the SideQuest server/);

    const html = setup(() => new Response("<html>Bad gateway</html>", { status: 502 }));
    const err2 = await html.api.queueStatus().catch((e: unknown) => e);
    expect((err2 as ApiError).code).toBe("HTTP_502");
    expect(errorMessage(new ApiError(401, "UNAUTHORIZED", "x"))).toMatch(/sign in again/);
  });

  it("propagates token failures without calling the backend", async () => {
    const fetchImpl = vi.fn();
    const api = createApi(async () => { throw new Error("login_required"); }, fetchImpl);
    await expect(api.joinQueue()).rejects.toThrow("login_required");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("quest helpers", () => {
  const view = (matchStatus: "generating" | "active" | "completed" | "cancelled", questStatus: "pending" | "ready" | "unavailable" = "ready") => ({
    matchId: "m", matchStatus, questStatus, quest: null, partner: null, completion: { confirmedByMe: false, partnerConfirmed: false },
  });
  it("polls fast while generating, slower while active, and stops when finished", () => {
    expect(questRefetchInterval(undefined)).toBe(3000);
    expect(questRefetchInterval(view("generating", "pending"))).toBe(1500);
    expect(questRefetchInterval(view("active"))).toBe(4000);
    expect(questRefetchInterval(view("completed"))).toBe(false);
    expect(questRefetchInterval(view("cancelled"))).toBe(false);
  });
  it("reads ?matchId= safely", () => {
    expect(validateMatchSearch({ matchId: "match_1" })).toEqual({ matchId: "match_1" });
    expect(validateMatchSearch({ matchId: 5 })).toEqual({});
    expect(validateMatchSearch({})).toEqual({});
  });
  it("builds a campus map search", () => {
    expect(mapQuery("UBC Nest")).toBe("UBC Nest, University of British Columbia, Vancouver, BC");
  });
});
