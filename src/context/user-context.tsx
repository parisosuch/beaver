"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface User {
  id: number;
  userName: string;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface UserContextType extends AuthState {
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
}

const UserContext = createContext<UserContextType | null>(null);

const TOKEN_STORAGE_KEY = "beaver_tokens";

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

function getStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function storeTokens(tokens: StoredTokens): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function clearStoredTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const setAuth = useCallback(
    (user: User, accessToken: string, refreshToken: string) => {
      storeTokens({ user, accessToken, refreshToken });
      setState({
        user,
        accessToken,
        refreshToken,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    []
  );

  const signIn = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!res.ok) {
          return false;
        }

        const data = await res.json();
        setAuth(data.user, data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      }
    },
    [setAuth]
  );

  const signOut = useCallback(async () => {
    try {
      if (state.refreshToken) {
        await fetch("/api/auth/signout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: state.refreshToken }),
        });
      }
    } catch {
      // Ignore errors during sign out
    } finally {
      clearStoredTokens();
      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, [state.refreshToken]);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const stored = getStoredTokens();
    if (!stored?.refreshToken) return false;

    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });

      if (!res.ok) {
        clearStoredTokens();
        return false;
      }

      const data = await res.json();
      setAuth(data.user, data.accessToken, data.refreshToken);
      return true;
    } catch {
      clearStoredTokens();
      return false;
    }
  }, [setAuth]);

  // Validate session on mount
  useEffect(() => {
    const validateSession = async () => {
      const stored = getStoredTokens();

      if (!stored) {
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      // Try to validate/refresh the token
      const success = await refreshAccessToken();

      if (!success) {
        setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    validateSession();
  }, [refreshAccessToken]);

  return (
    <UserContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        setAuth,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useAuth(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useAuth must be used within a UserProvider");
  }
  return context;
}
