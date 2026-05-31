import { useState } from "react";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";

export default function ApiKeyReveal({ apiKey }: { apiKey: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 bg-white/60 dark:bg-white/10 px-4 py-3 rounded-lg overflow-hidden">
      <code className="font-mono text-amber-900 dark:text-amber-300 text-sm truncate flex-1">
        {revealed ? apiKey : "•".repeat(apiKey.length)}
      </code>
      <button
        onClick={() => setRevealed((r) => !r)}
        className="shrink-0 p-1 rounded hover:bg-amber-100 dark:hover:bg-white/10 text-amber-600 dark:text-amber-400 transition-colors"
        aria-label={revealed ? "Hide API key" : "Reveal API key"}
      >
        {revealed ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
      </button>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1 rounded hover:bg-amber-100 dark:hover:bg-white/10 text-amber-600 dark:text-amber-400 transition-colors"
        aria-label="Copy API key"
      >
        {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
      </button>
    </div>
  );
}
