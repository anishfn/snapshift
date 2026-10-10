// Does Snap itself read the screenshots in the Support desk demo? The same two questions, three times with the
// pictures and three times without. Measured: with them, Technical 98% and "charged twice" 98%; without them,
// Technical 50% against Billing 43%, and "charged twice" 3%.
// Run from the project root: node scripts/support-vision.mjs
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const dir = "public/demo/support/";
const read = (n) => readFileSync(dir + n, "utf8");
const img = (n) => ({ mediaType: "image/webp", base64: readFileSync(dir + n).toString("base64") });
const state = {
  documents: [{ name: "tickets.csv", text: read("tickets.csv") }, { name: "refund-policy.md", text: read("refund-policy.md") }, { name: "routing-guide.md", text: read("routing-guide.md") }],
  attached_images: "Image 1 is the screenshot attached to ticket T-1034. Image 2 is the screenshot attached to ticket T-1031.",
};
const questions = {
  team_1034: { type: "choice", instructions: "Following routing-guide.md, which team should ticket T-1034 go to?", criteria: { account_security: "Account security", billing: "Billing", technical: "Technical", sales: "Sales", trust_and_safety: "Trust and safety", product_feedback: "Product feedback" } },
  duplicate_1031: { type: "noul", instructions: "Is it confirmed that the customer of ticket T-1031 was charged twice, with two identical charges on the same day?", criteria: { true: "Two identical charges on the same day are confirmed", false: "Not confirmed by anything available" } },
};
const call = async (images) => {
  const t = performance.now();
  const r = await fetch("https://api.subq.ai/v1/systemone", { method: "POST", headers: { Authorization: `Bearer ${env.SUBQ_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "subq-snap-preview", state: images.length ? state : { ...state, attached_images: "No images attached." }, questions, images }) });
  const j = await r.json();
  if (!j.answers) return console.log(r.status, JSON.stringify(j).slice(0, 300));
  const a = j.answers;
  const p = a.team_1034.probabilities;
  console.log(images.length ? "with the screenshots   " : "without the screenshots", `${Math.round(performance.now() - t)}ms`, `${j.usage.input_tokens} tokens`, "| T-1034 ->", a.team_1034.choice, Object.entries(p).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(", "), "| duplicate confirmed:", `${Math.round(a.duplicate_1031.noul * 100)}%`);
};
for (let i = 0; i < 3; i++) { await call([img("checkout-error.webp"), img("bank-statement.webp")]); await call([]); }
