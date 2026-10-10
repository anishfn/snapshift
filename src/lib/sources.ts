// What can be brought into a chat from outside it, and what fits. Shared by the server (which fetches) and the
// dialog (which shows the numbers before anything is added).

/** One file in a repository's listing: its path and its size in bytes. */
export type RepoFile = { path: string; size: number };

export type RepoListing = {
  owner: string;
  repo: string;
  ref: string;
  /** The folder the link pointed into, if it did. */
  path: string;
  description: string;
  stars: number;
  /** The files this chat can read: text and code, small enough, not generated. */
  files: RepoFile[];
  /** Files left out: binaries, lockfiles, build output, anything too big. */
  skipped: number;
  /** GitHub cut the listing short (a very large repository). */
  truncated: boolean;
};

export type PageResult = { url: string; title: string; text: string };

/** Snap ranks at most this many files in one choice. */
export const MAX_FILES = 250;
/** Code runs about three characters a token (measured: this app's source, 412k characters, 137k tokens). */
export const CHARS_PER_TOKEN = 3;
export const tokensOf = (chars: number) => Math.round(chars / CHARS_PER_TOKEN);
