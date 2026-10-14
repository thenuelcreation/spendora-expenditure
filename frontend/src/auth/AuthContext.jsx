import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./context";
import { ApiError, apiGet, apiPatch, apiPost } from "../services/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    apiGet("/auth/me")
      .then(({ user: currentUser }) => {
        if (mounted) setUser(currentUser);
      })
      .catch((requestError) => {
        if (mounted && !(requestError instanceof ApiError && requestError.status === 401)) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const userId = user?.id;
  const appearance = user?.appearance;
  useEffect(() => {
    if (!userId || appearance === "System") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = appearance.toLowerCase();
    }
  }, [userId, appearance]);

  const value = useMemo(() => ({
    user,
    loading,
    error,
    async login(credentials) {
      const result = await apiPost("/auth/login", credentials);
      setUser(result.user);
      setError("");
      return result.user;
    },
    async signup(details) {
      const result = await apiPost("/auth/signup", details);
      setUser(result.user);
      setError("");
      return result.user;
    },
    async logout() {
      await apiPost("/auth/logout", {});
      setUser(null);
    },
    async updateProfile(profile) {
      const result = await apiPatch("/users/me", profile);
      setUser(result.user);
      return result.user;
    },
    async updatePreferences(preferences) {
      const result = await apiPatch("/users/me/preferences", preferences);
      setUser(result.user);
      return result.user;
    },
    async changePassword(passwords) {
      return apiPatch("/users/me/password", passwords);
    },
  }), [user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
