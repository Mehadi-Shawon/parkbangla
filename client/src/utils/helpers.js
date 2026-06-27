import { format, formatDistanceToNow, parseISO, differenceInHours } from 'date-fns';

export const formatDate = (date) =>
  date ? format(new Date(date), 'MMM d, yyyy') : '—';

export const formatDateTime = (date) =>
  date ? format(new Date(date), 'MMM d, yyyy h:mm a') : '—';

export const timeAgo = (date) =>
  date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '—';

export const calcHours = (start, end) => {
  const h = differenceInHours(new Date(end), new Date(start));
  return Math.max(h, 1);
};

export const calcAmount = (hourlyRate, startTime, endTime) => {
  const hours = (new Date(endTime) - new Date(startTime)) / 3_600_000;
  return Math.max(parseFloat((hours * parseFloat(hourlyRate)).toFixed(2)), parseFloat(hourlyRate));
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(amount ?? 0);

export const statusColor = (status) => {
  const map = {
    pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-400',
    active:    'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400',
    completed: 'bg-gray-100   text-gray-700   dark:bg-gray-700      dark:text-gray-300',
    cancelled: 'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400',
    approved:  'bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-400',
    rejected:  'bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-400',
    inactive:  'bg-gray-100   text-gray-700   dark:bg-gray-700      dark:text-gray-300',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

export const availabilityColor = (available, total) => {
  if (!total) return 'text-gray-500';
  const pct = available / total;
  if (pct === 0)    return 'text-red-600';
  if (pct < 0.25)   return 'text-orange-500';
  if (pct < 0.5)    return 'text-yellow-500';
  return 'text-green-600';
};

export const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export const extractError = (err) => {
  const msg = err?.response?.data?.message || err?.message;
  if (!msg || msg === '{}' || msg === '[]') return 'Something went wrong. Please try again.';
  return msg;
};
