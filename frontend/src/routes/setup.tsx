import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Field, Panel, PrimaryButton, Screen } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { COMFORT_LEVELS, errorMessage, profileQueryKey, useApi, useProfile, type ComfortLevel, type ProfileInput } from "@/lib/api";
import bg from "@/assets/cartoon-rosegarden.jpg";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Your Profile — UBC SideQuest" },
      { name: "description", content: "Tell us your interests so we can match you with another student." },
    ],
  }),
  component: Setup,
});

export const INTEREST_OPTIONS = [
  "music", "food", "coffee", "photography", "art", "nature", "hiking", "books",
  "games", "trivia", "coding", "film", "sports", "dance",
] as const;
export const TIME_OPTIONS = [15, 20, 30, 45, 60, 90, 120] as const;
export const BUDGET_OPTIONS = [0, 5, 10, 20, 50] as const;
const VIBE_LABELS: Record<ComfortLevel, string> = { chill: "Chill", adventure: "Adventure", chaos: "Chaos" };

const chip = (on: boolean) =>
  `pixel-box pixel-press px-3 py-2 text-base font-bold ${on ? "bg-primary text-primary-foreground" : "bg-input text-foreground"}`;

function Setup() {
  const navigate = useNavigate();
  const api = useApi();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const profile = useProfile();
  const existing = profile.data ?? null;

  const [form, setForm] = useState<ProfileInput>({
    displayName: "",
    interests: [],
    comfortLevel: "chill",
    availableMinutes: 30,
    maxBudget: 0,
  });
  const [custom, setCustom] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Prefill once: from the saved profile when editing, otherwise from the Auth0 name.
  useEffect(() => {
    if (loaded || profile.isPending) return;
    if (existing) {
      const { displayName, interests, comfortLevel, availableMinutes, maxBudget } = existing;
      setForm({ displayName, interests, comfortLevel, availableMinutes, maxBudget });
    } else if (user) {
      setForm((f) => ({ ...f, displayName: user.name.includes("@") ? (user.name.split("@")[0] ?? "") : user.name }));
    }
    setLoaded(true);
  }, [loaded, profile.isPending, existing, user]);

  const save = useMutation({
    mutationFn: (input: ProfileInput) => api.saveProfile(input),
    onSuccess: (saved) => {
      queryClient.setQueryData(profileQueryKey, saved);
      void navigate({ to: "/home" });
    },
  });

  const toggle = (interest: string) =>
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(interest) ? f.interests.filter((i) => i !== interest) : [...f.interests, interest].slice(0, 10),
    }));

  function addCustom() {
    const value = custom.trim().toLowerCase().slice(0, 30);
    if (value && !form.interests.includes(value)) toggle(value);
    setCustom("");
  }

  const extras = form.interests.filter((i) => !(INTEREST_OPTIONS as readonly string[]).includes(i));
  const valid = form.displayName.trim().length > 0 && form.interests.length > 0;

  return (
    <Screen bg={bg} requireProfile={false}>
      <h1 className="title-chip text-center text-2xl text-brand">{existing ? "Edit Profile" : "Set Up Your Profile"}</h1>
      <form
        className="mt-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate({ ...form, displayName: form.displayName.trim() });
        }}
      >
        <Panel className="space-y-5">
          <Field label="Display name" value={form.displayName} maxLength={50} required
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />

          <fieldset>
            <legend className="mb-2 text-base font-semibold">Interests <span className="font-normal">(pick 1–10)</span></legend>
            <div className="flex flex-wrap gap-2">
              {[...INTEREST_OPTIONS, ...extras].map((interest) => (
                <button key={interest} type="button" aria-pressed={form.interests.includes(interest)} onClick={() => toggle(interest)} className={chip(form.interests.includes(interest))}>
                  {interest}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input aria-label="Add your own interest" value={custom} maxLength={30} placeholder="Add your own…"
                onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                className="pixel-box h-11 min-w-0 flex-1 bg-input px-3 text-base text-ink outline-none focus:ring-2 focus:ring-ring" />
              <button type="button" onClick={addCustom} className={chip(false)}>Add</button>
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1.5 block text-base font-semibold">Free time for a quest</span>
            <select value={form.availableMinutes} onChange={(e) => setForm((f) => ({ ...f, availableMinutes: Number(e.target.value) }))}
              className="pixel-box h-12 w-full bg-input px-3 text-lg text-ink">
              {TIME_OPTIONS.map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-base font-semibold">Max spend per quest</span>
            <select value={form.maxBudget} onChange={(e) => setForm((f) => ({ ...f, maxBudget: Number(e.target.value) }))}
              className="pixel-box h-12 w-full bg-input px-3 text-lg text-ink">
              {[...new Set([...BUDGET_OPTIONS, form.maxBudget])].sort((a, b) => a - b).map((b) => (
                <option key={b} value={b}>{b === 0 ? "Free only ($0)" : `Up to $${b}`}</option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="mb-2 text-base font-semibold">Vibe</legend>
            <div className="grid grid-cols-3 gap-2">
              {COMFORT_LEVELS.map((level) => (
                <button key={level} type="button" aria-pressed={form.comfortLevel === level}
                  onClick={() => setForm((f) => ({ ...f, comfortLevel: level }))} className={chip(form.comfortLevel === level)}>
                  {VIBE_LABELS[level]}
                </button>
              ))}
            </div>
          </fieldset>

          {save.isError && <p role="alert" className="text-base text-destructive text-pixel-shadow">{errorMessage(save.error)}</p>}
        </Panel>
        <PrimaryButton type="submit" disabled={!valid || save.isPending}>
          {save.isPending ? "Saving…" : existing ? "Save Changes" : "Save & Continue"}
        </PrimaryButton>
      </form>
    </Screen>
  );
}
