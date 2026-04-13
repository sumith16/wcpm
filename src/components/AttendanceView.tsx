import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { dataService } from '@/lib/data-service';
import type { Profile, AttendanceRecord } from '@/lib/types';
import { exportAttendanceToExcel } from '@/lib/excel-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const ATTENDANCE_CODES = ['A', 'B', 'C', 'D', 'H', 'L', 'OD', 'OFF', 'AB'] as const;
type AttendanceCode = typeof ATTENDANCE_CODES[number];

export default function AttendanceView() {
  const { isAdmin, user } = useAuth();
  const isMobile = useIsMobile();
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const isTodaySelected = date === today;
  const now = new Date();
  const [exportMonth, setExportMonth] = useState(now.getMonth());
  const [exportYear, setExportYear] = useState(now.getFullYear());
  const [statuses, setStatuses] = useState<Record<string, AttendanceCode>>({});
  const [techAttendance, setTechAttendance] = useState<AttendanceRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceCode>('A');

  useEffect(() => {
    async function load() {
      const techs = await dataService.getTechnicians();
      setTechnicians(techs);
      const allAttendance = await dataService.getAttendance();
      const statusMap: Record<string, AttendanceCode> = {};
      techs.forEach(t => {
        const rec = allAttendance.find(a => a.technician_id === t.id && a.date === date);
        statusMap[t.id] = (rec?.status as AttendanceCode) || 'A';
      });
      setStatuses(statusMap);
      if (isAdmin) {
        setTechAttendance(allAttendance.filter(a => a.date === date));
      } else if (user) {
        const myAtt = await dataService.getTechnicianAttendance(user.id);
        setTechAttendance(myAtt.filter(a => a.date === date));
      }
    }
    load();
  }, [refreshKey, date, isAdmin, user]);

  const handleMark = async () => {
    if (!user) return;
    const records = technicians.map(t => ({
      technician_id: t.id, date, status: statuses[t.id] || 'A', marked_by: user.id,
    }));
    await dataService.markAttendance(records);
    setRefreshKey(k => k + 1);
    toast.success('Attendance marked successfully');
  };

  const handleMarkSelf = async () => {
    if (!user) return;
    await dataService.markAttendance([{
      technician_id: user.id, date, status: statuses[user.id] || 'A', marked_by: user.id,
    }]);
    setRefreshKey(k => k + 1);
    toast.success('Attendance marked successfully');
  };

  const handleEditStart = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setEditStatus(record.status as AttendanceCode);
  };

  const handleEditSave = async (record: AttendanceRecord) => {
    if (!user) return;
    await dataService.markAttendance([{
      technician_id: record.technician_id, date: record.date, status: editStatus, marked_by: user.id,
    }]);
    setEditingId(null);
    setRefreshKey(k => k + 1);
    toast.success('Attendance updated');
  };

  const handleEditCancel = () => { setEditingId(null); };

  const handleExport = async () => {
    const names: Record<string, string> = {};
    const dpNos: Record<string, string> = {};
    technicians.forEach((t) => { names[t.id] = t.full_name; dpNos[t.id] = t.dp_no || t.username; });
    const allAttendance = await dataService.getAttendance();
    await exportAttendanceToExcel(allAttendance, names, dpNos,
      `attendance_${MONTHS[exportMonth]}_${exportYear}.xlsx`, exportMonth, exportYear);
    toast.success('Attendance exported');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div className="page-header mb-0">
          <h1>Attendance</h1>
          <p>{isAdmin ? 'Mark and view technician attendance' : 'Your attendance records'}</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={String(exportMonth)} onValueChange={v => setExportMonth(Number(v))}>
              <SelectTrigger className="w-28 md:w-32 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" value={exportYear} onChange={e => setExportYear(Number(e.target.value))} className="w-20 h-9 text-xs" min={2020} max={2030} />
            <Button size="sm" variant="outline" onClick={handleExport} className="h-9">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Export
            </Button>
          </div>
        )}
      </div>

      <div className="industrial-card p-4 md:p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Mark Attendance</h3>
          {isAdmin ? (
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-36 md:w-40 h-9 text-xs" />
          ) : (
            <span className="text-xs font-mono text-muted-foreground">{today}</span>
          )}
        </div>
        {!isAdmin && !isTodaySelected && (
          <p className="text-xs text-destructive mb-3">You can only mark attendance for today.</p>
        )}
        <div className="space-y-0">
          {(isAdmin ? technicians : technicians.filter(t => t.id === user?.id)).map((tech, i, arr) => (
            <div key={tech.id} className={cn("flex items-center justify-between py-3 touch-manipulation", i < arr.length - 1 && 'border-b border-border')}>
              <div className="min-w-0">
                <span className="text-[13px] font-medium text-foreground">{tech.full_name}</span>
                {tech.dp_no && <span className="text-[11px] text-muted-foreground ml-2 font-mono">{tech.dp_no}</span>}
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                {ATTENDANCE_CODES.map(code => (
                  <label key={code} className="flex items-center gap-1 cursor-pointer touch-manipulation">
                    <input type="radio" name={`att-${tech.id}`} checked={statuses[tech.id] === code}
                      onChange={() => setStatuses(prev => ({ ...prev, [tech.id]: code }))}
                      className="w-3.5 h-3.5 accent-[hsl(var(--primary))]" />
                    <span className="text-[11px] font-medium text-foreground">{code}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={isAdmin ? handleMark : handleMarkSelf} disabled={!isAdmin && !isTodaySelected} className="w-full md:w-auto">Save Attendance</Button>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {techAttendance.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No attendance records</div>
          ) : (
            techAttendance.slice(0, 50).map(record => {
              const tech = technicians.find(t => t.id === record.technician_id);
              const isEditing = editingId === record.id;
              return (
                <div key={record.id} className="industrial-card p-3.5 touch-manipulation">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{tech?.full_name || record.technician_id}</p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{record.date}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <>
                          <span className="text-[11px] px-2.5 py-1 rounded-full border font-medium bg-muted text-foreground">{record.status}</span>
                          {(isAdmin || (record.technician_id === user?.id && record.date === today)) && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditStart(record)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                      {isEditing && (
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleEditSave(record)}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEditCancel}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-border">
                      {ATTENDANCE_CODES.map(code => (
                        <label key={code} className="flex items-center gap-1 cursor-pointer touch-manipulation">
                          <input type="radio" name={`edit-${record.id}`} checked={editStatus === code}
                            onChange={() => setEditStatus(code)} className="w-3.5 h-3.5 accent-[hsl(var(--primary))]" />
                          <span className="text-[11px] font-medium text-foreground">{code}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="industrial-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technician</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Marked Time</TableHead>
                <TableHead className="w-16">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {techAttendance.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">No attendance records</TableCell></TableRow>
              ) : (
                techAttendance.slice(0, 50).map(record => {
                  const tech = technicians.find(t => t.id === record.technician_id);
                  const isEditing = editingId === record.id;
                  const canEdit = isAdmin || (record.technician_id === user?.id && record.date === today);
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="text-[13px] font-medium">{tech?.full_name || record.technician_id}</TableCell>
                      <TableCell className="text-[13px] font-mono">{record.date}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ATTENDANCE_CODES.map(code => (
                              <label key={code} className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" name={`edit-${record.id}`} checked={editStatus === code}
                                  onChange={() => setEditStatus(code)} className="w-3.5 h-3.5 accent-[hsl(var(--primary))]" />
                                <span className="text-[11px] font-medium text-foreground">{code}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded border font-medium bg-muted text-foreground">{record.status}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[13px] text-muted-foreground">{new Date(record.marked_time).toLocaleString()}</TableCell>
                      <TableCell>
                        {canEdit && (isEditing ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleEditSave(record)}><Check className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleEditCancel}><X className="w-3.5 h-3.5" /></Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditStart(record)}><Pencil className="w-3.5 h-3.5" /></Button>
                        ))}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
