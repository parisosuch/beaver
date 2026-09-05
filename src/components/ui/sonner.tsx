import { useEffect, useState } from "react";
import { Toaster as SonnerToaster } from "sonner";

type ResolvedTheme = "light" | "dark";

// Sonner's `theme` defaults to "light" and `theme="system"` reads
// prefers-color-scheme directly, which would ignore an explicit choice made in
// ThemeToggle. Beaver resolves the theme by toggling a `dark` class on <html> —
// the inline script in layout.astro does it on first paint and again on
// astro:after-swap, ThemeToggle does it when the user picks one. Reading that
// class is the only place the resolved value exists, and observing it means the
// toaster follows every path that changes it without either side knowing about
// the other.
function useResolvedTheme(): ResolvedTheme {
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const read = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };

    read();

    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}

export function Toaster() {
  const theme = useResolvedTheme();

  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}

export default Toaster;
