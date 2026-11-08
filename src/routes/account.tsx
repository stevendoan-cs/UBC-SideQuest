
import { createFileRoute } from "@tanstack/react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { LogOut, UserRound, ShieldCheck } from "lucide-react";
import { PrimaryButton, SubPage } from "@/components/app-shell";
import bg from "@/assets/cartoon-koerner.jpg";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — UBC SideQuest" },
      {
        name: "description",
        content: "Manage your UBC SideQuest account.",
      },
    ],
  }),
  component: Account,
});

function Account() {
  const {
    user,
    logout,
    isAuthenticated,
    getAccessTokenSilently,
  } = useAuth0();

  const testConnection = async () => {
    try {
      const token = await getAccessTokenSilently();

      if (token) {
        alert("Your account is connected to the SideQuest API!");
      }
    } catch (error) {
      console.error("API connection error:", error);
      alert("Could not connect to the SideQuest API. Please try again.");
    }
  };

  return (
    <SubPage
      bg={bg}
      title="Account"
      emoji="👤"
      text="Manage your SideQuest account."
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-white/20 bg-white/10 p-5">
          <div className="mb-3 flex items-center gap-3">
            <UserRound size={24} />
            <h2 className="font-semibold">Your Profile</h2>
          </div>

          <p className="text-sm">
            {user?.name || "SideQuest User"}
          </p>

          <p className="text-sm opacity-70">
            {user?.email || "No email available"}
          </p>

          {user?.email_verified && (
            <p className="mt-2 text-sm text-green-600">
              Email verified
            </p>
          )}
        </div>

        <PrimaryButton
          type="button"
          onClick={testConnection}
          disabled={!isAuthenticated}
          className="gap-3"
        >
          <ShieldCheck size={20} />
          Check API Connection
        </PrimaryButton>

        <PrimaryButton
          type="button"
          onClick={() =>
            logout({
              logoutParams: {
                returnTo: window.location.origin,
              },
            })
          }
          className="gap-3"
        >
          <LogOut size={20} />
          Sign Out
        </PrimaryButton>
      </div>
    </SubPage>
  );
}
