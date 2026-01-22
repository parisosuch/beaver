"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardTitle } from "./ui/card";
import { useState } from "react";

const TOKEN_STORAGE_KEY = "beaver_tokens";

interface AuthResponse {
  user: {
    id: number;
    userName: string;
    isAdmin: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

function storeTokens(data: AuthResponse): void {
  localStorage.setItem(
    TOKEN_STORAGE_KEY,
    JSON.stringify({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    }),
  );
}

function LoginView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign in failed");
        return;
      }

      storeTokens(data as AuthResponse);
      window.location.replace("/");
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-row items-center justify-center text-center">
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-3xl font-bold">Beaver</h1>
          <p className="text-sm mt-2 text-black/50 font-medium">
            Please sign in to your account.
          </p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="username"
              className="w-full"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="password"
              className="w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="mt-4 w-full flex justify-end">
          <Button
            type="submit"
            disabled={username === "" || password === "" || isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default LoginView;
