"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardTitle } from "./ui/card";
import { useEffect, useState } from "react";
import type { User } from "@/lib/beaver/user";

const TOKEN_STORAGE_KEY = "beaver_tokens";

interface AuthResponse {
  user: User;
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
    })
  );
}

interface AdminAccountProps {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  confirmPassword: string;
  error: string;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  onNext: () => void;
}

const CreateAdminAccount = ({
  username,
  setUsername,
  password,
  confirmPassword,
  error,
  setPassword,
  setConfirmPassword,
  onNext,
}: AdminAccountProps) => (
  <Card className="w-full md:w-3/4 lg:w-1/2 h-auto md:h-[400px] flex flex-col justify-between p-4">
    <div className="flex flex-1 flex-col h-full justify-center">
      <CardTitle className="text-2xl md:text-3xl">Create admin account</CardTitle>
      <div className="mt-4 space-y-2">
        <Label htmlFor="admin-username">Username</Label>
        <Input
          id="admin-username"
          type="text"
          placeholder="admin"
          className="w-full"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor="admin-password">Password</Label>
        <div>
          <p className="text-sm text-gray-500">
            8 characters long, 1 upper case, 1 lowercase, 1 number, and 1
            special character.
          </p>
        </div>
        <Input
          id="admin-password"
          type="password"
          placeholder="password"
          className="w-full"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        <Input
          id="admin-confirm-password"
          type="password"
          placeholder="confirm password"
          className="w-full"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
          }}
        />
      </div>
      {password !== "" &&
        confirmPassword !== "" &&
        password !== confirmPassword && (
          <p className="mt-2 text-sm text-red-600">Passwords do not match.</p>
        )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
    <div className="mt-4 w-full flex justify-end">
      <Button onClick={onNext} disabled={username === "" || password === ""}>
        Next
      </Button>
    </div>
  </Card>
);

interface ProjectProps {
  projectName: string;
  setProjectName: (value: string) => void;
  onBack: () => void;
  onCreate: () => void;
}

const CreateProject = ({
  projectName,
  setProjectName,
  onBack,
  onCreate,
}: ProjectProps) => (
  <Card className="w-full md:w-3/4 lg:w-1/2 h-auto md:h-[400px] flex flex-col justify-between p-4">
    <div>
      <CardTitle className="text-2xl md:text-3xl">Create your first project</CardTitle>
      <div className="mt-4 space-y-2">
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          type="text"
          placeholder="beaver"
          className="w-full"
          value={projectName}
          onChange={(e) => {
            setProjectName(e.target.value);
          }}
        />
      </div>
    </div>
    <div className="mt-4 w-full flex justify-end space-x-4">
      <Button onClick={onBack} variant="outline">
        Back
      </Button>
      <Button onClick={onCreate}>Let's start logging</Button>
    </div>
  </Card>
);

function OnboardingView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [projectName, setProjectName] = useState("");
  const [onboardingPart, setOnboardingPart] = useState(0);
  const [error, setError] = useState("");

  const handleCreateProject = async (ownerId: number) => {
    setError("");
    const res = await fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName, ownerId }),
    });

    const data = await res.json();

    if (res.status !== 200) {
      throw new Error(data.error);
    }

    window.location.replace("/");
  };

  const getProjects = async () => {
    const res = await fetch("/api/project", {
      method: "GET",
    });
    const data = await res.json();

    if (res.status !== 200) {
      console.error(data.error);
    }

    if (data.length !== 0) {
      window.location.replace("/");
    }
  };

  const handleCreateAdminAccount = async () => {
    setError("");

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.status !== 200) {
      throw new Error(data.error);
    }

    // Store tokens for auto sign-in
    storeTokens(data as AuthResponse);

    return data.user as User;
  };

  const handleSubmit = async () => {
    setError("");

    try {
      const user = await handleCreateAdminAccount();
      await handleCreateProject(user.id);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred.");
      }
    }
  };

  useEffect(() => {
    getProjects();
  }, []);

  return (
    <div className="w-full min-h-screen flex flex-row">
      <div className="hidden md:flex w-1/2 flex-col justify-center h-screen px-8 tracking-tighter bg-gray-100">
        <h1 className="text-5xl md:text-7xl font-bold">Welcome</h1>
        <h1 className="text-5xl md:text-7xl font-bold">To</h1>
        <h1 className="text-5xl md:text-7xl font-bold">Beaver!</h1>
      </div>
      <div className="w-full md:w-1/2 flex justify-center items-center min-h-screen px-4 md:px-0">
        {onboardingPart === 0 && (
          <CreateAdminAccount
            username={username}
            setUsername={setUsername}
            password={password}
            confirmPassword={confirmPassword}
            error={error}
            setConfirmPassword={setConfirmPassword}
            setPassword={setPassword}
            onNext={() => {
              // verify password meets strength criteria
              if (password.length < 8) {
                setError("Password must be at least 8 characters long.");
                return;
              }
              if (!/[A-Z]/.test(password)) {
                setError(
                  "Password must contain at least one uppercase letter."
                );
                return;
              }
              if (!/[a-z]/.test(password)) {
                setError(
                  "Password must contain at least one lowercase letter."
                );
                return;
              }
              if (!/[0-9]/.test(password)) {
                setError("Password must contain at least one number.");
                return;
              }
              if (!/[^A-Za-z0-9]/.test(password)) {
                setError(
                  "Password must contain at least one special character."
                );
                return;
              }
              setOnboardingPart(1);
            }}
          />
        )}
        {onboardingPart === 1 && (
          <CreateProject
            projectName={projectName}
            setProjectName={setProjectName}
            onBack={() => setOnboardingPart(0)}
            onCreate={async () => {
              await handleSubmit();
            }}
          />
        )}
      </div>
    </div>
  );
}

export default OnboardingView;
