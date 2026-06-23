const pool   = require('../config/database');
const { getDistance, paginate } = require('../utils/helpers');

// GET /api/parking
exports.getAllParking = async (req, res, next) => {
  try {
    const { lat, lng, radius = 50, search, page, limit } = req.query;
    const { offset, limit: lim, page: p } = paginate(page, limit);

    let query  = `
      SELECT pl.*, u.name AS owner_name, u.phone AS owner_phone
      FROM parking_locations pl
      JOIN users u ON u.id = pl.owner_id
      WHERE pl.status = 'approved'
    `;
    const params = [];
    let idx = 1;

    if (search) {
      query += ` AND (pl.name ILIKE $${idx} OR pl.address ILIKE $${idx+1} OR pl.city ILIKE $${idx+2})`;
      const like = `%${search}%`;
      params.push(like, like, like);
      idx += 3;
    }

    query += ` ORDER BY pl.available_slots DESC LIMIT $${idx} OFFSET $${idx+1}`;
    params.push(lim, offset);

    const { rows } = await pool.query(query, params);

    let locations = rows;
    if (lat && lng) {
      locations = rows
        .map(r => ({
          ...r,
          distance: getDistance(parseFloat(lat), parseFloat(lng), parseFloat(r.latitude), parseFloat(r.longitude)),
        }))
        .filter(r => r.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);
    }

    const { rows: [{ total }] } = await pool.query(
      "SELECT COUNT(*) AS total FROM parking_locations WHERE status = 'approved'"
    );

    res.json({
      success: true,
      data: locations,
      pagination: { page: p, limit: lim, total: parseInt(total), pages: Math.ceil(total / lim) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/parking/:id
exports.getParkingById = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pl.*, u.name AS owner_name, u.phone AS owner_phone, u.email AS owner_email
       FROM parking_locations pl
       JOIN users u ON u.id = pl.owner_id
       WHERE pl.id = $1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Parking location not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /api/parking
exports.createParking = async (req, res, next) => {
  try {
    const {
      name, address, city, state, latitude, longitude,
      total_slots, hourly_rate, description, amenities,
      opening_time, closing_time,
    } = req.body;

    const { rows: [{ id }] } = await pool.query(
      `INSERT INTO parking_locations
       (owner_id, name, address, city, state, latitude, longitude,
        total_slots, available_slots, hourly_rate, description, amenities,
        opening_time, closing_time, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
       RETURNING id`,
      [
        req.user.id, name, address, city || null, state || null,
        latitude, longitude, total_slots, total_slots,
        hourly_rate, description || null,
        amenities ? JSON.stringify(amenities) : null,
        opening_time || '00:00', closing_time || '23:59',
      ]
    );

    const { rows: [newParking] } = await pool.query('SELECT * FROM parking_locations WHERE id = $1', [id]);
    res.status(201).json({ success: true, message: 'Parking location submitted for approval.', data: newParking });
  } catch (err) {
    next(err);
  }
};

// PUT /api/parking/:id
exports.updateParking = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM parking_locations WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Parking not found.' });

    const parking = rows[0];
    if (req.user.role !== 'admin' && parking.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const {
      name, address, city, state, latitude, longitude,
      total_slots, hourly_rate, description, amenities,
      opening_time, closing_time,
    } = req.body;

    const newTotal  = total_slots  ?? parking.total_slots;
    const slotDiff  = newTotal - parking.total_slots;
    const newAvail  = Math.max(0, parking.available_slots + slotDiff);

    await pool.query(
      `UPDATE parking_locations SET
        name=$1, address=$2, city=$3, state=$4,
        latitude=$5, longitude=$6,
        total_slots=$7, available_slots=$8,
        hourly_rate=$9, description=$10, amenities=$11,
        opening_time=$12, closing_time=$13
       WHERE id=$14`,
      [
        name         ?? parking.name,
        address      ?? parking.address,
        city         ?? parking.city,
        state        ?? parking.state,
        latitude     ?? parking.latitude,
        longitude    ?? parking.longitude,
        newTotal,    newAvail,
        hourly_rate  ?? parking.hourly_rate,
        description  ?? parking.description,
        amenities ? JSON.stringify(amenities) : parking.amenities,
        opening_time ?? parking.opening_time,
        closing_time ?? parking.closing_time,
        req.params.id,
      ]
    );

    const { rows: [updated] } = await pool.query('SELECT * FROM parking_locations WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Parking updated.', data: updated });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/parking/:id/availability
exports.updateAvailability = async (req, res, next) => {
  try {
    const { available_slots } = req.body;
    const { rows } = await pool.query(
      'SELECT * FROM parking_locations WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Parking not found or not yours.' });

    const parking = rows[0];
    if (available_slots < 0 || available_slots > parking.total_slots) {
      return res.status(400).json({ success: false, message: `available_slots must be between 0 and ${parking.total_slots}.` });
    }

    await pool.query('UPDATE parking_locations SET available_slots = $1 WHERE id = $2', [available_slots, req.params.id]);
    res.json({ success: true, message: 'Availability updated.', data: { available_slots } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/parking/:id
exports.deleteParking = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM parking_locations WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Parking not found.' });

    if (req.user.role !== 'admin' && rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await pool.query('DELETE FROM parking_locations WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Parking location deleted.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/parking/owner/my
exports.getOwnerParkings = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM parking_locations WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/parking/owner/stats
exports.getOwnerStats = async (req, res, next) => {
  try {
    const { rows: [locStats] } = await pool.query(
      `SELECT COUNT(*) AS total_locations,
              COALESCE(SUM(total_slots), 0) AS total_slots,
              COALESCE(SUM(available_slots), 0) AS available_slots
       FROM parking_locations WHERE owner_id = $1 AND status = 'approved'`,
      [req.user.id]
    );

    const { rows: idRows } = await pool.query(
      "SELECT id FROM parking_locations WHERE owner_id = $1 AND status = 'approved'",
      [req.user.id]
    );
    const ids = idRows.map(r => r.id);

    let resStats = { total_reservations: 0, active_reservations: 0, total_revenue: 0 };
    if (ids.length) {
      const { rows: [rs] } = await pool.query(
        `SELECT COUNT(*) AS total_reservations,
                COUNT(*) FILTER (WHERE status = 'active') AS active_reservations,
                COALESCE(SUM(CASE WHEN status IN ('completed','active') THEN total_amount ELSE 0 END), 0) AS total_revenue
         FROM reservations WHERE parking_id = ANY($1)`,
        [ids]
      );
      resStats = rs;
    }

    res.json({ success: true, data: { ...locStats, ...resStats } });
  } catch (err) {
    next(err);
  }
};
