import { createFileRoute } from "@tanstack/react-router";
import { HandHeart } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/prayer-requests")({
  head: () => ({
    meta: [
      { title: "Prayer Requests — ChurchFlow" },
      { name: "description", content: "Collect and respond to prayer needs." },
      { property: "og:title", content: "Prayer Requests — ChurchFlow" },
      { property: "og:description", content: "Collect and respond to prayer needs." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Prayer Requests" description="Collect and respond to prayer needs." icon={HandHeart} />;
}
