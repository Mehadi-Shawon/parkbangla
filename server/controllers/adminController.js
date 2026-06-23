const pool = require('../config/database');
const { paginate } = require('../utils/helpers');

// GET /api/admin/stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { rows: [users] } = await pool.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE role = 'driver') AS drivers,
              COUNT(*) FILTER (WHERE role = 'owner')  AS owners
       FROM users WHERE role != 'admin'`
    );

    const { rows: [parkings] } = await pool.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'approved') AS approved,
              COUNT(*) FILTER (WHERE status = 'pending')  AS pending
       FROM parking_locations`
    );

    const { rows: [resv] } = await pool.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'active') AS active,
              COALESCE(SUM(CASE WHEN status IN ('completed','active') THEN total_amount ELSE 0 END), 0) AS revenue
       FROM reservations`
    );

    const { rows: chart } = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM reservations
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: {
        users:    { total: parseInt(users.total), drivers: parseInt(users.drivers), owners: parseInt(users.owners) },
        parkings: { total: parseInt(parkings.total), approved: parseInt(parkings.approved), pending: parseInt(parkings.pending) },
        reservations: { total: parseInt(resv.total), active: parseInt(resv.active), revenue: resv.revenue },
        chart,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search, page, limit } = req.query;
    const { offset, limit: lim, page: p } = paginate(page, limit);

    let query  = 'SELECT id, name, email, phone, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    let idx = 1;

    if (role)   { query += ` AND role = $${idx++}`;                                          params.push(role); }
    if (search) { query += ` AND (name ILIKE $${idx} OR email ILIKE $${idx+1})`; const l = `%${search}%`; params.push(l, l); idx += 2; }

    query += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(lim, offset);

    const { rows } = await pool.query(query, params);
    const { rows: [{ total }] } = await pool.query('SELECT COUNT(*) AS total FROM users');
    res.json({ success: true, data: rows, pagination: { page: p, limit: lim, total: parseInt(total) } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/status
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot change your own status.' });
    }
    await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [Boolean(is_active), req.params.id]);
    res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'}.` });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/parking
exports.getAllParkingsAdmin = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const { offset, limit: lim, page: p } = paginate(page, limit);

    let query  = `
      SELECT pl.*, u.name AS owner_name, u.email AS owner_email
      FROM parking_locations pl JOIN users u ON u.id = pl.owner_id WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { query += ` AND pl.status = $${idx++}`; params.push(status); }
    query += ` ORDER BY pl.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(lim, offset);

    const { rows } = await pool.query(query, params);
    const { rows: [{ total }] } = await pool.query('SELECT COUNT(*) AS total FROM parking_locations');
    res.json({ success: true, data: rows, pagination: { page: p, limit: lim, total: parseInt(total) } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/parking/:id/status
exports.updateParkingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['approved', 'rejected', 'inactive', 'pending'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    const { rows } = await pool.query('SELECT id FROM parking_locations WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Parking not found.' });

    await pool.query('UPDATE parking_locations SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true, message: `Parking status set to '${status}'.` });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/reservations
exports.getAllReservations = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const { offset, limit: lim, page: p } = paginate(page, limit);

    let query  = `
      SELECT r.*, pl.name AS parking_name, u.name AS user_name, u.email AS user_email
      FROM reservations r
      JOIN parking_locations pl ON pl.id = r.parking_id
      JOIN users u ON u.id = r.user_id WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (status) { query += ` AND r.status = $${idx++}`; params.push(status); }
    query += ` ORDER BY r.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(lim, offset);

    const { rows } = await pool.query(query, params);
    const { rows: [{ total }] } = await pool.query('SELECT COUNT(*) AS total FROM reservations');
    res.json({ success: true, data: rows, pagination: { page: p, limit: lim, total: parseInt(total) } });
  } catch (err) {
    next(err);
  }
};
