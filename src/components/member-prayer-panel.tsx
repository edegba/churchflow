import { useState } from "react";
import { HandHeart, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  prayerCategoryLabels,
  prayerPriorityLabels,
  prayerPriorityTone,
  prayerStatusLabels,
  prayerStatusTone,
  prayerRequestPermissions,
  useDeletePrayerRequest,
  useMemberPrayerRequests,
  type PrayerRequest,
} from "@/hooks/use-prayer-requests";
import { useMembership } from "@/hooks/use-organization";
import { PrayerRequestDialog } from "@/components/prayer-request-dialog";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MemberPrayerPanel({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const { data: membership } = useMembership();
  const orgId = membership?.organization_id;
  const perms = prayerRequestPermissions(membership?.role);
  const { data: requests, isLoading } = useMemberPrayerRequests(memberId);
  const deleteRequest = useDeletePrayerRequest(orgId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrayerRequest | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PrayerRequest | null>(null);

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteRequest.mutateAsync(pendingDelete.id);
      toast.success("Prayer request removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove this prayer request");
    } finally {
      setPendingDelete(null);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-2 py-6">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <>
        <EmptyState
          icon={HandHeart}
          title="No prayer requests yet"
          description={`Prayer requests for ${memberName} will appear here.`}
          action={
            perms.canManage ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-4" /> Add prayer request
              </Button>
            ) : null
          }
        />
        <PrayerRequestDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          organizationId={orgId}
          prayerRequest={editing}
          presetMemberId={memberId}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {perms.canManage ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" /> Add prayer request
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{r.request_text}</p>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge className={prayerPriorityTone[r.priority]} variant="secondary">
                      {prayerPriorityLabels[r.priority]}
                    </Badge>
                    <Badge className={prayerStatusTone[r.status]} variant="secondary">
                      {prayerStatusLabels[r.status]}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{prayerCategoryLabels[r.category]}</Badge>
                  <span>{formatDate(r.created_at)}</span>
                  {r.is_anonymous ? <span>Anonymous</span> : null}
                  {r.response_notes ? (
                    <span className="truncate">Response: {r.response_notes}</span>
                  ) : null}
                </div>
                {perms.canManage ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(r);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPendingDelete(r)}
                      className="text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <PrayerRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={orgId}
        prayerRequest={editing}
        presetMemberId={memberId}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this prayer request?</AlertDialogTitle>
            <AlertDialogDescription>
              This prayer request will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
