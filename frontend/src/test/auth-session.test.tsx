import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AuthContext, type AuthContextValue, type AuthStatus } from "@/lib/auth";
import { SessionGate } from "@/components/session-gate";

const navigation = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigation.navigate }));

const PROFILE = {
  id: "auth0|abc", displayName: "Hayden", interests: ["music"], comfortLevel: "chill",
  availableMinutes: 30, maxBudget: 0, createdAt: "", updatedAt: "", stats: { completedQuests: 0, totalXp: 0 },
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const fetchMock = vi.fn<typeof fetch>();

function fakeAuth(status: AuthStatus): AuthContextValue {
  return {
    status, user: status === "signedIn" ? { name: "Hayden" } : null, error: null, mode: "auth0",
    login: vi.fn(), logout: vi.fn(), getToken: async () => "token-123", handleCallback: vi.fn(),
  };
}

function renderGate(status: AuthStatus, gate: ReactNode = <SessionGate><div>Private content</div></SessionGate>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={fakeAuth(status)}>{gate}</AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigation.navigate.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("SessionGate", () => {
  it("redirects signed-out visitors to sign-in and hides member content", async () => {
    const view = renderGate("signedOut");
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith({ to: "/", replace: true }));
    expect(view.queryByText("Private content")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a loader (and does not redirect) while the session is being restored", () => {
    const view = renderGate("loading");
    expect(view.getByRole("status")).toHaveTextContent("Loading");
    expect(view.queryByText("Private content")).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("shows member pages to a signed-in user with a profile, sending their access token", async () => {
    fetchMock.mockResolvedValue(json(PROFILE));
    const view = renderGate("signedIn");
    expect(await view.findByText("Private content")).toBeInTheDocument();
    expect(navigation.navigate).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/api\/profile$/);
    expect((init?.headers as Record<string, string>)["authorization"]).toBe("Bearer token-123");
  });

  it("sends signed-in users without a profile to onboarding", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "PROFILE_NOT_FOUND", message: "No profile yet." } }, 404));
    const view = renderGate("signedIn");
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith({ to: "/verify", replace: true }));
    expect(view.queryByText("Private content")).toBeNull();
  });

  it("lets onboarding pages render before a profile exists", async () => {
    fetchMock.mockResolvedValue(json({ error: { code: "PROFILE_NOT_FOUND", message: "No profile yet." } }, 404));
    const view = renderGate("signedIn", <SessionGate requireProfile={false}><div>Setup form</div></SessionGate>);
    expect(await view.findByText("Setup form")).toBeInTheDocument();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it("retries network failures, then offers a retry button", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const view = renderGate("signedIn");
    // Two automatic retries (1s + 2s back-off) before the error is shown.
    expect(await view.findByText(/Can't reach the SideQuest server/, {}, { timeout: 6000 })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(view.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  }, 10_000);
});
