import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authService } from "../services/auth";
import type { Profile } from "../types/domain";

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Lets a mutation that returns the updated profile (e.g. PATCH /auth/me) keep this context in
  // sync without a reload — same convention as wellness-app's own useAuth().updateUser.
  updateProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  useEffect(() => {
    const expected = generation.current;
    let active = true;
    authService
      .getCurrentProfile()
      .then((value) => { if (active && generation.current === expected) setProfile(value); })
      .finally(() => { if (active && generation.current === expected) setLoading(false); });
    return () => { active = false; };
  }, []);

  const signIn = async (email: string, password: string) => {
    const expected = ++generation.current;
    setProfile(null);
    setLoading(false);
    const p = await authService.signIn(email, password);
    if (generation.current !== expected) throw new Error("Sign-in cancelled");
    setProfile(p);
  };

  const signOut = async () => {
    generation.current += 1;
    setProfile(null);
    setLoading(false);
    await authService.signOut();
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, updateProfile: (updated) => setProfile((current) => current?.id === updated.id ? updated : current) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
