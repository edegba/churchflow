import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/first-timers")({
  head: () => ({
    meta: [
      { title: "First Timers — ChurchFlow" },
      { name: "description", content: "Capture and welcome new visitors." },
      { property: "og:title", content: "First Timers — ChurchFlow" },
      { property: "og:description", content: "Capture and welcome new visitors." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="First Timers" description="Capture and welcome new visitors." icon={UserPlus} />;
}
