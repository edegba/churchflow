import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — ChurchFlow" },
      { name: "description", content: "Listen to your congregation." },
      { property: "og:title", content: "Feedback — ChurchFlow" },
      { property: "og:description", content: "Listen to your congregation." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Feedback" description="Listen to your congregation." icon={MessageSquare} />;
}
