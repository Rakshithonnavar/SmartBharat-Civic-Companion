import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminApi, ADMIN_TOKEN_KEY } from "@/lib/adminApi";

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  // Starts true whenever a token is already on disk — we don't know
  // yet whether it's still valid, so ProtectedRoute must wait for this
  // to resolve rather than assuming "no admin state yet" means "log in".
  const [loading, setLoading] = useState(() => !!localStorage.getItem(ADMIN_TOKEN_KEY));

  useEffect(() => {
    let cancelled = false;
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return undefined;
    }
    (async () => {
      try {
        const me = await adminApi.me();
        if (!cancelled) setAdmin(me);
      } catch {
        // Token invalid/expired — the adminApi response interceptor
        // already cleared it from localStorage.
        if (!cancelled) setAdmin(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await adminApi.login(email, password); // throws on failure — caller handles the error
    localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
    setAdmin(data.admin);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdmin(null);
  }, []);

  const value = {
    admin,
    loading,
    isAuthenticated: !!admin,
    login,
    logout,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
};
