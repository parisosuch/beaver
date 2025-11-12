import type { Project } from "@/lib/beaver/project";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { useState } from "react";

export default function APIKey({ project }: { project: Project }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      setCopied(false);
      navigator.clipboard.writeText(project.apiKey);
      setCopied(true);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="border px-1 rounded flex items-center justify-center">
      <p className="font-mono tracking-wider">{project.apiKey}</p>
      <button onClick={handleCopy} className="hover:cursor-pointer">
        {copied ? (
          <ClipboardCheck
            color="gray"
            className="bg-gray-200 rounded p-0.5 m-1"
          />
        ) : (
          <Clipboard color="gray" className="bg-gray-200 rounded p-0.5 m-1" />
        )}
      </button>
    </div>
  );
}
