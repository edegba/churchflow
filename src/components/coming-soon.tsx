import { Rocket, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";

export function ComingSoon({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <AppShell
      title={title}
      description={description}
      actions={<Badge variant="secondary">Coming soon</Badge>}
    >
      <EmptyState
        icon={icon ?? Rocket}
        title="Coming in the next module"
        description={`${title} is not enabled yet. This module is part of an upcoming ChurchFlow release — no placeholder data is shown here on purpose.`}
        className="py-16"
      />
    </AppShell>
  );
}
