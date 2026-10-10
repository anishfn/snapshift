import { fetchFiles, GithubError } from "@/lib/github";

// The text of a batch of chosen files. The dialog asks in batches, so it can show how far along it is.

export async function POST(request: Request) {
  const body = (await request.json()) as { owner: string; repo: string; ref: string; paths: string[] };
  try {
    return Response.json({ files: await fetchFiles(body, request.signal) });
  } catch (e) {
    const known = e instanceof GithubError;
    return Response.json({ error: known ? e.message : "Couldn't reach GitHub." }, { status: known ? e.status : 502 });
  }
}
