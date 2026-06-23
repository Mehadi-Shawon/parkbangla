const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const admin = [protect, authorize('admin')];

router.get('/stats',                  ...admin, ctrl.getDashboardStats);
router.get('/users',                  ...admin, ctrl.getAllUsers);
router.patch('/users/:id/status',     ...admin, ctrl.updateUserStatus);
router.get('/parking',                ...admin, ctrl.getAllParkingsAdmin);
router.patch('/parking/:id/status',   ...admin, ctrl.updateParkingStatus);
router.get('/reservations',           ...admin, ctrl.getAllReservations);

module.exports = router;
