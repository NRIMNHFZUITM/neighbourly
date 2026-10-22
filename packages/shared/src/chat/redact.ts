/**
 * Removes personal data from chat messages before they are logged or sent to the model.
 * Covers email addresses, Malaysian IC (MyKad) numbers and Malaysian phone numbers.
 */

const PATTERNS: Array<[RegExp, string]> = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  // MyKad: YYMMDD-PB-###G, with or without dashes
  [/\b\d{6}[-\s]?\d{2}[-\s]?\d{4}\b/g, "[IC number]"],
  // Mobile (01X-XXX XXXX / 01X-XXXX XXXX) and landlines (03-XXXX XXXX), optional +60
  [/(?<!\d)(?:\+?6?0)1\d[-\s]?\d{3,4}[-\s]?\d{4}(?!\d)/g, "[phone]"],
  [/(?<!\d)(?:\+?6?0)[3-9][-\s]?\d{3,4}[-\s]?\d{4}(?!\d)/g, "[phone]"],
];

export interface Redaction {
  text: string;
  count: number;
}

export function redactPII(input: string): Redaction {
  let count = 0;
  let text = input;
  for (const [pattern, replacement] of PATTERNS) {
    text = text.replace(pattern, () => {
      count += 1;
      return replacement;
    });
  }
  return { text, count };
}
