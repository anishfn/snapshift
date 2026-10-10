import type { Metadata } from "next";
import { Catalog } from "./catalog";

export const metadata: Metadata = {
  title: "Components · what Snap chooses from",
  description: "Every component SubQ Snap can pick to show an answer, with an example of each.",
};

export default function Page() {
  return <Catalog />;
}
