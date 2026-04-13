import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { dataService } from '@/lib/data-service';
import type { Motor, MaintenanceHistory, Notification, Profile } from '@/lib/types';
import { Settings2, AlertTriangle, Users, ClipboardList, Factory, Activity, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function DashboardView() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalMotors: 0, generalMotors: 0, powerhouseMotors: 0, running: 0, faulty: 0,
    totalHistory: 0, unseenAlerts: 0, totalTechnicians: 0, presentToday: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [motors, setMotors] = useState<Motor[]>([]);
  const [technicians, setTechnicians] = useState<Profile[]>([]);

  useEffect(() => {
    async function load() {
      const [allMotors, allHistory, allNotifs, allTechs, allAttendance] = await Promise.all([
        dataService.getAllMotors(), dataService.getHistory(), dataService.getNotifications(),
        dataService.getTechnicians(), dataService.getAttendance(),
      ]);
      const general = allMotors.filter(m => m.category === 'general');
      const powerhouse = allMotors.filter(m => m.category === 'powerhouse');
      const running = allMotors.filter(m => m.condition === 'Running').length;
      const faulty = allMotors.filter(m => m.condition === 'Faulty').length;
      const today = new Date().toISOString().split('T')[0];
      const presentToday = allAttendance.filter(a => a.date === today && a.status !== 'AB' && a.status !== 'OFF').length;

      setStats({
        totalMotors: allMotors.length, generalMotors: general.length, powerhouseMotors: powerhouse.length,
        running, faulty, totalHistory: allHistory.length,
        unseenAlerts: allNotifs.filter(n => n.status === 'Unseen').length,
        totalTechnicians: allTechs.length, presentToday,
      });
      setNotifications(allNotifs);
      setHistory(allHistory);
      setMotors(allMotors);
      setTechnicians(allTechs);
    }
    load();
  }, []);

  const cards = [
    { label: 'Total Motors', value: stats.totalMotors, icon: Settings2, variant: '' },
    { label: 'General Motors', value: stats.generalMotors, icon: Activity, variant: '' },
    { label: 'Powerhouse', value: stats.powerhouseMotors, icon: Factory, variant: 'stat-card-accent' },
    ...(isAdmin ? [
      { label: 'Technicians', value: stats.totalTechnicians, icon: Users, variant: '' },
      { label: 'Present Today', value: stats.presentToday, icon: ClipboardList, variant: 'stat-card-success' },
    ] : []),
    { label: 'Unseen Alerts', value: stats.unseenAlerts, icon: AlertTriangle, variant: stats.unseenAlerts > 0 ? 'stat-card-danger' : '' },
    { label: 'Maintenance', value: stats.totalHistory, icon: Wrench, variant: '' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Overview</h1>
        <p>Motor maintenance overview for Paper Mill</p>
      </div>
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 min-w-max md:min-w-0">
          {cards.map((card, i) => (
            <motion.div key={card.label} custom={i} initial="hidden" animate="visible" variants={cardVariants}
              className={cn("stat-card w-[140px] md:w-auto shrink-0 md:shrink touch-manipulation", card.variant)}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 md:w-9 md:h-9 rounded-md bg-muted flex items-center justify-center">
                  <card.icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xl md:text-2xl font-semibold text-foreground tracking-tight font-mono">{card.value}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground mt-1">{card.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 md:gap-5 mt-5 md:mt-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <RecentNotifications notifications={notifications} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
          <RecentMaintenance history={history} motors={motors} technicians={technicians} />
        </motion.div>
      </div>
    </div>
  );
}

function RecentNotifications({ notifications }: { notifications: Notification[] }) {
  const recent = notifications.slice(0, 5);
  return (
    <div className="industrial-card p-4 md:p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-md bg-destructive/8 flex items-center justify-center">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Recent Alerts</h3>
      </div>
      {recent.length === 0 ? (
        <div className="text-center py-8"><p className="text-sm text-muted-foreground">No notifications yet</p></div>
      ) : (
        <div className="space-y-0.5">
          {recent.map(n => (
            <div key={n.id} className={cn("flex items-start gap-3 p-3 rounded-md transition-colors touch-manipulation",
              n.status === 'Unseen' ? 'bg-destructive/4' : 'hover:bg-muted/50')}>
              <div className={cn("w-1.5 h-1.5 rounded-full mt-2 shrink-0", n.status === 'Unseen' ? 'bg-destructive' : 'bg-muted-foreground/20')} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-[13px] leading-relaxed", n.status === 'Unseen' ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {n.alert_message}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">{new Date(n.date).toLocaleDateString()}</p>
              </div>
              {n.status === 'Unseen' && (
                <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium shrink-0">NEW</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentMaintenance({ history, motors, technicians }: { history: MaintenanceHistory[]; motors: Motor[]; technicians: Profile[] }) {
  const recent = history.slice(0, 5);
  const [selectedMotorId, setSelectedMotorId] = useState<string | null>(null);
  const [motorHistory, setMotorHistory] = useState<MaintenanceHistory[]>([]);
  const selectedMotor = selectedMotorId ? motors.find(m => m.id === selectedMotorId) : null;

  useEffect(() => {
    if (selectedMotorId) dataService.getMotorHistory(selectedMotorId).then(setMotorHistory);
  }, [selectedMotorId]);

  const conditionColors: Record<string, string> = { Repair: 'status-warning', Rewind: 'status-warning', Replacement: 'status-idle' };

  return (
    <div className="industrial-card p-4 md:p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-md bg-primary/8 flex items-center justify-center">
          <Wrench className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Recent Maintenance</h3>
      </div>
      {recent.length === 0 ? (
        <div className="text-center py-8"><p className="text-sm text-muted-foreground">No maintenance records yet</p></div>
      ) : (
        <div className="space-y-0.5">
          {recent.map(h => {
            const motor = motors.find(m => m.id === h.motor_id);
            return (
              <div key={h.id} onClick={() => setSelectedMotorId(h.motor_id)}
                className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer touch-manipulation active:scale-[0.99]">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{motor?.equipment_name || h.motor_id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1.5 border",
                      h.action_type === 'Repair' ? 'status-warning' : h.action_type === 'Rewind' ? 'status-warning' : 'status-idle'
                    )}>{h.action_type}</span>
                    {h.reason}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground/60 shrink-0 ml-3 font-mono">{h.date}</span>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={!!selectedMotorId} onOpenChange={() => setSelectedMotorId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {selectedMotor ? `${selectedMotor.equipment_name} — History` : 'Motor History'}
            </DialogTitle>
          </DialogHeader>
          {motorHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No maintenance records for this motor.</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {motorHistory.map(h => (
                <div key={h.id} className="p-3 rounded-md bg-muted">
                  <div className="flex justify-between items-start">
                    <span className={cn("text-[11px] px-2 py-0.5 rounded border font-medium", conditionColors[h.action_type] || 'status-idle')}>
                      {h.action_type}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">{h.date}</span>
                  </div>
                  <p className="text-sm mt-2 text-foreground">{h.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">{h.remarks}</p>
                  <p className="text-xs text-muted-foreground">By: {technicians.find(t => t.id === h.technician_id)?.full_name || h.technician_id}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
