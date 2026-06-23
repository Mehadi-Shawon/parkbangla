const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate    = require('../middleware/validate');

const pwRules = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required.'),
  ...pwRules,
], validate, ctrl.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
], validate, ctrl.login);

router.get('/me', protect, ctrl.getMe);

router.put('/change-password', protect, [
  body('currentPassword').notEmpty(),
  ...pwRules.map(r => r.replace ? r : body('newPassword').isLength({ min: 6 })),
], ctrl.changePassword);

module.exports = router;
