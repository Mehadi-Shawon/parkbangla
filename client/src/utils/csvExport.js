/**
 * Generic CSV download utility.
 *
 * Usage:
 *   downloadCSV(users, [
 *     { label: 'Name',  value: u => u.name },
 *     { label: 'Email', value: u => u.email },
 *   ], 'users.csv');
 */
export const downloadCSV = (data, columns, filename = 'export.csv') => {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const header = columns.map(c => escape(c.label)).join(',');
  const rows   = data.map(row =>
    columns.map(c => escape(c.value(row))).join(',')
  );

  const csv  = [header, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const USER_COLUMNS = [
  { label: 'ID',       value: u => u.id },
  { label: 'Name',     value: u => u.name },
  { label: 'Email',    value: u => u.email },
  { label: 'Phone',    value: u => u.phone || '' },
  { label: 'Role',     value: u => u.role },
  { label: 'Status',   value: u => u.is_active ? 'Active' : 'Inactive' },
  { label: 'Joined',   value: u => new Date(u.created_at).toLocaleDateString() },
];

export const RESERVATION_COLUMNS = [
  { label: 'ID',           value: r => r.id },
  { label: 'Driver',       value: r => r.driver?.name || r.user_name || '' },
  { label: 'Email',        value: r => r.driver?.email || r.user_email || '' },
  { label: 'Parking',      value: r => r.parking?.name || r.parking_name || '' },
  { label: 'Vehicle',      value: r => r.vehicle_number },
  { label: 'Start',        value: r => new Date(r.start_time).toLocaleString() },
  { label: 'End',          value: r => new Date(r.end_time).toLocaleString() },
  { label: 'Amount (USD)', value: r => r.total_amount || 0 },
  { label: 'Status',       value: r => r.status },
];

export const PARKING_COLUMNS = [
  { label: 'ID',          value: p => p.id },
  { label: 'Name',        value: p => p.name },
  { label: 'Address',     value: p => p.address },
  { label: 'Owner',       value: p => p.owner?.name || '' },
  { label: 'Total Slots', value: p => p.total_slots },
  { label: 'Available',   value: p => p.available_slots },
  { label: 'Rate/hr',     value: p => p.hourly_rate },
  { label: 'Status',      value: p => p.status },
];
