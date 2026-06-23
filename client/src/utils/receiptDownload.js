import { formatCurrency, formatDateTime } from './helpers';

export const downloadReceipt = (booking, parking) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>ParkBangla Receipt #${String(booking.id).padStart(4,'0')}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif; background:#f8fafc; color:#1e293b; padding:40px 20px; }
    .receipt { max-width:480px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.10); }
    .header { background:linear-gradient(135deg,#1e1b4b,#4338ca); padding:32px 28px; text-align:center; }
    .header h1 { color:#fff; font-size:22px; font-weight:800; }
    .header p { color:rgba(255,255,255,0.6); font-size:13px; margin-top:4px; }
    .badge { display:inline-block; background:rgba(255,255,255,0.15); color:#fff; border:1px solid rgba(255,255,255,0.3); border-radius:50px; padding:4px 16px; font-size:13px; font-weight:700; margin-top:12px; }
    .body { padding:24px 28px; }
    .section-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; margin-bottom:10px; margin-top:20px; }
    .row { display:flex; justify-content:space-between; align-items:flex-start; padding:8px 0; border-bottom:1px solid #f1f5f9; }
    .row:last-child { border:none; }
    .row .label { font-size:13px; color:#64748b; }
    .row .value { font-size:13px; font-weight:600; color:#1e293b; text-align:right; max-width:260px; }
    .total-row { background:linear-gradient(135deg,#eef2ff,#f5f3ff); border-radius:12px; padding:16px; margin-top:16px; display:flex; justify-content:space-between; align-items:center; }
    .total-row .t-label { font-size:14px; font-weight:700; color:#4338ca; }
    .total-row .t-value { font-size:24px; font-weight:800; color:#4338ca; }
    .status { display:inline-block; background:#dcfce7; color:#16a34a; border:1px solid #bbf7d0; border-radius:50px; padding:2px 12px; font-size:11px; font-weight:700; text-transform:capitalize; }
    .footer { background:#f8fafc; padding:16px 28px; text-align:center; border-top:1px solid #f1f5f9; }
    .footer p { font-size:11px; color:#94a3b8; }
    @media print {
      body { background:#fff; padding:0; }
      .receipt { box-shadow:none; border-radius:0; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>ParkBangla</h1>
      <p>Parking Receipt</p>
      <div class="badge">Booking #${String(booking.id).padStart(4,'0')}</div>
    </div>
    <div class="body">
      <div class="section-title">Parking Location</div>
      <div class="row"><span class="label">Name</span><span class="value">${parking?.name || booking.parking_name || '--'}</span></div>
      <div class="row"><span class="label">Address</span><span class="value">${parking?.address || booking.parking_address || '--'}</span></div>

      <div class="section-title">Vehicle</div>
      <div class="row"><span class="label">Plate Number</span><span class="value">${booking.vehicle_number}</span></div>
      <div class="row"><span class="label">Vehicle Type</span><span class="value" style="text-transform:capitalize">${booking.vehicle_type || '--'}</span></div>

      <div class="section-title">Reservation</div>
      <div class="row"><span class="label">Booking ID</span><span class="value">#${String(booking.id).padStart(4,'0')}</span></div>
      <div class="row"><span class="label">Status</span><span class="value"><span class="status">${booking.status}</span></span></div>
      <div class="row"><span class="label">Check-in</span><span class="value">${formatDateTime(booking.start_time)}</span></div>
      <div class="row"><span class="label">Check-out</span><span class="value">${formatDateTime(booking.end_time)}</span></div>
      <div class="row"><span class="label">Issued</span><span class="value">${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</span></div>

      <div class="total-row">
        <span class="t-label">Total Amount</span>
        <span class="t-value">${formatCurrency(booking.total_amount)}</span>
      </div>
    </div>
    <div class="footer">
      <p>Thank you for using ParkBangla &bull; support@parkeasy.com</p>
      <p style="margin-top:4px">Keep this receipt for your records</p>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=600,height=800');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};
