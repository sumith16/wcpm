import { useState, useEffect, useMemo } from 'react';
import { dataService } from '@/lib/data-service';
import type { Motor, MaintenanceHistory, Profile } from '@/lib/types';
import { exportHistoryToExcel } from '@/lib/excel-utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const conditionColors: Record<string, string> = {
  Running: 'status-running', Repair: 'status-warning', Rewind: 'status-warning',
  Replacement: 'status-idle', Standby: 'status-idle', Faulty: 'status-critical',
};

export default function MaintenanceHistoryView() {
  const isMobile = useIsMobile();
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [motors, setMotors] = useState<Motor[]>([]);
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [exportPlant, setExportPlant] = useState('all');

  useEffect(() => {
    Promise.all([dataService.getHistory(), dataService.getAllMotors(), dataService.getTechnicians()])
      .then(([h, m, t]) => { setHistory(h); setMotors(m); setTechnicians(t); });
  }, []);

  const motorMap = useMemo(() => {
    const map: Record<string, Motor> = {};
    motors.forEach(m => { map[m.id] = m; });
    return map;
  }, [motors]);

  const techMap = useMemo(() => {
    const map: Record<string, string> = {};
    technicians.forEach(t => { map[t.id] = t.full_name; });
    return map;
  }, [technicians]);

  const filtered = useMemo(() => {
    let items = [...history];
    if (filterCategory !== 'all') items = items.filter(h => h.category === filterCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(h => {
        const motor = motorMap[h.motor_id];
        return (motor?.equipment_name || '').toLowerCase().includes(q) ||
          h.action_type.toLowerCase().includes(q) || h.reason.toLowerCase().includes(q) ||
          (h.remarks || '').toLowerCase().includes(q) || (techMap[h.technician_id] || '').toLowerCase().includes(q);
      });
    }
    return items;
  }, [history, filterCategory, search, motorMap, techMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, filterCategory]);

  const plants = useMemo(() => {
    const set = new Set(motors.map(m => m.plant).filter(Boolean));
    return Array.from(set).sort();
  }, [motors]);

  const handleExport = (plant: string) => {
    const targetMotorIds = plant === 'all'
      ? new Set(motors.map(m => m.id))
      : new Set(motors.filter(m => m.plant === plant).map(m => m.id));
    const toExport = filtered.filter(h => targetMotorIds.has(h.motor_id));
    const motorNames: Record<string, string> = {};
    motors.forEach(m => { motorNames[m.id] = m.equipment_name; });
    exportHistoryToExcel(toExport, `maintenance_history${plant !== 'all' ? `_${plant}` : ''}.xlsx`, motorNames, techMap);
    toast.success('History exported');
    setShowPlantModal(false);
    setExportPlant('all');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div className="page-header mb-0">
          <h1>Maintenance History</h1>
          <p>{filtered.length} records</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setExportPlant('all'); setShowPlantModal(true); }} className="h-9 w-fit">
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by equipment, action, reason, technician..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="powerhouse">Powerhouse</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Show</span>
          <Select value={String(rowsPerPage)} onValueChange={v => setRowsPerPage(Number(v))}>
            <SelectTrigger className="w-16 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{[10, 15, 25, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">rows</span>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {paginated.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No maintenance records found</div>
          ) : paginated.map(h => {
            const motor = motorMap[h.motor_id];
            return (
              <div key={h.id} className="industrial-card p-3.5">
                <div className="flex items-start justify-between mb-1.5">
                  <p className="text-[13px] font-medium text-foreground truncate">{motor?.equipment_name || h.motor_id}</p>
                  <span className="text-[11px] text-muted-foreground font-mono ml-2 shrink-0">{h.date}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", conditionColors[h.action_type] || 'status-idle')}>{h.action_type}</span>
                </div>
                <p className="text-xs text-muted-foreground">{h.reason}</p>
                {h.remarks && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{h.remarks}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">By: {techMap[h.technician_id] || h.technician_id}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="industrial-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment Name</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">No maintenance records found</TableCell></TableRow>
              ) : paginated.map(h => {
                const motor = motorMap[h.motor_id];
                return (
                  <TableRow key={h.id}>
                    <TableCell className="text-[13px] font-medium">{motor?.equipment_name || h.motor_id}</TableCell>
                    <TableCell>
                      <span className={cn("text-[11px] px-2 py-0.5 rounded border font-medium", conditionColors[h.action_type] || 'status-idle')}>{h.action_type}</span>
                    </TableCell>
                    <TableCell className="text-[13px]">{h.reason}</TableCell>
                    <TableCell className="text-[13px] font-mono">{h.date}</TableCell>
                    <TableCell className="text-[13px]">{techMap[h.technician_id] || h.technician_id}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{h.remarks || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">Page {currentPage} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showPlantModal} onOpenChange={setShowPlantModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Select Plant to Export History</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Plant</Label>
              <Select value={exportPlant} onValueChange={setExportPlant}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  {plants.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPlantModal(false)}>Cancel</Button>
            <Button onClick={() => handleExport(exportPlant)}><Download className="w-4 h-4 mr-1" /> Export</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
