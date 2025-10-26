import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

function Onboarding() {
  return (
    <div className="w-full min-h-screen flex flex-row justify-center items-center">
      <div className="w-1/2 h-full px-8 tracking-tighter">
        <h1 className="text-7xl font-bold">Welcome</h1>
        <h1 className="text-7xl font-bold">To</h1>
        <h1 className="text-7xl font-bold">Beaver!</h1>
      </div>
      <div className="w-1/2 h-full">
        <div className="w-1/2">
          <h2 className="text-3xl">Create your first project</h2>
          <div className="mt-4 space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              type="text"
              placeholder="beaver"
              className="w-1/2"
            />
          </div>
          <div className="mt-4 w-full bg-blue-100">
            <Button>Create</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
