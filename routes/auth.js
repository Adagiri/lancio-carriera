const express = require('express');

const {
  sendResetPasswordCode,
  verifyResetPasswordCode,
  registerWithEmail,
  registerWithGoogle,
  verifyEmail,
  loginWithEmail,
  loginWithGoogle,
  deleteAccount,
  resetPassword,
} = require('../controllers/auth');
const advancedResults = require('../middlewares/advancedResults');
const { protect, admin } = require('../middlewares/auth');
const router = express.Router();

router.post('/account/email', registerWithEmail);
router.post('/account/google', registerWithGoogle);
router.post('/account/verify', verifyEmail);
router.post('/session/email', loginWithEmail);
router.post('/session/google', loginWithGoogle);
router.post('/delete', deleteAccount);
router.post('/reset-password/send-code', sendResetPasswordCode);
router.post('/reset-password/verify-code', verifyResetPasswordCode);
router.post('/reset-password/set-password', resetPassword);

module.exports = router;
