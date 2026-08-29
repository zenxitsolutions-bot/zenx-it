import { useEffect, useState } from "react";
import { RotateCcw, DatabaseZap, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { FieldWrap, Select } from "../components/ui/Field";
import { TimezoneSelect } from "../components/shared/TimezoneSelect";
import { isKnownTimezone } from "../lib/timezone";
import { authService } from "../services/auth";
import { isDemoMode } from "../lib/apiClient";
import { demoStore } from "../services/demo/demoStore";

const DATE_FORMATS = [
  { value: "MMM d, yyyy", label: "Sep 15, 2026" },
  { value: "d MMM yyyy", label: "15 Sep 2026" },
  { value: "yyyy-MM-dd", label: "2026-09-15" },
  { value: "MM/dd/yyyy", label: "09/15/2026" },
  { value: "dd/MM/yyyy", label: "15/09/2026" },
];

export default function SettingsPage() {
  const { profile, updateProfile } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [notifyNewEnquiry, setNotifyNewEnquiry] = useState(true);
  const [notifyFollowupDue, setNotifyFollowupDue] = useState(true);

  const [timezone, setTimezone] = useState(profile?.timezone ?? "UTC");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [dateFormat, setDateFormat] = useState(profile?.date_format ?? "MMM d, yyyy");
  const [timeFormat, setTimeFormat] = useState(profile?.time_format ?? "12h");
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setTimezone(profile.timezone ?? "UTC");
    setCountry(profile.country ?? "");
    setDateFormat(profile.date_format ?? "MMM d, yyyy");
    setTimeFormat(profile.time_format ?? "12h");
  }, [profile]);

  const prefsValid = isKnownTimezone(timezone) && (country === "" || /^[A-Za-z]{2}$/.test(country));

  async function savePreferences() {
    setSavingPrefs(true);
    try {
      const updated = await authService.updateMe({
        timezone,
        country: country ? country.toUpperCase() : null,
        date_format: dateFormat,
        time_format: timeFormat as "12h" | "24h",
      });
      updateProfile(updated);
      toast("Preferences saved");
    } catch {
      toast("We couldn't save that — please try again");
    } finally {
      setSavingPrefs(false);
    }
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset demo data?",
      description: "This restores the original seeded enquiries, follow-ups and customers. Any changes you've made in demo mode will be lost.",
      danger: true,
      confirmLabel: "Reset Data",
    });
    if (!ok) return;
    demoStore.resetToSeed();
    toast("Demo data reset");
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-4 font-display text-base text-offwhite">Profile</h3>
        <dl className="flex flex-col gap-3 text-sm">
          <Row label="Name" value={profile ? `${profile.first_name} ${profile.last_name}` : "—"} />
          <Row label="Email" value={profile?.email ?? "—"} />
          <Row label="Role" value={profile?.role ?? "—"} />
        </dl>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-display text-base text-offwhite">Preferences</h3>
        <p className="mb-4 text-xs text-dim">Controls how dates and times show up for you across the portal.</p>
        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="Timezone" htmlFor="pref-timezone">
            <TimezoneSelect id="pref-timezone" value={timezone} onChange={setTimezone} />
          </FieldWrap>
          <FieldWrap label="Country" htmlFor="pref-country" hint="Optional">
            <input
              id="pref-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              placeholder="e.g. US"
              className="w-full rounded-md border border-border bg-ink px-3.5 py-2.5 text-sm uppercase text-offwhite placeholder:text-dim outline-none transition focus:border-lime"
            />
          </FieldWrap>
          <FieldWrap label="Date format" htmlFor="pref-date-format">
            <Select id="pref-date-format" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
              {DATE_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Time format" htmlFor="pref-time-format">
            <Select id="pref-time-format" value={timeFormat} onChange={(e) => setTimeFormat(e.target.value as "12h" | "24h")}>
              <option value="12h">12-hour (2:30 PM)</option>
              <option value="24h">24-hour (14:30)</option>
            </Select>
          </FieldWrap>
        </div>
        <Button size="sm" className="mt-4" onClick={savePreferences} disabled={savingPrefs || !prefsValid}>
          {savingPrefs ? "Saving…" : "Save preferences"}
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-display text-base text-offwhite">Notifications</h3>
        <div className="flex flex-col gap-3">
          <Toggle label="Notify on new enquiries" checked={notifyNewEnquiry} onChange={setNotifyNewEnquiry} />
          <Toggle label="Notify when follow-ups are due" checked={notifyFollowupDue} onChange={setNotifyFollowupDue} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-display text-base text-offwhite">Environment</h3>
        <div className="flex items-center gap-3 rounded-md border border-border p-4">
          <DatabaseZap size={18} className={isDemoMode ? "text-warn" : "text-lime"} />
          <div>
            <p className="text-sm text-offwhite">{isDemoMode ? "Demo mode" : "Connected to ZenX Admin API"}</p>
            <p className="text-xs text-dim">
              {isDemoMode
                ? "Running on seeded local data. Add VITE_ADMIN_API_URL to .env.local to connect the live backend."
                : "Reading and writing live data from the ZenX Admin backend."}
            </p>
          </div>
        </div>
        {isDemoMode && (
          <Button variant="secondary" size="sm" className="mt-4" onClick={handleReset}>
            <RotateCcw size={13} /> Reset demo data
          </Button>
        )}
      </Card>

      <Card className="flex items-start gap-3 p-6">
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-lime" />
        <p className="text-xs text-muted">
          Passwords are never stored in plaintext by this application — only bcrypt hashes ever reach the database.
        </p>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-xs uppercase tracking-wider text-dim">{label}</dt>
      <dd className="text-offwhite">{value}</dd>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-left transition hover:border-borderStrong"
    >
      <span className="text-sm text-offwhite">{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-lime" : "bg-white/10"}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition ${checked ? "left-4" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
