import { GithubError, listRepo } from "@/lib/github";

// What's in a repository: the files this chat can read, with their sizes, before any of them is fetched.

export async function POST(request: Request) {
  const { repo } = (await request.json()) as { repo: string };
  try {
    return Response.json(await listRepo(repo ?? "", request.signal));
  } catch (e) {
    const known = e instanceof GithubError;
    return Response.json({ error: known ? e.message : "Couldn't reach GitHub." }, { status: known ? e.status : 502 });
  }
}
