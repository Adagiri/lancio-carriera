const express = require('express');

const {
  getUserById,
  getLoggedInUser,
  profileSetupStepOne,
  profileSetup,
  getLoggedInUserProfileViews,
  getLoggedInUserDashboardData,
  editNotificationSettingsForUser,
} = require('../controllers/users');
const { protectUser, protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/logged-in-account', protectUser, getLoggedInUser);
router.get('/dashboard-data', protectUser, getLoggedInUserDashboardData);
router.get('/profile-views', protectUser, getLoggedInUserProfileViews);
router.get('/:id', protect, getUserById);

router.put('/profile-setup', protectUser, profileSetup);
router.put(
  '/edit-notification-settings',
  protectUser,
  editNotificationSettingsForUser
);

module.exports = router;
