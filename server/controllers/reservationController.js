const pool   = require('../config/database');
const { calcAmount, paginate } = require('../utils/helpers');

// POST /api/reservations
exports.createReservation = async (req, res, next) => {
  try {
    const { parking_id, vehicle_number, vehicle_type, start_time, end_time, notes } = req.body;

    const start = new Date(start_time);
    const end   = new Date(end_time);
    if (start >= end) return res.status(400).json({ success: false, message: 'end_time must be after start_time.' });
    if (start < new Date()) return res.status(400).json({ success: false, message: 'start_time cannot be in the past.' });

    const { rows: pRows } = await pool.query(
      "SELECT * FROM parking_locations WHERE id = $1 AND status = 'approved'",
      [parking_id]
    );
    if (!pRows.length) return res.status(404).json({ success: false, message: 'Parking not available.' });

    const parking = pRows[0];
    if (parking.available_slots <= 0) {
      return res.status(409).json({ success: false, message: 'No available slots at this parking.' });
    }

    const { rows: overlap } = await pool.query(
      `SELECT id FROM reservations
       WHERE user_id = $1 AND vehicle_number = $2
         AND status IN ('pending','confirmed','active')
         AND start_time < $3 AND end_time > $4`,
      [req.user.id, vehicle_number, end_time, start_time]
    );
    if (overlap.length) {
      return res.status(409).json({ success: false, message: 'You already have a reservation that overlaps this time.' });
    }

    const total_amount = calcAmount(parking.hourly_rate, start_time, end_time);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: [{ id }] } = await client.query(
        `INSERT INTO reservations
         (user_id, parking_id, vehicle_number, vehicle_type, start_time, end_time, total_amount, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed',$8)
         RETURNING id`,
        [req.user.id, parking_id, vehicle_number, vehicle_type || 'car', start_time, end_time, total_amount, notes || null]
      );

      await client.query(
        'UPDATE parking_locations SET available_slots = available_slots - 1 WHERE id = $1 AND available_slots > 0',
        [parking_id]
      );

      await client.query('COMMIT');

      const { rows: [newRes] } = await pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
      res.status(201).json({ success: true, message: 'Reservation confirmed!', data: newRes });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/reservations
exports.getUserReservations = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const { offset, limit: lim, page: p } = paginate(page, limit);

    let query  = `
      SELECT r.*, pl.name AS parking_name, pl.address AS parking_address,
             pl.hourly_rate, pl.latitude, pl.longitude
      FROM reservations r
      JOIN parking_locations pl ON pl.id = r.parking_id
      WHERE r.user_id = $1
    `;
    const params = [req.user.id];
    let idx = 2;

    if (status) { query += ` AND r.status = $${idx++}`; params.push(status); }
    query += ` ORDER BY r.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(lim, offset);

    const { rows }  = await pool.query(query, params);
    const { rows: [{ total }] } = await pool.query(
      'SELECT COUNT(*) AS total FROM reservations WHERE user_id = $1', [req.user.id]
    );

    res.json({ success: true, data: rows, pagination: { page: p, limit: lim, total: parseInt(total) } });
  } catch (err) {
    next(err);
  }
};

// GET /api/reservations/:id
exports.getReservationById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, pl.name AS parking_name, pl.address AS parking_address,
              pl.hourly_rate, pl.latitude, pl.longitude,
              u.name AS user_name, u.email AS user_email, u.phone AS user_phone
       FROM reservations r
       JOIN parking_locations pl ON pl.id = r.parking_id
       JOIN users u ON u.id = r.user_id
       WHERE r.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    const reservation = rows[0];
    if (req.user.role === 'driver' && reservation.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/reservations/:id/cancel
exports.cancelReservation = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reservations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Reservation not found.' });

    const reservation = rows[0];
    if (!['pending', 'confirmed'].includes(reservation.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${reservation.status} reservation.` });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("UPDATE reservations SET status = 'cancelled' WHERE id = $1", [req.params.id]);
      await client.query(
        'UPDATE parking_locations SET available_slots = LEAST(available_slots + 1, total_slots) WHERE id = $1',
        [reservation.parking_id]
      );
      await client.query('COMMIT');
      res.json({ success: true, message: 'Reservation cancelled.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// PATCH /api/reservations/:id/entry
exports.markEntry = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.* FROM reservations r
       JOIN parking_locations pl ON pl.id = r.parking_id
       WHERE r.id = $1 AND pl.owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Reservation not found.' });
    if (rows[0].status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Reservation must be confirmed before entry.' });
    }

    await pool.query(
      "UPDATE reservations SET status = 'active', entry_time = NOW() WHERE id = $1",
      [req.params.id]
    );
    res.json({ success: true, message: 'Vehicle entry marked.' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/reservations/:id/exit
exports.markExit = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.* FROM reservations r
       JOIN parking_locations pl ON pl.id = r.parking_id
       WHERE r.id = $1 AND pl.owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Reservation not found.' });
    if (rows[0].status !== 'active') {
      return res.status(400).json({ success: false, message: 'Vehicle must be active (entered) before exit.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        "UPDATE reservations SET status = 'completed', exit_time = NOW() WHERE id = $1",
        [req.params.id]
      );
      await client.query(
        'UPDATE parking_locations SET available_slots = LEAST(available_slots + 1, total_slots) WHERE id = $1',
        [rows[0].parking_id]
      );
      await client.query('COMMIT');
      res.json({ success: true, message: 'Vehicle exit marked. Reservation completed.' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// GET /api/reservations/owner/list
exports.getOwnerReservations = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const { offset, limit: lim, page: p } = paginate(page, limit);

    let query  = `
      SELECT r.*, pl.name AS parking_name, u.name AS user_name, u.phone AS user_phone
      FROM reservations r
      JOIN parking_locations pl ON pl.id = r.parking_id
      JOIN users u ON u.id = r.user_id
      WHERE pl.owner_id = $1
    `;
    const params = [req.user.id];
    let idx = 2;

    if (status) { query += ` AND r.status = $${idx++}`; params.push(status); }
    query += ` ORDER BY r.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(lim, offset);

    const { rows } = await pool.query(query, params);
    const { rows: [{ total }] } = await pool.query(
      `SELECT COUNT(*) AS total FROM reservations r
       JOIN parking_locations pl ON pl.id = r.parking_id WHERE pl.owner_id = $1`,
      [req.user.id]
    );

    res.json({ success: true, data: rows, pagination: { page: p, limit: lim, total: parseInt(total) } });
  } catch (err) {
    next(err);
  }
};
