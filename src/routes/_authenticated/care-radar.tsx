import { createFileRoute } from "@tanstack/react-router";
import { Radar } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/care-radar")({
  head: () => ({
    meta: [
      { title: "Care Radar — ChurchFlow" },
      { name: "description", content: "People who may need attention will surface here." },
      { property: "og:title", content: "Care Radar — ChurchFlow" },
      { property: "og:description", content: "People who may need attention will surface here." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Care Radar" description="People who may need attention will surface here." icon={Radar} />;
}
