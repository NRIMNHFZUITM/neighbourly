/** One retrievable section of a knowledge-base Markdown file (split at "## " headings). */
export interface KbChunk {
  id: string;
  docId: string;
  title: string;
  heading: string;
  /** App page this answer relates to, used for "open the page" links. */
  path: string;
  pathLabel: string;
  /** Section keywords (strong signal), from a `<!-- keywords: ... -->` line under the heading. */
  keywords: string[];
  /** File-level keywords from the front matter (weak signal, shared by every section). */
  docKeywords: string[];
  text: string;
}

export interface KnowledgeBase {
  /** Content hash of the source Markdown, so rebuilds only change the file when content changes. */
  version: string;
  chunks: KbChunk[];
}
