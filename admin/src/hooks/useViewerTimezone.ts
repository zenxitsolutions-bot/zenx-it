import { useAuth } from "../context/AuthContext";
import { browserTimezone } from "../lib/timezone";

// Mirrors wellness-app's own client/src/hooks/useViewerTimezone.js — the one place every
// "show times in the viewer's zone" screen resolves "what zone am I rendering in" from.
export function useViewerTimezone() {
  const { profile } = useAuth();
  const detected = browserTimezone();
  const hasSavedPreference = Boolean(profile?.timezone && profile.timezone !== "UTC");
  const timezone = hasSavedPreference ? (profile!.timezone as string) : detected;

  return {
    timezone,
    dateFormat: profile?.date_format || "MMM d, yyyy",
    timeFormat: profile?.time_format || "12h",
    source: hasSavedPreference ? ("profile" as const) : ("browser" as const),
    browserTimezone: detected,
    mismatch: hasSavedPreference && detected !== profile!.timezone,
  };
}
