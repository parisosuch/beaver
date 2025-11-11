import type { Project } from "@/lib/beaver/project";
import { Clipboard } from "lucide-react";

export default function APIKey({ project }: { project: Project }) {
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(project.apiKey);
    } catch (error) {
      console.error(error);
    }
  };

  // TODO: add visual confirmation that the api key was copied to clipboard
  return (
    <div className="border px-1 rounded flex items-center justify-center">
      <p className="font-mono tracking-wider">{project.apiKey}</p>
      <button onClick={handleCopy} className="hover:cursor-pointer">
        <Clipboard color="gray" className="bg-gray-200 rounded p-0.5 m-1" />
      </button>
    </div>
  );
}
