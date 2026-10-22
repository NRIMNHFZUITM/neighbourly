/** Server-Sent Events helpers shared by the API (writing and reading OpenRouter) and the web app. */

export function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export interface SseMessage {
  event: string;
  data: string;
}

/** Incremental SSE parser that copes with events split across network chunks. */
export function createSseParser(onMessage: (message: SseMessage) => void) {
  let buffer = "";
  let eventName = "";
  let dataLines: string[] = [];

  const processLine = (line: string) => {
    if (line === "") {
      if (dataLines.length) onMessage({ event: eventName || "message", data: dataLines.join("\n") });
      eventName = "";
      dataLines = [];
      return;
    }
    if (line.startsWith(":")) return; // comment / keep-alive
    const idx = line.indexOf(":");
    const field = idx === -1 ? line : line.slice(0, idx);
    let value = idx === -1 ? "" : line.slice(idx + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventName = value;
    else if (field === "data") dataLines.push(value);
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      let start = 0;
      for (let i = 0; i < buffer.length; i++) {
        const ch = buffer[i];
        if (ch !== "\n" && ch !== "\r") continue;
        if (ch === "\r" && i + 1 === buffer.length) break; // might be the first half of \r\n
        processLine(buffer.slice(start, i));
        if (ch === "\r" && buffer[i + 1] === "\n") i++;
        start = i + 1;
      }
      buffer = buffer.slice(start);
    },
    flush() {
      if (buffer) processLine(buffer.replace(/\r$/, ""));
      buffer = "";
      processLine("");
    },
  };
}

/**
 * Removes a marker token from a text stream, holding back any trailing characters that
 * might be the start of the marker until the next chunk shows otherwise.
 */
export function createMarkerFilter(marker: string) {
  let pending = "";
  let found = false;
  return {
    push(text: string): string {
      pending += text;
      const idx = pending.indexOf(marker);
      if (idx !== -1) {
        found = true;
        pending = pending.slice(0, idx) + pending.slice(idx + marker.length);
      }
      let hold = 0;
      for (let k = Math.min(marker.length - 1, pending.length); k > 0; k--) {
        if (marker.startsWith(pending.slice(-k))) {
          hold = k;
          break;
        }
      }
      const out = pending.slice(0, pending.length - hold);
      pending = pending.slice(pending.length - hold);
      return out;
    },
    flush(): string {
      const out = pending;
      pending = "";
      return out;
    },
    get found() {
      return found;
    },
  };
}
