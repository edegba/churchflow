import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({
    meta: [
      { title: "Departments — ChurchFlow" },
      { name: "description", content: "Units, teams and ministry departments." },
      { property: "og:title", content: "Departments — ChurchFlow" },
      { property: "og:description", content: "Units, teams and ministry departments." },
    ],
  }),
  component: Page,
});

function Page() {
  return <ComingSoon title="Departments" description="Units, teams and ministry departments." icon={Building2} />;
}
