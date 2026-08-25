import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "Events — ChurchFlow" },
      { name: "description", content: "Plan services, programmes and events." },
      { property: "og:title", content: "Events — ChurchFlow" },
      { property: "og:description", content: "Plan services, programmes and events." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Events" description="Plan services, programmes and events." icon={CalendarDays} />;
}
