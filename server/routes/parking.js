const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/parkingController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const parkingRules = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('address').trim().notEmpty().withMessage('Address is required.'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required.'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required.'),
  body('total_slots').isInt({ min: 1 }).withMessage('total_slots must be a positive integer.'),
  body('hourly_rate').isFloat({ min: 0 }).withMessage('hourly_rate must be non-negative.'),
];

router.get('/',          ctrl.getAllParking);
router.get('/owner/my',  protect, authorize('owner'), ctrl.getOwnerParkings);
router.get('/owner/stats', protect, authorize('owner'), ctrl.getOwnerStats);
router.get('/:id',       ctrl.getParkingById);

router.post('/', protect, authorize('owner', 'admin'), parkingRules, validate, ctrl.createParking);
router.put('/:id', protect, authorize('owner', 'admin'), ctrl.updateParking);
router.patch('/:id/availability', protect, authorize('owner'), [
  body('available_slots').isInt({ min: 0 }).withMessage('available_slots must be non-negative.'),
], validate, ctrl.updateAvailability);
router.delete('/:id', protect, authorize('owner', 'admin'), ctrl.deleteParking);

module.exports = router;
