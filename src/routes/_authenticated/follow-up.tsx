import { createFileRoute } from "@tanstack/react-router";
import { PhoneCall } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/follow-up")({
  head: () => ({
    meta: [
      { title: "Follow-Up — ChurchFlow" },
      { name: "description", content: "Assign and track pastoral follow-up." },
      { property: "og:title", content: "Follow-Up — ChurchFlow" },
      { property: "og:description", content: "Assign and track pastoral follow-up." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Follow-Up" description="Assign and track pastoral follow-up." icon={PhoneCall} />;
}
