import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { dataService } from '@/lib/data-service';
import type { Motor, MaintenanceHistory, Profile } from '@/lib/types';
import { parseMotorExcel, exportMotorsToExcel, exportHistoryToExcel } from '@/lib/excel-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Plus, Upload, Download, History, Trash2, Edit, Eye, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MotorRegisterViewProps {
  category: 'general' | 'powerhouse';
  title: string;
}

const CONDITIONS: Motor['condition'][] = ['Running', 'Repair', 'Rewind', 'Replacement', 'Standby', 'Faulty'];

const conditionColors: Record<string, string> = {
  Running: 'status-running', Repair: 'status-warning', Rewind: 'status-warning',
  Replacement: 'status-idle', Standby: 'status-idle', Faulty: 'status-critical',
};

export default function MotorRegisterView({ category, title }: MotorRegisterViewProps) {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [filterPlant, setFilterPlant] = useState<string>('all');
  const [motors, setMotors] = useState<Motor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<string | null>(null);
  const [editMotor, setEditMotor] = useState<Motor | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showExportPlantModal, setShowExportPlantModal] = useState<'register' | 'history' | null>(null);
  const [exportPlant, setExportPlant] = useState<string>('all');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const refresh = useCallback(async () => {
    setMotors(await dataService.getMotors(category));
  }, [category]);

  useEffect(() => { refresh(); }, [refresh]);

  const plants = useMemo(() => {
    const set = new Set(motors.map(m => m.plant).filter(Boolean));
    return Array.from(set).sort();
  }, [motors]);

  const filtered = useMemo(() => {
    return motors.filter(m => {
      const matchesSearch = !search ||
        m.equipment_name.toLowerCase().includes(search.toLowerCase()) ||
        m.plant.toLowerCase().includes(search.toLowerCase()) ||
        m.make.toLowerCase().includes(search.toLowerCase());
      const matchesPlant = filterPlant === 'all' || m.plant === filterPlant;
      return matchesSearch && matchesPlant;
    });
  }, [motors, search, filterPlant]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseMotorExcel(file, category);
      await dataService.importMotors(parsed);
      await refresh();
      toast.success(`Imported ${parsed.length} motors`);
    } catch { toast.error('Failed to parse Excel file'); }
    e.target.value = '';
  };

  const handleExport = (plant: string) => {
    const toExport = plant === 'all' ? motors : motors.filter(m => m.plant === plant);
    exportMotorsToExcel(toExport, `${category}_motor_register${plant !== 'all' ? `_${plant}` : ''}.xlsx`);
    toast.success('Excel exported');
  };

  const handleExportHistory = async (plant: string) => {
    const targetMotors = plant === 'all' ? motors : motors.filter(m => m.plant === plant);
    const allHistory = await Promise.all(targetMotors.map(m => dataService.getMotorHistory(m.id)));
    const history = allHistory.flat();
    const motorNames: Record<string, string> = {};
    motors.forEach(m => { motorNames[m.id] = m.equipment_name; });
    const techs = await dataService.getTechnicians();
    const techNames: Record<string, string> = {};
    techs.forEach(t => { techNames[t.id] = t.full_name; });
    exportHistoryToExcel(history, `${category}_maintenance_history${plant !== 'all' ? `_${plant}` : ''}.xlsx`, motorNames, techNames);
    toast.success('History exported');
  };

  const handleExportConfirm = () => {
    if (showExportPlantModal === 'register') handleExport(exportPlant);
    else if (showExportPlantModal === 'history') handleExportHistory(exportPlant);
    setShowExportPlantModal(null);
    setExportPlant('all');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this motor?')) {
      await dataService.deleteMotor(id);
      await refresh();
      toast.success('Motor deleted');
    }
  };

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-between">
          <div className="page-header mb-0">
            <h1>{title}</h1>
            <p>{motors.length} motors registered</p>
          </div>
          {isAdmin && !isMobile && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" onClick={() => { setEditMotor(null); setShowAddModal(true); }}><Plus className="w-4 h-4 mr-1" /> Add Motor</Button>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" /> Import Excel</Button>
              <Button size="sm" variant="outline" onClick={() => { setExportPlant('all'); setShowExportPlantModal('register'); }}><Download className="w-4 h-4 mr-1" /> Export Register</Button>
              <Button size="sm" variant="outline" onClick={() => { setExportPlant('all'); setShowExportPlantModal('history'); }}><Download className="w-4 h-4 mr-1" /> Export History</Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            </div>
          )}
          {isAdmin && isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 w-9 p-0"><MoreVertical className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setEditMotor(null); setShowAddModal(true); }}><Plus className="w-4 h-4 mr-2" /> Add Motor</DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-2" /> Import Excel</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setExportPlant('all'); setShowExportPlantModal('register'); }}><Download className="w-4 h-4 mr-2" /> Export Register</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setExportPlant('all'); setShowExportPlantModal('history'); }}><Download className="w-4 h-4 mr-2" /> Export History</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {isAdmin && isMobile && <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />}
      </div>

      <div className="flex gap-2 md:gap-3 mb-4 items-center flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search motors..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9" />
        </div>
        <Select value={filterPlant} onValueChange={v => { setFilterPlant(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-32 md:w-40"><SelectValue placeholder="Plant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plants</SelectItem>
            {plants.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {!isMobile && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">Show</span>
            <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">rows</span>
          </div>
        )}
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No motors found</div>
          ) : paginated.map(motor => (
            <MotorCard key={motor.id} motor={motor} isAdmin={isAdmin}
              onView={() => setShowHistoryModal(motor.id)}
              onMaintenance={() => setShowMaintenanceModal(motor.id)}
              onEdit={() => { setEditMotor(motor); setShowAddModal(true); }}
              onDelete={() => handleDelete(motor.id)} />
          ))}
        </div>
      ) : (
        <div className="industrial-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">SL.NO.</TableHead>
                <TableHead>Plant</TableHead>
                <TableHead>Equipment Name</TableHead>
                <TableHead>Make</TableHead>
                <TableHead className="text-right">KW</TableHead>
                <TableHead className="text-right">HP</TableHead>
                <TableHead className="text-right">RPM</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Mounting</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No motors found</TableCell></TableRow>
              ) : paginated.map(motor => (
                <TableRow key={motor.id}>
                  <TableCell className="font-mono text-xs">{motor.sl_no}</TableCell>
                  <TableCell className="text-sm">{motor.plant}</TableCell>
                  <TableCell className="text-sm font-medium">{motor.equipment_name}</TableCell>
                  <TableCell className="text-sm">{motor.make}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{motor.kw}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{motor.hp}</TableCell>
                  <TableCell className="text-right text-sm font-mono">{motor.rpm}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-1 rounded-full border font-medium", conditionColors[motor.condition])}>{motor.condition}</span>
                  </TableCell>
                  <TableCell className="text-sm">{motor.mounting}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{motor.date}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowHistoryModal(motor.id)}><Eye className="w-3.5 h-3.5" /></Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowMaintenanceModal(motor.id)}><History className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditMotor(motor); setShowAddModal(true); }}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(motor.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">{(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 px-2 md:px-3 text-xs">
              <ChevronLeft className="w-4 h-4 md:hidden" /><span className="hidden md:inline">Previous</span>
            </Button>
            {!isMobile && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <Button key={page} variant={currentPage === page ? 'default' : 'outline'} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setCurrentPage(page)}>{page}</Button>
              );
            })}
            {isMobile && <span className="text-xs text-muted-foreground px-2">{currentPage}/{totalPages}</span>}
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 px-2 md:px-3 text-xs">
              <ChevronRight className="w-4 h-4 md:hidden" /><span className="hidden md:inline">Next</span>
            </Button>
          </div>
        </div>
      )}

      <MotorFormModal open={showAddModal} onClose={() => { setShowAddModal(false); setEditMotor(null); }} motor={editMotor} category={category} onSave={refresh} />
      {showHistoryModal && <HistoryModal motorId={showHistoryModal} onClose={() => setShowHistoryModal(null)} />}
      {showMaintenanceModal && <MaintenanceActionModal motorId={showMaintenanceModal} category={category} onClose={() => { setShowMaintenanceModal(null); refresh(); }} />}

      <Dialog open={!!showExportPlantModal} onOpenChange={() => setShowExportPlantModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Select Plant to Export {showExportPlantModal === 'register' ? 'Register' : 'History'}</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => setShowExportPlantModal(null)}>Cancel</Button>
            <Button onClick={handleExportConfirm}><Download className="w-4 h-4 mr-1" /> Export</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MotorCard({ motor, isAdmin, onView, onMaintenance, onEdit, onDelete }: {
  motor: Motor; isAdmin: boolean;
  onView: () => void; onMaintenance: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="industrial-card p-4 touch-manipulation active:scale-[0.99] transition-transform">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{motor.equipment_name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{motor.plant} · {motor.make}</p>
        </div>
        <span className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ml-2", conditionColors[motor.condition])}>{motor.condition}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mt-3 py-2.5 px-3 rounded-md bg-muted/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">KW</p>
          <p className="text-sm font-mono font-medium text-foreground">{motor.kw}</p>
        </div>
        <div className="text-center border-x border-border">
          <p className="text-[10px] text-muted-foreground">HP</p>
          <p className="text-sm font-mono font-medium text-foreground">{motor.hp}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">RPM</p>
          <p className="text-sm font-mono font-medium text-foreground">{motor.rpm}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
        <span className="text-[11px] text-muted-foreground font-mono">{motor.date}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onView}><Eye className="w-4 h-4" /></Button>
          {isAdmin && (
            <>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onMaintenance}><History className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}><Edit className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MotorFormModal({ open, onClose, motor, category, onSave }: {
  open: boolean; onClose: () => void; motor: Motor | null; category: 'general' | 'powerhouse'; onSave: () => void;
}) {
  const [nextSlNo, setNextSlNo] = useState(1);
  const [form, setForm] = useState<Partial<Motor>>({});

  useEffect(() => {
    if (open) {
      dataService.getMotors(category).then(motors => {
        const next = motors.length > 0 ? Math.max(...motors.map(m => m.sl_no)) + 1 : 1;
        setNextSlNo(next);
        setForm(motor || {
          sl_no: next, plant: '', equipment_name: '', reason: '', date: new Date().toISOString().split('T')[0],
          make: '', kw: 0, hp: 0, rpm: 0, condition: 'Standby', mounting: 'Foot',
        });
      });
    }
  }, [open, motor, category]);

  const handleSave = async () => {
    if (!form.equipment_name?.trim()) { toast.error('Equipment name is required'); return; }
    if (motor) {
      await dataService.updateMotor({
        id: motor.id,
        sl_no: Number(form.sl_no) || 0, plant: form.plant || '', equipment_name: form.equipment_name || '',
        reason: form.reason || '', date: form.date || new Date().toISOString().split('T')[0],
        make: form.make || '', kw: Number(form.kw) || 0, hp: Number(form.hp) || 0, rpm: Number(form.rpm) || 0,
        condition: (form.condition as Motor['condition']) || 'Standby', mounting: form.mounting || 'Foot',
        last_updated: new Date().toISOString().split('T')[0], category,
      });
    } else {
      await dataService.addMotor({
        sl_no: Number(form.sl_no) || 0, plant: form.plant || '', equipment_name: form.equipment_name || '',
        reason: form.reason || '', date: form.date || new Date().toISOString().split('T')[0],
        make: form.make || '', kw: Number(form.kw) || 0, hp: Number(form.hp) || 0, rpm: Number(form.rpm) || 0,
        condition: (form.condition as Motor['condition']) || 'Standby', mounting: form.mounting || 'Foot',
        last_updated: new Date().toISOString().split('T')[0], category,
      });
    }
    onSave();
    onClose();
    toast.success(motor ? 'Motor updated' : 'Motor added');
  };

  const fields = [
    { key: 'sl_no', label: 'SL.NO.', type: 'number', span: false },
    { key: 'plant', label: 'Plant', type: 'text', span: false },
    { key: 'equipment_name', label: 'Equipment Name', type: 'text', span: true },
    { key: 'make', label: 'Make', type: 'text', span: false },
    { key: 'kw', label: 'KW', type: 'number', span: false },
    { key: 'hp', label: 'HP', type: 'number', span: false },
    { key: 'rpm', label: 'RPM', type: 'number', span: false },
    { key: 'mounting', label: 'Mounting', type: 'text', span: false },
    { key: 'reason', label: 'Reason', type: 'text', span: true },
    { key: 'date', label: 'Date', type: 'date', span: false },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{motor ? 'Edit Motor' : 'Add New Motor'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map(f => (
            <div key={f.key} className={f.span ? 'md:col-span-2' : ''}>
              <Label className="text-xs">{f.label}</Label>
              <Input type={f.type} value={String((form as any)[f.key] || '')}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="mt-1" disabled={f.key === 'sl_no' && !motor} />
            </div>
          ))}
          <div>
            <Label className="text-xs">Condition</Label>
            <Select value={form.condition || 'Standby'} onValueChange={v => setForm(prev => ({ ...prev, condition: v as Motor['condition'] }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HistoryModal({ motorId, onClose }: { motorId: string; onClose: () => void }) {
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [technicians, setTechnicians] = useState<Profile[]>([]);

  useEffect(() => {
    Promise.all([dataService.getMotorHistory(motorId), dataService.getTechnicians()])
      .then(([h, t]) => { setHistory(h); setTechnicians(t); });
  }, [motorId]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Maintenance History</DialogTitle></DialogHeader>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No maintenance records for this motor.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {history.map(h => (
              <div key={h.id} className="p-3 rounded-md bg-muted">
                <div className="flex justify-between items-start">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", conditionColors[h.action_type] || 'status-idle')}>{h.action_type}</span>
                  <span className="text-xs text-muted-foreground">{h.date}</span>
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
  );
}

function MaintenanceActionModal({ motorId, category, onClose }: { motorId: string; category: 'general' | 'powerhouse'; onClose: () => void }) {
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<Profile[]>([]);
  const [form, setForm] = useState({
    action_type: 'Repair' as MaintenanceHistory['action_type'],
    reason: '', date: new Date().toISOString().split('T')[0], technician_id: '', remarks: '',
  });

  useEffect(() => {
    dataService.getTechnicians().then(techs => {
      setTechnicians(techs);
      if (techs.length > 0) setForm(prev => ({ ...prev, technician_id: techs[0].id }));
    });
  }, []);

  const handleSave = async () => {
    if (!form.reason.trim()) { toast.error('Reason is required'); return; }
    await dataService.addHistory({
      motor_id: motorId, action_type: form.action_type, reason: form.reason,
      date: form.date, technician_id: form.technician_id, remarks: form.remarks, category,
    });
    const motors = await dataService.getMotors(category);
    const motor = motors.find(m => m.id === motorId);
    if (motor) {
      await dataService.updateMotor({
        ...motor, condition: form.action_type as Motor['condition'],
        reason: form.reason, date: form.date, last_updated: new Date().toISOString().split('T')[0],
      });
    }
    toast.success('Maintenance record added');
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Maintenance Action</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Action Type</Label>
            <Select value={form.action_type} onValueChange={v => setForm(prev => ({ ...prev, action_type: v as MaintenanceHistory['action_type'] }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Repair">Repair</SelectItem>
                <SelectItem value="Rewind">Rewind</SelectItem>
                <SelectItem value="Replacement">Replacement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Reason</Label>
            <Input value={form.reason} onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Technician</Label>
            <Select value={form.technician_id} onValueChange={v => setForm(prev => ({ ...prev, technician_id: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Remarks</Label>
            <Input value={form.remarks} onChange={e => setForm(prev => ({ ...prev, remarks: e.target.value }))} className="mt-1" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
