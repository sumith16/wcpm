import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import LoginPage from '@/pages/LoginPage';
import AppSidebar, { PageView } from '@/components/AppSidebar';
import DashboardView from '@/components/DashboardView';
import MotorRegisterView from '@/components/MotorRegisterView';
import MaintenanceHistoryView from '@/components/MaintenanceHistoryView';
import AttendanceView from '@/components/AttendanceView';
import NotificationsView from '@/components/NotificationsView';
import UserManagementView from '@/components/UserManagementView';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Sun, Moon } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const PAGE_TITLES: Record<PageView, string> = {
  dashboard: 'Dashboard', motors: 'Motor Register', powerhouse: 'Power House',
  history: 'Maintenance History', attendance: 'Attendance', notifications: 'Notifications', users: 'User Management',
};

const Index = () => {
  const { user, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  if (!user) return <LoginPage />;

  const handleNavigate = (page: PageView) => { setCurrentPage(page); if (isMobile) setMobileOpen(false); };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardView />;
      case 'motors': return <MotorRegisterView category="general" title="Motor Register" />;
      case 'powerhouse': return <MotorRegisterView category="powerhouse" title="Power House Motors" />;
      case 'history': return <MaintenanceHistoryView />;
      case 'attendance': return <AttendanceView />;
      case 'notifications': return <NotificationsView />;
      case 'users': return isAdmin ? <UserManagementView /> : <DashboardView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden glass-app-bg">
      {!isMobile && <AppSidebar currentPage={currentPage} onNavigate={handleNavigate} />}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[260px] border-r-0 glass-sidebar">
            <AppSidebar currentPage={currentPage} onNavigate={handleNavigate} isMobile />
          </SheetContent>
        </Sheet>
      )}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 glass-header flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-muted transition-colors" aria-label="Open menu">
                <Menu className="w-5 h-5 text-foreground" />
              </button>
            )}
            <div><h2 className="text-sm font-semibold text-foreground">{PAGE_TITLES[currentPage]}</h2></div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-muted transition-colors" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-foreground">{user.full_name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role}</p>
            </div>
            <div className="w-8 h-8 rounded-xl glass-card flex items-center justify-center text-xs font-semibold text-primary">
              {user.full_name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-[1440px]">
            <AnimatePresence mode="wait">
              <motion.div key={currentPage} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
