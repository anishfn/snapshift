import { PageError, readPage } from "@/lib/page";

// A web page as text, for adding to a chat.

export async function POST(request: Request) {
  const { url } = (await request.json()) as { url: string };
  try {
    return Response.json(await readPage(url ?? "", request.signal));
  } catch (e) {
    return Response.json({ error: e instanceof PageError ? e.message : "Couldn't read that page." }, { status: 400 });
  }
}
