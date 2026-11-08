import { useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";

export function SessionGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  const { isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/", replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}