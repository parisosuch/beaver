"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useState } from "react";
import { useAuth, UserProvider } from "@/context/user-context";

function CreateProjectForm() {
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("You must be logged in to create a project.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, ownerId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create project");
        return;
      }

      window.location.href = `/dashboard/${data.id}/feed`;
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-row items-center justify-center text-center px-4 md:px-0">
      <form onSubmit={handleSubmit} className="flex flex-col h-full w-full max-w-sm">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-2xl md:text-3xl font-bold">Create Project</h1>
          <p className="text-sm mt-2 text-black/50 font-medium">
            Create a new project to start tracking events.
          </p>
          <div className="mt-4 space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              type="text"
              placeholder="my-project"
              className="w-full"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex space-x-4 mt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => window.history.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={projectName === "" || isLoading}
          >
            {isLoading ? "Creating..." : "Create project"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CreateProjectView() {
  return (
    <UserProvider>
      <CreateProjectForm />
    </UserProvider>
  );
}

export default CreateProjectView;
