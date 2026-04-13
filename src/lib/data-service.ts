import { supabase, adminSupabase } from './supabase';
import type { Profile, Motor, MaintenanceHistory, AttendanceRecord, Notification } from './types';

export const dataService = {
  // ============ Users / Profiles ============
  async getUsers(): Promise<Profile[]> {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at');
    if (error) throw error;
    return data || [];
  },

  async getTechnicians(): Promise<Profile[]> {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'technician').order('full_name');
    if (error) throw error;
    return data || [];
  },

  async addUser(data: { username: string; password: string; role: 'admin' | 'technician'; full_name: string; dp_no: string }): Promise<Profile> {
    // Create auth user, then profile is created via trigger
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `${data.username}@pmms.local`,
      password: data.password,
      options: { data: { username: data.username, role: data.role, full_name: data.full_name, dp_no: data.dp_no } },
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Wait a moment for the trigger, then fetch
    await new Promise(r => setTimeout(r, 500));
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
    if (error) throw error;
    return profile;
  },

  async updateUser(id: string, data: Partial<{ username: string; role: 'admin' | 'technician'; full_name: string; dp_no: string }>): Promise<void> {
    const { error } = await supabase.from('profiles').update(data).eq('id', id);
    if (error) throw error;
  },

  async deleteUser(id: string): Promise<void> {
    // Use the admin client (service_role) to delete the user from auth.users.
    // This also cascade-deletes their profile.
    const { error } = await adminSupabase.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message || 'Failed to delete user');
  },

  // ============ Motors ============
  async getMotors(category: 'general' | 'powerhouse'): Promise<Motor[]> {
    const { data, error } = await supabase.from('motors').select('*').eq('category', category).order('sl_no');
    if (error) throw error;
    return data || [];
  },

  async getAllMotors(): Promise<Motor[]> {
    const { data, error } = await supabase.from('motors').select('*').order('category').order('sl_no');
    if (error) throw error;
    return data || [];
  },

  async addMotor(motor: Omit<Motor, 'id'>): Promise<Motor> {
    const { data, error } = await supabase.from('motors').insert(motor).select().single();
    if (error) throw error;
    return data;
  },

  async updateMotor(motor: Motor): Promise<void> {
    const { id, ...rest } = motor;
    const { error } = await supabase.from('motors').update(rest).eq('id', id);
    if (error) throw error;
  },

  async deleteMotor(id: string): Promise<void> {
    const { error } = await supabase.from('motors').delete().eq('id', id);
    if (error) throw error;
  },

  async importMotors(motors: Omit<Motor, 'id'>[]): Promise<number> {
    const { data, error } = await supabase.from('motors').upsert(
      motors.map(m => ({ ...m })),
      { onConflict: 'sl_no,category' }
    );
    if (error) throw error;
    return motors.length;
  },

  // ============ Maintenance History ============
  async getHistory(category?: 'general' | 'powerhouse'): Promise<MaintenanceHistory[]> {
    let query = supabase.from('maintenance_history').select('*').order('date', { ascending: false });
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getMotorHistory(motorId: string): Promise<MaintenanceHistory[]> {
    const { data, error } = await supabase.from('maintenance_history').select('*').eq('motor_id', motorId).order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addHistory(entry: Omit<MaintenanceHistory, 'id'>): Promise<void> {
    const { error } = await supabase.from('maintenance_history').insert(entry);
    if (error) throw error;
    // Check critical alerts
    await this.checkCriticalAlerts(entry.motor_id, entry.category);
  },

  // ============ Attendance ============
  async getAttendance(): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getTechnicianAttendance(techId: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase.from('attendance').select('*').eq('technician_id', techId).order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markAttendance(records: { technician_id: string; date: string; status: string; marked_by: string }[]): Promise<void> {
    // Upsert based on technician + date
    const { error } = await supabase.from('attendance').upsert(
      records.map(r => ({
        technician_id: r.technician_id,
        date: r.date,
        status: r.status,
        marked_by: r.marked_by,
        marked_time: new Date().toISOString(),
      })),
      { onConflict: 'technician_id,date' }
    );
    if (error) throw error;
  },

  // ============ Notifications ============
  async getNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase.from('notifications').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markNotificationSeen(id: string): Promise<void> {
    const { error } = await supabase.from('notifications').update({ status: 'Seen' }).eq('id', id);
    if (error) throw error;
  },

  async markAllSeen(): Promise<void> {
    const { error } = await supabase.from('notifications').update({ status: 'Seen' }).eq('status', 'Unseen');
    if (error) throw error;
  },

  async getUnseenCount(): Promise<number> {
    const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('status', 'Unseen');
    if (error) throw error;
    return count || 0;
  },

  // ============ Critical alert check ============
  async checkCriticalAlerts(motorId: string, category: 'general' | 'powerhouse'): Promise<void> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: repairs } = await supabase
      .from('maintenance_history')
      .select('id')
      .eq('motor_id', motorId)
      .eq('action_type', 'Repair')
      .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

    if (repairs && repairs.length >= 3) {
      const { data: motor } = await supabase.from('motors').select('equipment_name, plant').eq('id', motorId).single();
      if (motor) {
        await supabase.from('notifications').insert({
          motor_id: motorId,
          alert_message: `⚠️ CRITICAL: ${motor.equipment_name} (${motor.plant}) has been repaired ${repairs.length} times in the last 6 months. Consider replacement.`,
          status: 'Unseen',
          recipient_role: 'Both',
          category,
        });
      }
    }
  },
};
