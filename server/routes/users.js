const router = require('express').Router();
const ctrl   = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/profile',         protect, ctrl.getProfile);
router.put('/profile',         protect, ctrl.updateProfile);
router.get('/vehicles',        protect, ctrl.getVehicles);
router.post('/vehicles',       protect, ctrl.addVehicle);
router.delete('/vehicles/:id', protect, ctrl.deleteVehicle);

module.exports = router;
