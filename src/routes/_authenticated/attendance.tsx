import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — ChurchFlow" },
      { name: "description", content: "Record service and group attendance." },
      { property: "og:title", content: "Attendance — ChurchFlow" },
      { property: "og:description", content: "Record service and group attendance." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Attendance" description="Record service and group attendance." icon={CalendarCheck} />;
}
