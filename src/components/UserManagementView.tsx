import { useState, useEffect } from 'react';
import { dataService } from '@/lib/data-service';
import type { Profile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const emptyForm = { username: '', password: '', full_name: '', dp_no: '', role: 'technician' as 'admin' | 'technician' };

export default function UserManagementView() {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<Profile[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = async () => { setUsers(await dataService.getUsers()); };
  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => { setEditingUser(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (u: Profile) => {
    setEditingUser(u);
    setForm({ username: u.username, password: '', full_name: u.full_name, dp_no: u.dp_no || '', role: u.role });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.username.trim()) { toast.error('Full Name and Username are required'); return; }
    try {
      if (editingUser) {
        const duplicate = users.find(u => u.username === form.username && u.id !== editingUser.id);
        if (duplicate) { toast.error('Username already exists'); return; }
        await dataService.updateUser(editingUser.id, {
          full_name: form.full_name, username: form.username, dp_no: form.dp_no, role: form.role,
        });
        toast.success('User updated');
      } else {
        if (!form.password.trim()) { toast.error('Password is required'); return; }
        if (users.find(u => u.username === form.username)) { toast.error('Username already exists'); return; }
        await dataService.addUser({
          username: form.username, password: form.password, role: form.role, full_name: form.full_name, dp_no: form.dp_no,
        });
        toast.success('Account created');
      }
      await loadUsers();
      setShowDialog(false);
      setForm(emptyForm);
      setEditingUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="page-header mb-0">
          <h1>User Management</h1>
          <p>Manage accounts</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <UserPlus className="w-3.5 h-3.5 mr-1.5" /> {!isMobile && 'Add Users'}
        </Button>
      </div>

      {isMobile ? (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="industrial-card p-4 touch-manipulation">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">@{u.username}</p>
                  {u.dp_no && <p className="text-[11px] text-muted-foreground font-mono">{u.dp_no}</p>}
                </div>
                <span className={cn("text-[11px] px-2 py-0.5 rounded border font-medium shrink-0 ml-2",
                  u.role === 'admin' ? 'status-warning' : 'status-running')}>{u.role}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
                <span className="text-[11px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                  {u.role !== 'admin' && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeletingUser(u)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="industrial-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>DP.NO</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="text-[13px] font-medium">{u.full_name}</TableCell>
                  <TableCell className="font-mono text-[12px] text-muted-foreground">{u.dp_no || '—'}</TableCell>
                  <TableCell className="font-mono text-[12px]">{u.username}</TableCell>
                  <TableCell>
                    <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${u.role === 'admin' ? 'status-warning' : 'status-running'}`}>{u.role}</span>
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}><Pencil className="w-3.5 h-3.5" /></Button>
                      {u.role !== 'admin' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingUser(u)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{editingUser ? 'Edit User' : 'Add Account'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Full Name</Label>
              <Input value={form.full_name} onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">DP.NO</Label>
              <Input value={form.dp_no} onChange={e => setForm(prev => ({ ...prev, dp_no: e.target.value }))} className="mt-1" placeholder="e.g. DP001" />
            </div>
            <div>
              <Label className="text-xs">Username</Label>
              <Input value={form.username} onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Password {editingUser && <span className="text-muted-foreground">(leave blank to keep current)</span>}</Label>
              <Input type="password" value={form.password} onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v: 'admin' | 'technician') => setForm(prev => ({ ...prev, role: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>{editingUser ? 'Save Changes' : 'Create Account'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUser} onOpenChange={open => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.full_name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deletingUser) {
                  try {
                    await dataService.deleteUser(deletingUser.id);
                    await loadUsers();
                    setDeletingUser(null);
                    toast.success('User deleted');
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to delete user');
                  }
                }
              }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
