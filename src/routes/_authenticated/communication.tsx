import { createFileRoute } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/communication")({
  head: () => ({
    meta: [
      { title: "Communication — ChurchFlow" },
      { name: "description", content: "Reach members across channels." },
      { property: "og:title", content: "Communication — ChurchFlow" },
      { property: "og:description", content: "Reach members across channels." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Communication" description="Reach members across channels." icon={Send} />;
}
