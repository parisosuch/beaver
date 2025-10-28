"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardTitle } from "./ui/card";
import { useState } from "react";

function OnboardingView() {
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");

  const handleCreateProject = async () => {
    setError("");
    const res = await fetch("/api/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: projectName }),
    });

    const data = await res.json();

    if (res.status !== 200) {
      throw new Error(data.error);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-row">
      <div className="w-1/2 flex flex-col justify-center h-screen px-8 tracking-tighter bg-gray-100">
        <h1 className="text-7xl font-bold">Welcome</h1>
        <h1 className="text-7xl font-bold">To</h1>
        <h1 className="text-7xl font-bold">Beaver!</h1>
      </div>
      <div className="w-1/2 flex justify-center items-center h-screen">
        <Card className="w-1/2 p-4">
          <CardTitle className="text-3xl">Create your first project</CardTitle>
          <div className="mt-4 space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              type="text"
              placeholder="beaver"
              className="w-full"
              onChange={(e) => {
                e.preventDefault();
                setProjectName(e.target.value);
              }}
            />
          </div>
          <div className="mt-4 w-full flex justify-end">
            <Button
              onClick={async () => {
                try {
                  await handleCreateProject();
                } catch (e: unknown) {
                  if (e instanceof Error) {
                    setError(e.message);
                  } else {
                    setError("An unknown error occurred.");
                  }
                }
              }}
            >
              Let's start logging
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default OnboardingView;
