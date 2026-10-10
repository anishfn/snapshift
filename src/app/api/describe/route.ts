import { describeImage } from "@/lib/decide";
import { SubqError } from "@/lib/subq";

// Snap's look at an image as it's attached: what kind, light or dark, any text. Shown on the attachment.

export async function POST(request: Request) {
  const body = (await request.json()) as { name: string; note?: string; mediaType: string; base64: string };
  try {
    const tags = await describeImage({ ...body, note: body.note ?? "", signal: request.signal });
    return Response.json(tags);
  } catch (e) {
    const message = e instanceof SubqError ? e.message : "Snap couldn't look at that image.";
    return Response.json({ error: message }, { status: e instanceof SubqError && e.status ? e.status : 500 });
  }
}
