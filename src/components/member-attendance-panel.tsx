import { CalendarCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  attendanceStatusLabels,
  attendanceStatusTone,
  eventTypeLabels,
  formatEventDate,
  useMemberAttendance,
} from "@/hooks/use-attendance";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs leading-snug text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function MemberAttendancePanel({ memberId }: { memberId: string }) {
  const { data, isLoading } = useMemberAttendance(memberId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const records = data ?? [];

  if (records.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No attendance recorded yet"
        description="Once this member is marked present, absent or excused at a service, the history will appear here."
      />
    );
  }

  const sorted = [...records].sort((a, b) => {
    const da = a.attendance_events?.event_date ?? "";
    const db = b.attendance_events?.event_date ?? "";
    return db.localeCompare(da);
  });

  const attended = sorted.filter((r) => r.attendance_status === "present").length;
  const rate = Math.round((attended / sorted.length) * 100);

  let consecutiveAbsences = 0;
  for (const record of sorted) {
    if (record.attendance_status === "present") break;
    consecutiveAbsences += 1;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Events Attended" value={attended} />
        <Stat label="Events Recorded" value={sorted.length} />
        <Stat label="Attendance Rate" value={`${rate}%`} />
        <Stat label="Consecutive Absences" value={consecutiveAbsences} />
      </div>

      {consecutiveAbsences >= 2 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Missed the last {consecutiveAbsences} recorded gatherings — worth a check-in call.
        </div>
      ) : null}

      <Card>
        <CardContent className="divide-y py-0">
          {sorted.slice(0, 12).map((record) => (
            <div key={record.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                {record.attendance_events ? (
                  <Link
                    to="/attendance/$eventId"
                    params={{ eventId: record.attendance_events.id }}
                    className="truncate font-medium hover:underline"
                  >
                    {record.attendance_events.name}
                  </Link>
                ) : (
                  <p className="truncate font-medium">Event</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {record.attendance_events
                    ? `${eventTypeLabels[record.attendance_events.event_type]} · ${formatEventDate(record.attendance_events.event_date)}`
                    : "—"}
                </p>
                {record.notes ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{record.notes}</p>
                ) : null}
              </div>
              <Badge className={attendanceStatusTone[record.attendance_status]}>
                {attendanceStatusLabels[record.attendance_status]}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
