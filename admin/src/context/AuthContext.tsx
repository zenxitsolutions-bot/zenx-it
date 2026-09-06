import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    authService
      .getCurrentProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const p = await authService.signIn(email, password);
    setProfile(p);
  };

  const signOut = async () => {
    await authService.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, updateProfile: setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
