import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";

function Onboarding() {
  return (
    <div className="w-full min-h-screen flex flex-row">
      <div className="w-1/2 flex flex-col justify-center h-screen px-8 tracking-tighter bg-gray-100">
        <h1 className="text-7xl font-bold">Welcome</h1>
        <h1 className="text-7xl font-bold">To</h1>
        <h1 className="text-7xl font-bold">Beaver!</h1>
      </div>
      <div className="w-1/2 flex justify-center items-center h-screen">
        <Card className="w-1/2 p-4">
          <h2 className="text-3xl">Create your first project</h2>
          <div className="mt-4 space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              type="text"
              placeholder="beaver"
              className="w-full"
            />
          </div>
          <div className="mt-4 w-full flex justify-end">
            <Button>Create</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Onboarding;
