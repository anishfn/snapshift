import "server-only";
import type { RepoFile, RepoListing } from "./sources";

// Reading a public GitHub repository: one call for the repository, one for its whole tree, then the chosen files
// straight from raw.githubusercontent.com. No clone, no archive. GITHUB_TOKEN in .env.local is optional: it raises
// GitHub's limit of 60 listings an hour and lets the listing see private repositories.

const API = "https://api.github.com";

export class GithubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const headers = () => ({
  Accept: "application/vnd.github+json",
  "User-Agent": "snap-chat",
  ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
});

/** "owner/repo", a github.com link, or a link into a branch or folder. */
export function parseRepo(input: string) {
  const clean = input
    .trim()
    .replace(/^git@github\.com:/, "")
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//, "")
    .replace(/[?#].*$/, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const [owner, repo, kind, ref, ...rest] = clean.split("/");
  const ok = /^[\w.-]+$/;
  if (!owner || !repo || !ok.test(owner) || !ok.test(repo)) return null;
  const deep = kind === "tree" || kind === "blob";
  return { owner, repo, ref: deep && ref ? ref : undefined, path: deep ? rest.join("/") : "" };
}

const TEXT = new Set(
  "ts tsx js jsx mjs cjs json jsonc md mdx txt rst css scss sass less html htm vue svelte astro py rb go rs java kt kts swift c h cc cpp hpp cs php sh bash zsh fish ps1 yml yaml toml ini cfg conf env sql graphql gql prisma proto tf lua dart ex exs erl hs ml scala clj r jl zig nim sol gradle cmake xml".split(
    " ",
  ),
);
const NAMES = new Set(["dockerfile", "makefile", "readme", "justfile", "procfile", "gemfile", "rakefile", "cmakelists.txt"]);
const SKIP_DIR = /(^|\/)(node_modules|\.git|dist|build|out|\.next|\.nuxt|\.turbo|vendor|coverage|__snapshots__|\.yarn|target|\.venv|venv|__pycache__|\.idea|\.vscode|bower_components|Pods)(\/|$)/;
const SKIP_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|composer\.lock|Gemfile\.lock|go\.sum|uv\.lock)$|\.(min\.(js|css)|map|snap|lock)$/;
/** A single file bigger than this is almost always data or generated. */
const MAX_FILE_BYTES = 150_000;

function readable(f: RepoFile) {
  if (f.size === 0 || f.size > MAX_FILE_BYTES || SKIP_DIR.test(f.path) || SKIP_FILE.test(f.path)) return false;
  const name = f.path.split("/").pop()!.toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop()! : "";
  return ext ? TEXT.has(ext) : NAMES.has(name);
}

async function api<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(API + path, { headers: headers(), signal });
  if (res.ok) return res.json() as Promise<T>;
  if (res.status === 404) throw new GithubError("Couldn't find that repository. Check the name; a private one needs GITHUB_TOKEN in .env.local.", 404);
  if (res.status === 403 || res.status === 429) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const mins = reset ? Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 60000)) : 0;
    throw new GithubError(`GitHub's hourly limit is used up${mins ? `. Try again in ${mins} min` : ""}, or add GITHUB_TOKEN to .env.local.`, 429);
  }
  if (res.status === 409) throw new GithubError("That repository is empty.", 409);
  throw new GithubError(`GitHub returned ${res.status}.`, res.status);
}

export async function listRepo(input: string, signal?: AbortSignal): Promise<RepoListing> {
  const parsed = parseRepo(input);
  if (!parsed) throw new GithubError("That doesn't look like a repository. Try owner/name, or paste a github.com link.", 400);
  const { owner, repo } = parsed;
  const info = await api<{ default_branch: string; description: string | null; stargazers_count: number; full_name: string }>(`/repos/${owner}/${repo}`, signal);
  const ref = parsed.ref ?? info.default_branch;
  const tree = await api<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    signal,
  );
  const prefix = parsed.path ? `${parsed.path}/` : "";
  const blobs = tree.tree.filter((t) => t.type === "blob" && (!prefix || t.path.startsWith(prefix) || t.path === parsed.path)).map((t) => ({ path: t.path, size: t.size ?? 0 }));
  const files = blobs.filter(readable);
  const [realOwner, realRepo] = info.full_name.split("/");
  return {
    owner: realOwner,
    repo: realRepo,
    ref,
    path: parsed.path,
    description: info.description ?? "",
    stars: info.stargazers_count,
    files,
    skipped: blobs.length - files.length,
    truncated: tree.truncated,
  };
}

/** The text of the chosen files. One that can't be read (gone, binary after all) is simply left out. */
export async function fetchFiles(input: { owner: string; repo: string; ref: string; paths: string[] }, signal?: AbortSignal) {
  const ok = /^[\w.-]+$/;
  if (!ok.test(input.owner) || !ok.test(input.repo)) throw new GithubError("That doesn't look like a repository.", 400);
  const base = `https://raw.githubusercontent.com/${input.owner}/${input.repo}/${encodeURIComponent(input.ref)}/`;
  const got = await Promise.all(
    input.paths.slice(0, 60).map(async (path) => {
      try {
        const res = await fetch(base + path.split("/").map(encodeURIComponent).join("/"), {
          headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : undefined,
          signal,
        });
        if (!res.ok) return null;
        const text = await res.text();
        return text.includes("\u0000") ? null : { path, text };
      } catch {
        return null;
      }
    }),
  );
  return got.filter((f): f is { path: string; text: string } => !!f);
}
