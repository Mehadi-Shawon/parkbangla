const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/reservationController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/', protect, authorize('driver'), [
  body('parking_id').isInt({ min: 1 }).withMessage('Valid parking_id required.'),
  body('vehicle_number').trim().notEmpty().withMessage('Vehicle number is required.'),
  body('start_time').isISO8601().withMessage('Valid start_time required.'),
  body('end_time').isISO8601().withMessage('Valid end_time required.'),
], validate, ctrl.createReservation);

router.get('/',                    protect, authorize('driver'),           ctrl.getUserReservations);
router.get('/owner/list',          protect, authorize('owner'),            ctrl.getOwnerReservations);
router.get('/:id',                 protect,                                ctrl.getReservationById);
router.patch('/:id/cancel',        protect, authorize('driver'),           ctrl.cancelReservation);
router.patch('/:id/entry',         protect, authorize('owner'),            ctrl.markEntry);
router.patch('/:id/exit',          protect, authorize('owner'),            ctrl.markExit);

module.exports = router;
