const jwt = require('jsonwebtoken');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/** Haversine distance in kilometres */
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calcAmount = (hourlyRate, startTime, endTime) => {
  const hours = (new Date(endTime) - new Date(startTime)) / 3_600_000;
  return Math.max(parseFloat((hours * hourlyRate).toFixed(2)), hourlyRate);
};

const paginate = (page = 1, limit = 10) => {
  const p = Math.max(parseInt(page),  1);
  const l = Math.min(parseInt(limit), 100);
  return { offset: (p - 1) * l, limit: l, page: p };
};

module.exports = { generateToken, getDistance, calcAmount, paginate };
