import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { dataService } from '@/lib/data-service';
import {
  LayoutDashboard, Settings2, Users, Bell, ClipboardList,
  Zap, LogOut, ChevronLeft, ChevronRight, Factory, Shield, Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export type PageView = 'dashboard' | 'motors' | 'powerhouse' | 'history' | 'attendance' | 'notifications' | 'users';

interface AppSidebarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  isMobile?: boolean;
}

export default function AppSidebar({ currentPage, onNavigate, isMobile }: AppSidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => { dataService.getUnseenCount().then(setUnseenCount); }, [currentPage]);

  const isCollapsed = isMobile ? false : collapsed;
  const sidebarWidth = isMobile ? '100%' : (isCollapsed ? 64 : 240);

  const navItems = [
    { id: 'dashboard' as PageView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'motors' as PageView, label: 'Motor Register', icon: Settings2 },
    { id: 'powerhouse' as PageView, label: 'Power House', icon: Factory },
    { id: 'history' as PageView, label: 'History', icon: Wrench },
    { id: 'attendance' as PageView, label: 'Attendance', icon: ClipboardList },
    { id: 'notifications' as PageView, label: 'Notifications', icon: Bell, badge: unseenCount },
    ...(isAdmin ? [{ id: 'users' as PageView, label: 'User Management', icon: Users }] : []),
  ];

  return (
    <motion.div initial={false} animate={{ width: sidebarWidth }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={cn("h-full flex flex-col overflow-hidden shrink-0", !isMobile && "glass-sidebar")}>
      <div className="px-4 flex items-center gap-3 h-14">
        <div className="w-8 h-8 rounded-xl bg-sidebar-primary/15 flex items-center justify-center shrink-0 backdrop-blur-sm">
          <Shield className="w-4 h-4 text-sidebar-primary" />
        </div>
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }} className="overflow-hidden">
              <h2 className="text-sm font-semibold text-sidebar-foreground tracking-tight">PMMS</h2>
              <p className="text-[10px] text-sidebar-foreground/35 font-medium">Motor Management</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mx-3 h-px bg-sidebar-border/50" />
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={cn("w-full flex items-center gap-3 px-3 py-2.5 md:py-2 rounded-md text-[13px] transition-all duration-150 relative group",
                "active:scale-[0.98] touch-manipulation",
                isActive ? "bg-sidebar-primary/15 text-sidebar-primary font-medium" : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-white/4")}>
              <item.icon className={cn("w-[16px] h-[16px] shrink-0", isActive && "text-sidebar-primary")} />
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate">{item.label}</motion.span>
                )}
              </AnimatePresence>
              {item.badge && item.badge > 0 && (
                <span className={cn("absolute top-1/2 -translate-y-1/2 bg-destructive text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center",
                  isCollapsed ? "right-1" : "right-2")}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border/50">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-2.5 px-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-sidebar-accent flex items-center justify-center text-[11px] font-semibold text-sidebar-foreground">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">{user?.full_name}</p>
                  <p className="text-[10px] text-sidebar-foreground/35 capitalize">{user?.role}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-1">
          <button onClick={logout}
            className="flex-1 flex items-center gap-2 px-2.5 py-2 md:py-1.5 rounded-md text-xs text-sidebar-foreground/40 hover:bg-white/4 hover:text-sidebar-foreground transition-all active:scale-[0.98] touch-manipulation">
            <LogOut className="w-3.5 h-3.5" />
            {!isCollapsed && <span>Logout</span>}
          </button>
          {!isMobile && (
            <button onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md text-sidebar-foreground/25 hover:text-sidebar-foreground hover:bg-white/4 transition-all">
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
