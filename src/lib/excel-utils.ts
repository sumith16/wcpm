import * as XLSX from 'xlsx';
import type { Motor, MaintenanceHistory, AttendanceRecord } from './types';

// Case-insensitive header lookup
function findValue(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    const found = rowKeys.find(k => k.toLowerCase().trim() === key.toLowerCase().trim());
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return row[found];
  }
  for (const key of keys) {
    const found = rowKeys.find(k =>
      k.toLowerCase().trim().includes(key.toLowerCase().trim()) ||
      key.toLowerCase().trim().includes(k.toLowerCase().trim())
    );
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== '') return row[found];
  }
  return undefined;
}

function toNumber(val: unknown): number {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).trim();
  const match = str.match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

export function parseMotorExcel(file: File, category: 'general' | 'powerhouse'): Promise<Omit<Motor, 'id'>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        const motors = json.map((row, idx) => ({
          sl_no: toNumber(findValue(row, 'SL.NO.', 'SL.NO', 'SLNO', 'slNo', 'Sl No', 'S.No', 'Sl.No.', 'Sr No')) || (idx + 1),
          plant: String(findValue(row, 'PLANT', 'Plant', 'plant') || ''),
          equipment_name: String(findValue(row, 'NAME OF EQUIPMENT', 'Equipment Name', 'equipmentName', 'EQUIPMENT NAME', 'Name of Equipment') || ''),
          reason: String(findValue(row, 'Reason', 'reason', 'REASON') || ''),
          date: String(findValue(row, 'Date', 'date', 'DATE') || new Date().toISOString().split('T')[0]),
          make: String(findValue(row, 'Make', 'make', 'MAKE') || ''),
          kw: toNumber(findValue(row, 'KW', 'kw', 'Kw')),
          hp: toNumber(findValue(row, 'HP', 'hp', 'Hp')),
          rpm: toNumber(findValue(row, 'RPM', 'rpm', 'Rpm')),
          condition: (String(findValue(row, 'Motor Condition', 'condition', 'Condition', 'MOTOR CONDITION', 'Motor\nCondition') || 'Standby')) as Motor['condition'],
          mounting: String(findValue(row, 'Mounting', 'mounting', 'MOUNTING') || ''),
          last_updated: new Date().toISOString().split('T')[0],
          category,
        }));
        resolve(motors);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function exportMotorsToExcel(motors: Motor[], filename: string) {
  const data = motors.map(m => ({
    'SL.NO.': m.sl_no,
    'Plant': m.plant,
    'NAME OF EQUIPMENT': m.equipment_name,
    'Reason': m.reason,
    'Date': m.date,
    'Make': m.make,
    'KW': m.kw,
    'HP': m.hp,
    'RPM': m.rpm,
    'Motor Condition': m.condition,
    'Mounting': m.mounting,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Motor Register');
  XLSX.writeFile(wb, filename);
}

export function exportHistoryToExcel(
  history: MaintenanceHistory[],
  filename: string,
  motorNames?: Record<string, string>,
  technicianNames?: Record<string, string>,
) {
  const data = history.map(h => ({
    'Equipment Name': motorNames?.[h.motor_id] || h.motor_id,
    'Action': h.action_type,
    'Reason': h.reason,
    'Date': h.date,
    'Technician': technicianNames?.[h.technician_id] || h.technician_id,
    'Remarks': h.remarks,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Maintenance History');
  XLSX.writeFile(wb, filename);
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export async function exportAttendanceToExcel(
  attendance: AttendanceRecord[],
  technicianNames: Record<string, string>,
  technicianDpNos: Record<string, string>,
  filename: string,
  month: number,
  year: number
) {
  const ExcelJS = await import('exceljs');
  const { saveAs } = await import('file-saver');

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Attendance');

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month).toLocaleString('en', { month: 'long' }).toUpperCase();
  const totalCols = 3 + daysInMonth;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month, daysInMonth);
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

  const headerStyle = {
    font: { bold: true, size: 9 },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } },
  };
  const cellStyle = {
    font: { size: 9 },
    alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
    border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } },
  };
  const cellLeftStyle = {
    font: { size: 9 },
    alignment: { horizontal: 'left' as const, vertical: 'middle' as const },
    border: { top: { style: 'thin' as const }, bottom: { style: 'thin' as const }, left: { style: 'thin' as const }, right: { style: 'thin' as const } },
  };

  ws.getColumn(1).width = 6;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 18;
  for (let d = 1; d <= daysInMonth; d++) ws.getColumn(3 + d).width = 6.5;

  const r1 = ws.addRow(['West Coast Paper Mills Ltd, Dandeli.']);
  ws.mergeCells(1, 1, 1, totalCols);
  r1.getCell(1).font = { bold: true, size: 12 };
  r1.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r1.height = 24;

  ws.addRow([]);

  const r3 = ws.addRow([`WEEKLY ATTENDENCE FROM ${fmt(firstDay)} TO ${fmt(lastDay)} FOR THE MONTH OF ${monthName} – ${year}`]);
  ws.mergeCells(3, 1, 3, totalCols);
  r3.getCell(1).font = { bold: true, size: 10 };
  r3.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  r3.height = 22;

  ws.addRow([]);

  const r5 = ws.addRow([]);
  const fromEndCol = Math.floor(totalCols / 2);
  ws.mergeCells(5, 1, 5, fromEndCol);
  r5.getCell(1).value = 'From : ELECTRICAL DEPARTMENT.';
  r5.getCell(1).font = { bold: true, size: 10 };
  r5.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.mergeCells(5, fromEndCol + 1, 5, totalCols);
  r5.getCell(fromEndCol + 1).value = 'TO: STAFF PAYROLL';
  r5.getCell(fromEndCol + 1).font = { bold: true, size: 10 };
  r5.getCell(fromEndCol + 1).alignment = { horizontal: 'right', vertical: 'middle' };
  r5.height = 20;

  ws.addRow([]);

  const dayRow: (string | null)[] = ['', '', ''];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    dayRow.push(DAY_NAMES[date.getDay()]);
  }
  const r7 = ws.addRow(dayRow);
  r7.height = 18;
  for (let c = 4; c <= totalCols; c++) r7.getCell(c).style = headerStyle;

  const numRow: (string | number)[] = ['S.No', 'DP.NO', 'NAME'];
  for (let d = 1; d <= daysInMonth; d++) numRow.push(d);
  const r8 = ws.addRow(numRow);
  r8.height = 18;
  for (let c = 1; c <= totalCols; c++) r8.getCell(c).style = headerStyle;

  const techIds = Object.keys(technicianNames);
  techIds.forEach((techId, idx) => {
    const rowData: (string | number)[] = [idx + 1, technicianDpNos[techId] || '', technicianNames[techId] || ''];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = attendance.find(a => a.technician_id === techId && a.date === dateStr);
      rowData.push(record ? record.status : '');
    }
    const dataRow = ws.addRow(rowData);
    dataRow.getCell(1).style = cellStyle;
    dataRow.getCell(2).style = cellStyle;
    dataRow.getCell(3).style = cellLeftStyle;
    for (let c = 4; c <= totalCols; c++) dataRow.getCell(c).style = cellStyle;
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}
