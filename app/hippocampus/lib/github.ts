// Minimal GitHub REST client for the Hippocampus study app.
//
// Runs entirely in the browser against api.github.com (CORS-enabled), authenticated with a
// fine-grained personal access token the user pastes in. No server, no OAuth broker — the token
// lives only in sessionStorage (see ../hippocampus-app.tsx) and is sent as a Bearer header.
//
// The host owns all I/O; the pure SRS logic lives in ../core. This file only fetches, parses base64,
// and commits — it knows nothing about decks or scheduling.

const API = "https://api.github.com";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

export interface Repo {
  full_name: string; // "owner/name"
  owner: string;
  name: string;
  private: boolean;
  default_branch: string;
  updated_at: string;
}

export interface RepoFile {
  name: string;
  path: string;
  sha: string;
  type: "file" | "dir";
}

export class GitHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GitHubError";
  }
}

/** Decode a base64 (possibly newline-wrapped) string returned by the Contents API into UTF-8 text. */
export function b64ToUtf8(b64: string): string {
  const clean = b64.replace(/\n/g, "");
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

/** Encode UTF-8 text into base64 for a Contents API write (handles multibyte JP/KR content). */
export function utf8ToB64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function ghFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers
    }
  });
  return res;
}

async function ghJson<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await ghFetch(token, path, init);
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.message ?? "";
    } catch {
      /* ignore */
    }
    throw new GitHubError(detail || `${res.status} ${res.statusText}`, res.status);
  }
  return (await res.json()) as T;
}

/** Verify a token and return the signed-in user. Throws GitHubError(401) on a bad/expired token. */
export function getUser(token: string): Promise<GitHubUser> {
  return ghJson<GitHubUser>(token, "/user");
}

/** List repos the token can see, most-recently-updated first (up to a few pages). */
export async function listRepos(token: string, maxPages = 3): Promise<Repo[]> {
  const repos: Repo[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await ghJson<any[]>(
      token,
      `/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member&page=${page}`
    );
    for (const r of batch) {
      repos.push({
        full_name: r.full_name,
        owner: r.owner?.login ?? r.full_name.split("/")[0],
        name: r.name,
        private: Boolean(r.private),
        default_branch: r.default_branch ?? "main",
        updated_at: r.updated_at
      });
    }
    if (batch.length < 100) break;
  }
  return repos;
}

/** Fetch a single repo's metadata (used when the user types an owner/name directly). */
export async function getRepo(token: string, owner: string, name: string): Promise<Repo> {
  const r = await ghJson<any>(token, `/repos/${owner}/${name}`);
  return {
    full_name: r.full_name,
    owner: r.owner?.login ?? owner,
    name: r.name,
    private: Boolean(r.private),
    default_branch: r.default_branch ?? "main",
    updated_at: r.updated_at
  };
}

/** List a directory's entries. Returns [] if the path is a 404 (missing dir). */
export async function listDir(token: string, owner: string, repo: string, path: string, ref?: string): Promise<RepoFile[]> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const res = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}${q}`);
  if (res.status === 404) return [];
  if (!res.ok) throw new GitHubError(`${res.status} listing ${path}`, res.status);
  const body = await res.json();
  if (!Array.isArray(body)) return []; // a file, not a dir
  return body.map((e: any) => ({ name: e.name, path: e.path, sha: e.sha, type: e.type }));
}

export interface FileContent {
  text: string;
  sha: string;
}

/** Fetch a file's decoded text + blob sha. Returns null if the file is a 404 (absent). */
export async function getFile(token: string, owner: string, repo: string, path: string, ref?: string): Promise<FileContent | null> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const res = await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}${q}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new GitHubError(`${res.status} reading ${path}`, res.status);
  const body = await res.json();
  if (Array.isArray(body) || body.type !== "file") throw new GitHubError(`${path} is not a file`, 400);
  return { text: b64ToUtf8(body.content ?? ""), sha: body.sha };
}

/** Create or update a file. Pass the current blob sha to update; omit for a new file. */
export async function putFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  text: string,
  message: string,
  sha?: string,
  branch?: string
): Promise<{ sha: string }> {
  const body = JSON.stringify({
    message,
    content: utf8ToB64(text),
    ...(sha ? { sha } : {}),
    ...(branch ? { branch } : {})
  });
  const result = await ghJson<any>(token, `/repos/${owner}/${repo}/contents/${path}`, { method: "PUT", body });
  return { sha: result.content?.sha ?? "" };
}
