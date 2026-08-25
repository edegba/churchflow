import { createFileRoute } from "@tanstack/react-router";
import { Network } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
      { title: "Groups — ChurchFlow" },
      { name: "description", content: "Cells, home groups and small groups." },
      { property: "og:title", content: "Groups — ChurchFlow" },
      { property: "og:description", content: "Cells, home groups and small groups." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Groups" description="Cells, home groups and small groups." icon={Network} />;
}
