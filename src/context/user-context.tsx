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
  canCreateProjects: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface UserContextType extends AuthState {
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  setAuth: (user: User) => void;
}

const UserContext = createContext<UserContextType | null>(null);

const TOKEN_STORAGE_KEY = "beaver_tokens";

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored).user ?? null;
  } catch {
    return null;
  }
}

function storeUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ user }));
}

function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const setAuth = useCallback((user: User) => {
    storeUser(user);
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const signIn = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setAuth(data.user);
        return true;
      } catch {
        return false;
      }
    },
    [setAuth],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      // Ignore errors during sign out
    } finally {
      clearStoredUser();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    const validateSession = async () => {
      // If the middleware let this page through, the session cookie is valid.
      // Restore user identity from localStorage to avoid any network call.
      const stored = getStoredUser();
      if (stored) {
        setAuth(stored);
        return;
      }

      // Fresh tab: localStorage is empty. Ask the server who we are using the
      // httpOnly cookie — read-only, no session rotation.
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setAuth(data.user);
      } else {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };

    validateSession();
  }, [setAuth]);

  return (
    <UserContext.Provider value={{ ...state, signIn, signOut, setAuth }}>
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
