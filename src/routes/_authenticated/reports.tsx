import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — ChurchFlow" },
      { name: "description", content: "Insights across your church." },
      { property: "og:title", content: "Reports — ChurchFlow" },
      { property: "og:description", content: "Insights across your church." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Reports" description="Insights across your church." icon={BarChart3} />;
}
