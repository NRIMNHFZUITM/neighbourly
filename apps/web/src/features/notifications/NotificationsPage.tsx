import { BellOff, CheckCheck } from "lucide-react";
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMarkAllRead, useNotifications } from "./api";
import { NotificationContent, notificationRowClass, useOpenNotification } from "./NotificationBell";

export function NotificationsPage() {
  const { data, isPending, isError, error, refetch } = useNotifications();
  const markAll = useMarkAllRead();
  const open = useOpenNotification();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        description="Updates on your reports, food, bookings and safety alerts."
        actions={
          data?.unread ? (
            <Button variant="outline" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck /> Mark all as read
            </Button>
          ) : null
        }
      />
      {isPending ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState icon={<BellOff />} title="No notifications yet" description="We'll let you know when something needs your attention." />
      ) : (
        <Card className="space-y-0.5 p-2">
          {data.items.map((n) => (
            <button key={n.id} type="button" onClick={() => open(n)} className={notificationRowClass(n)}>
              <NotificationContent n={n} />
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
