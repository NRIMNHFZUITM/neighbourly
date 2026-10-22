import { useEffect, useState } from "react";

/**
 * The current time, refreshed every `intervalMs`. Components read it instead of calling
 * Date.now() during render, so renders stay pure and "now"-based labels keep up.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
