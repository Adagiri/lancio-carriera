const express = require('express');

const {
  register,
  login,
  sendResetPasswordLink,
  resetPassword,
  getAdmins,
  getAdmin,
  createAdmin,
  deleteAccount,
  deleteAccountByEmail,
  deleteAdminAccount,
} = require('../controllers/admins.js');
const { protectAdmin, authorize } = require('../middlewares/auth');
const router = express.Router();

router.get('/', protectAdmin, getAdmins);
router.get('/:adminId', protectAdmin, getAdmin);

router.post('/register', register);
router.post('/login', login);
router.post('/send-reset-password-link', sendResetPasswordLink);
router.post('/reset-password', resetPassword);

router.post('/create', protectAdmin, authorize('master'), createAdmin);

router.delete('/', protectAdmin, deleteAccount);
router.delete('/by-email', deleteAccountByEmail);
router.delete(
  '/fellow-admin',
  protectAdmin,
  authorize('master'),
  deleteAdminAccount
);

module.exports = router;
