import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (theme === "dark" || (theme === "system" && prefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme) || "system";
    setTheme(stored);
  }, []);

  const select = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  };

  const btnClass = (t: Theme) =>
    `p-1.5 rounded hover:cursor-pointer transition-colors ${
      theme === t
        ? "bg-gray-200 dark:bg-white/15 text-foreground"
        : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-white/10"
    }`;

  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-1">
      <button
        className={btnClass("light")}
        onClick={() => select("light")}
        aria-label="Light mode"
        title="Light"
      >
        <SunIcon size={15} />
      </button>
      <button
        className={btnClass("system")}
        onClick={() => select("system")}
        aria-label="System theme"
        title="System"
      >
        <MonitorIcon size={15} />
      </button>
      <button
        className={btnClass("dark")}
        onClick={() => select("dark")}
        aria-label="Dark mode"
        title="Dark"
      >
        <MoonIcon size={15} />
      </button>
    </div>
  );
}
