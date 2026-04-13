export interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'technician';
  full_name: string;
  dp_no: string;
  created_at: string;
}

export interface Motor {
  id: string;
  sl_no: number;
  plant: string;
  equipment_name: string;
  reason: string;
  date: string;
  make: string;
  kw: number;
  hp: number;
  rpm: number;
  condition: 'Running' | 'Repair' | 'Rewind' | 'Replacement' | 'Standby' | 'Faulty';
  mounting: string;
  last_updated: string;
  category: 'general' | 'powerhouse';
}

export interface MaintenanceHistory {
  id: string;
  motor_id: string;
  action_type: 'Repair' | 'Rewind' | 'Replacement';
  reason: string;
  date: string;
  technician_id: string;
  remarks: string;
  category: 'general' | 'powerhouse';
}

export interface AttendanceRecord {
  id: string;
  technician_id: string;
  date: string;
  status: 'A' | 'B' | 'C' | 'D' | 'H' | 'L' | 'OD' | 'OFF' | 'AB';
  marked_by: string;
  marked_time: string;
}

export interface Notification {
  id: string;
  motor_id: string;
  alert_message: string;
  date: string;
  status: 'Seen' | 'Unseen';
  recipient_role: 'Admin' | 'Technician' | 'Both';
  category: 'general' | 'powerhouse';
}
