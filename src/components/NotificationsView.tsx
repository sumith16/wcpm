import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { dataService } from '@/lib/data-service';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function NotificationsView() {
  const { isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => { dataService.getNotifications().then(setNotifications); }, []);

  const handleMarkSeen = async (id: string) => {
    await dataService.markNotificationSeen(id);
    setNotifications(await dataService.getNotifications());
  };

  const handleMarkAllSeen = async () => {
    await dataService.markAllSeen();
    setNotifications(await dataService.getNotifications());
  };

  const unseen = notifications.filter(n => n.status === 'Unseen').length;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1>Notifications</h1>
          <p>{unseen} unseen alert{unseen !== 1 ? 's' : ''}</p>
        </div>
        {unseen > 0 && (
          <Button size="sm" variant="outline" onClick={handleMarkAllSeen}>
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="industrial-card p-12 text-center">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">Alerts will appear when motors have repeated failures</p>
        </motion.div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={cn("industrial-card p-4 flex items-start gap-3.5 transition-all", n.status === 'Unseen' && "border-l-2 border-l-destructive")}>
              <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                n.status === 'Unseen' ? "bg-destructive/8" : "bg-muted")}>
                <ShieldAlert className={cn("w-4 h-4", n.status === 'Unseen' ? "text-destructive" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-[13px] leading-relaxed", n.status === 'Unseen' ? "font-medium text-foreground" : "text-muted-foreground")}>
                  {n.alert_message}
                </p>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className="text-[11px] text-muted-foreground/60 font-mono">{new Date(n.date).toLocaleString()}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium capitalize">{n.category}</span>
                </div>
              </div>
              {n.status === 'Unseen' && (
                <Button variant="ghost" size="sm" onClick={() => handleMarkSeen(n.id)} className="shrink-0 text-xs h-7 px-2.5">Mark Read</Button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
