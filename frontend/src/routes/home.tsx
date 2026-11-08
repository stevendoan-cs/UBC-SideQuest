import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Compass, Menu, X } from "lucide-react";
import { Logo, PrimaryButton, Screen, pixelButton } from "@/components/app-shell";
import bg from "@/assets/cartoon-ikb.jpg";
import { CampusIllustration } from "@/components/campus-illustration";
import { useProfile } from "@/lib/api";
import { gameModes, useGameMode, type GameMode } from "@/components/game-mode-provider";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Home — UBC SideQuest" },
      { name: "description", content: "Meet UBC students and go on adventures around campus." },
      { property: "og:title", content: "Home — UBC SideQuest" },
      { property: "og:description", content: "Meet UBC students and go on adventures around campus." },
    ],
  }),
  component: Home,
});

const AVAILABLE_MODES: readonly GameMode[] = ["2player"];

const items = [
  { to: "/chats", label: "Chats", icon: "chats" },
  { to: "/friends", label: "Friends", icon: "friends" },
  { to: "/stats", label: "Stats", icon: "stats" },
  { to: "/account", label: "Account", icon: "account" },
] as const;

function Home() {
  const [open, setOpen] = useState(false);
  const { activeGameMode, setActiveGameMode } = useGameMode();
  const { data: profile } = useProfile();
  // Matchmaking currently pairs two students; other modes are shown as coming soon.
  const mode = AVAILABLE_MODES.includes(activeGameMode) ? activeGameMode : "2player";
  const activeModeLabel = gameModes.find(m => m.value === mode)?.label;
  return (
    <Screen bg={bg}>
      <header className="flex items-center gap-4">
        <PrimaryButton variant="blue" onClick={() => setOpen(true)} aria-label="Open menu" className="!h-12 !w-12 shrink-0 flex-col gap-1">
          <Menu size={26} aria-hidden="true" />
        </PrimaryButton>
        <Logo compact />
      </header>
      {profile && <p className="title-chip mt-4 self-start text-base font-bold">Hi, {profile.displayName}!</p>}

      <div className="flex-1 min-h-32" />
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Game mode">
        {gameModes.map(m => {
          const available = AVAILABLE_MODES.includes(m.value);
          return (
            <PrimaryButton key={m.value} variant="mode" aria-pressed={mode === m.value} disabled={!available}
              onClick={() => setActiveGameMode(m.value)} className="game-mode-button flex-col">
              {m.label}{!available && <span className="text-xs font-semibold">Soon</span>}
            </PrimaryButton>
          );
        })}
      </div>

      <Link to="/queue" className={`mt-8 flex-col gap-1 ${pixelButton("quest", "lg")}`}>
        <span className="flex items-center gap-3"><Compass size={26} aria-hidden="true" /> Find Quest</span>
        <span className="text-sm font-semibold" aria-live="polite">Current Mode: {activeModeLabel}</span>
      </Link>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-overlay animate-in fade-in" onClick={() => setOpen(false)} />
          <nav className="pixel-panel absolute inset-y-0 left-0 w-72 bg-popover p-6 pt-[max(env(safe-area-inset-top),1.5rem)] animate-in slide-in-from-left duration-300">
            <PrimaryButton variant="blue" onClick={() => setOpen(false)} aria-label="Close menu" className="mb-8 !h-11 !w-11"><X size={22} /></PrimaryButton>
            <ul className="space-y-4">
              {items.map(({ to, label, icon }) => (
                <li key={to}>
                  <Link to={to} className={`${pixelButton("blue")} justify-start gap-3 px-4`}>
                    <CampusIllustration kind={icon} size="menu" /> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </Screen>
  );
}
