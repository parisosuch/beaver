import { appendFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const logsDir = resolve(process.cwd(), "data", "logs");
mkdirSync(logsDir, { recursive: true });

function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function logPath(): string {
  return resolve(logsDir, `server-${currentDate()}.log`);
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").replace("Z", "").slice(0, 23);
}

function write(line: string): void {
  const out = line + "\n";
  process.stdout.write(out);
  appendFileSync(logPath(), out);
}

export function logRequest(
  method: string,
  pathname: string,
  status: number,
  durationMs: number,
): void {
  write(`[${timestamp()}] ${method} ${pathname} ${status} ${durationMs}ms`);
}

export function logError(
  method: string,
  pathname: string,
  durationMs: number,
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack =
    error instanceof Error && error.stack
      ? "\n" +
        error.stack
          .split("\n")
          .slice(1)
          .map((l) => "  " + l.trim())
          .join("\n")
      : "";
  write(`[${timestamp()}] ERROR ${method} ${pathname} ${durationMs}ms - ${message}${stack}`);
}
