const express = require('express');

const {
  registerWithEmail,
  registerWithGoogle,
  verifyEmail,
  loginWithEmail,
  loginWithGoogle,
  deleteAccount,
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

module.exports = router;
