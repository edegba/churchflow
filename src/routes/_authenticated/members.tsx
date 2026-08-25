import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({
    meta: [
      { title: "Members — ChurchFlow" },
      { name: "description", content: "Your church membership database." },
      { property: "og:title", content: "Members — ChurchFlow" },
      { property: "og:description", content: "Your church membership database." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Members" description="Your church membership database." icon={Users} />;
}
