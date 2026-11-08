import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth, type AuthContextValue } from "@/lib/auth";

// A fake Auth0 SDK: no network, no real tenant.
const auth0 = vi.hoisted(() => ({
  client: {
    isAuthenticated: vi.fn<() => Promise<boolean>>(),
    getUser: vi.fn<() => Promise<Record<string, string> | undefined>>(),
    getTokenSilently: vi.fn<() => Promise<string>>(),
    loginWithRedirect: vi.fn<(o: unknown) => Promise<void>>(),
    logout: vi.fn<(o: unknown) => Promise<void>>(),
    handleRedirectCallback: vi.fn<() => Promise<unknown>>(),
  },
  options: null as unknown,
}));
vi.mock("@auth0/auth0-spa-js", () => ({
  createAuth0Client: vi.fn(async (options: unknown) => {
    auth0.options = options;
    return auth0.client;
  }),
}));

let ctx: AuthContextValue;
function Probe() {
  ctx = useAuth();
  return <output data-testid="status">{ctx.status}:{ctx.user?.name ?? ""}</output>;
}
const status = () => screen.getByTestId("status").textContent;

beforeEach(() => {
  Object.values(auth0.client).forEach((fn) => fn.mockReset());
  auth0.client.getUser.mockResolvedValue({ name: "Ana Student", email: "ana@student.ubc.ca" });
});
afterEach(cleanup);

describe("AuthProvider (Auth0)", () => {
  it("configures the SPA SDK for the SideQuest API audience and /callback", async () => {
    auth0.client.isAuthenticated.mockResolvedValue(false);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(status()).toBe("signedOut:"));
    expect(auth0.options).toMatchObject({
      domain: "dev-g3dq8mjgmfyqjdkh.us.auth0.com",
      clientId: "agjMp8EJUchKtfFPOCCykZanIkoS6FDR",
      authorizationParams: { audience: "https://api.ubc-sidequest", redirect_uri: `${window.location.origin}/callback` },
    });
  });

  it("restores an existing session and hands out access tokens", async () => {
    auth0.client.isAuthenticated.mockResolvedValue(true);
    auth0.client.getTokenSilently.mockResolvedValue("access-token");
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(status()).toBe("signedIn:Ana Student"));
    expect(ctx.user?.email).toBe("ana@student.ubc.ca");
    await expect(ctx.getToken()).resolves.toBe("access-token");
  });

  it("signs the user out (and clears cached data) when the token can't be renewed", async () => {
    auth0.client.isAuthenticated.mockResolvedValue(true);
    auth0.client.getTokenSilently.mockRejectedValue(Object.assign(new Error("Login required"), { error: "login_required" }));
    const onSignedOut = vi.fn();
    render(<AuthProvider onSignedOut={onSignedOut}><Probe /></AuthProvider>);
    await waitFor(() => expect(status()).toBe("signedIn:Ana Student"));
    await act(async () => { await expect(ctx.getToken()).rejects.toThrow("Login required"); });
    expect(status()).toBe("signedOut:");
    expect(onSignedOut).toHaveBeenCalled();
  });

  it("opens Auth0's hosted sign-up page for Create Account", async () => {
    auth0.client.isAuthenticated.mockResolvedValue(false);
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(status()).toBe("signedOut:"));
    await act(() => ctx.login({ signup: true }));
    expect(auth0.client.loginWithRedirect).toHaveBeenCalledWith({ authorizationParams: { screen_hint: "signup" } });
    await act(() => ctx.login());
    expect(auth0.client.loginWithRedirect).toHaveBeenLastCalledWith({ authorizationParams: {} });
  });

  it("logs out through Auth0 back to this site", async () => {
    auth0.client.isAuthenticated.mockResolvedValue(true);
    const onSignedOut = vi.fn();
    render(<AuthProvider onSignedOut={onSignedOut}><Probe /></AuthProvider>);
    await waitFor(() => expect(status()).toBe("signedIn:Ana Student"));
    await act(() => ctx.logout());
    expect(onSignedOut).toHaveBeenCalled();
    expect(auth0.client.logout).toHaveBeenCalledWith({ logoutParams: { returnTo: window.location.origin } });
  });

  it("surfaces an Auth0 error on the callback page instead of signing in", async () => {
    window.history.replaceState(null, "", "/callback?error=access_denied&error_description=User%20cancelled");
    try {
      render(<AuthProvider><Probe /></AuthProvider>);
      let outcome: unknown;
      await act(async () => { outcome = await ctx.handleCallback().catch((e: unknown) => e); });
      expect((outcome as Error).message).toBe("User cancelled");
      expect(status()).toBe("signedOut:");
      expect(auth0.client.handleRedirectCallback).not.toHaveBeenCalled();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("completes the code exchange on /callback", async () => {
    window.history.replaceState(null, "", "/callback?code=abc&state=xyz");
    try {
      auth0.client.handleRedirectCallback.mockResolvedValue({});
      auth0.client.isAuthenticated.mockResolvedValue(true);
      render(<AuthProvider><Probe /></AuthProvider>);
      let to: unknown;
      await act(async () => { to = await ctx.handleCallback(); });
      expect(to).toBe("/home");
      expect(auth0.client.handleRedirectCallback).toHaveBeenCalledTimes(1);
      expect(status()).toBe("signedIn:Ana Student");
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
});
