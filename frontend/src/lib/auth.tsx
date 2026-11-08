import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Auth0Client } from "@auth0/auth0-spa-js";
import { AUTH0, AUTH_MODE } from "./config";

// Real sign-in goes through Auth0 Universal Login: this app never sees or stores passwords.
// The backend verifies the Auth0 access token on every request and uses its `sub` as the user id.

export type AuthStatus = "loading" | "signedOut" | "signedIn";
export interface AuthUser {
  name: string;
  email?: string;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  mode: "auth0" | "dev";
  /** Auth0: redirects to the hosted login (or sign-up) page. Dev: signs in as `devName`. */
  login(options?: { signup?: boolean; devName?: string }): Promise<void>;
  logout(): Promise<void>;
  /** Access token for the backend. Throws if the session has expired. */
  getToken(): Promise<string>;
  /** Finishes the Auth0 redirect on /callback. Resolves with the path to continue to. */
  handleCallback(): Promise<string>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}

const DEV_USER_KEY = "sidequest_dev_user";
export const CALLBACK_PATH = "/callback";
const DEV_NAME = /^[A-Za-z0-9_.@-]{1,64}$/;

let clientPromise: Promise<Auth0Client> | null = null;
function getAuth0Client(): Promise<Auth0Client> {
  // Loaded lazily so the SDK only ever runs in the browser, never during server rendering.
  clientPromise ??= import("@auth0/auth0-spa-js").then(({ createAuth0Client }) =>
    createAuth0Client({
      domain: AUTH0.domain,
      clientId: AUTH0.clientId,
      authorizationParams: {
        audience: AUTH0.audience,
        redirect_uri: `${window.location.origin}${CALLBACK_PATH}`,
      },
      // Keeps users signed in across reloads even when the browser blocks third-party cookies.
      cacheLocation: "localstorage",
      useRefreshTokens: true,
      useRefreshTokensFallback: true,
    }),
  );
  return clientPromise;
}

let callbackPromise: Promise<string> | null = null;

function readDevUser(): string | null {
  try {
    return localStorage.getItem(DEV_USER_KEY);
  } catch {
    return null;
  }
}

function describe(error: unknown): string {
  if (error && typeof error === "object" && "error_description" in error) {
    return String((error as { error_description: unknown }).error_description);
  }
  return error instanceof Error ? error.message : "Sign-in failed. Please try again.";
}

export function AuthProvider({ children, onSignedOut }: { children: ReactNode; onSignedOut?: () => void }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signedOut = useCallback(() => {
    setUser(null);
    setStatus("signedOut");
    onSignedOut?.();
  }, [onSignedOut]);

  const loadAuth0User = useCallback(async (client: Auth0Client) => {
    const profile = await client.getUser();
    setUser({
      name: profile?.name || profile?.nickname || profile?.email || "Student",
      ...(profile?.email ? { email: profile.email } : {}),
    });
    setStatus("signedIn");
  }, []);

  useEffect(() => {
    if (AUTH_MODE === "dev") {
      const name = readDevUser();
      if (name) {
        setUser({ name });
        setStatus("signedIn");
      } else setStatus("signedOut");
      return;
    }
    // The /callback page finishes the redirect itself (see handleCallback).
    if (window.location.pathname === CALLBACK_PATH) return;
    let cancelled = false;
    getAuth0Client()
      .then(async (client) => {
        const authenticated = await client.isAuthenticated();
        if (cancelled) return;
        if (authenticated) await loadAuth0User(client);
        else setStatus("signedOut");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(describe(err));
        setStatus("signedOut");
      });
    return () => {
      cancelled = true;
    };
  }, [loadAuth0User]);

  const login = useCallback<AuthContextValue["login"]>(async (options = {}) => {
    setError(null);
    if (AUTH_MODE === "dev") {
      const name = (options.devName ?? "").trim();
      if (!DEV_NAME.test(name)) {
        setError("Use letters, numbers, dots, dashes or underscores (dev mode).");
        return;
      }
      try {
        localStorage.setItem(DEV_USER_KEY, name);
      } catch {
        /* still signed in for this tab */
      }
      setUser({ name });
      setStatus("signedIn");
      return;
    }
    try {
      const client = await getAuth0Client();
      await client.loginWithRedirect({
        authorizationParams: options.signup ? { screen_hint: "signup" } : {},
      });
    } catch (err) {
      setError(describe(err));
    }
  }, []);

  const logout = useCallback(async () => {
    if (AUTH_MODE === "dev") {
      try {
        localStorage.removeItem(DEV_USER_KEY);
      } catch {
        /* ignore */
      }
      signedOut();
      return;
    }
    onSignedOut?.();
    const client = await getAuth0Client();
    await client.logout({ logoutParams: { returnTo: window.location.origin } });
  }, [onSignedOut, signedOut]);

  const getToken = useCallback(async (): Promise<string> => {
    if (AUTH_MODE === "dev") {
      const name = readDevUser() ?? user?.name;
      if (!name) throw new Error("Not signed in");
      return `dev:${name}`;
    }
    const client = await getAuth0Client();
    try {
      const token = await client.getTokenSilently();
      if (!token) throw new Error("No access token");
      return token;
    } catch (err) {
      // Session expired or revoked: send the user back to the sign-in page.
      signedOut();
      throw err;
    }
  }, [signedOut, user]);

  const handleCallback = useCallback(async () => {
    if (AUTH_MODE === "dev") return "/home";
    // Guard against running twice (React strict mode): the code can only be exchanged once.
    const pending = (callbackPromise ??= (async () => {
      const client = await getAuth0Client();
      const params = new URLSearchParams(window.location.search);
      if (params.has("error")) {
        throw new Error(params.get("error_description") || params.get("error") || "Sign-in was cancelled.");
      }
      if (params.has("code") && params.has("state")) await client.handleRedirectCallback();
      if (!(await client.isAuthenticated())) throw new Error("Sign-in did not complete. Please try again.");
      await loadAuth0User(client);
      return "/home";
    })());
    try {
      return await pending;
    } catch (err) {
      callbackPromise = null;
      setError(describe(err));
      setStatus("signedOut");
      throw err;
    }
  }, [loadAuth0User]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, error, mode: AUTH_MODE, login, logout, getToken, handleCallback }),
    [status, user, error, login, logout, getToken, handleCallback],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
