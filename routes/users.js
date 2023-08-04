const express = require('express');

const {
  getUserById,
  getLoggedInUser,
  profileSetup,
  getLoggedInUserProfileViews,
  getLoggedInUserDashboardData,
  editNotificationSettingsForUser,
  getNotificationsForUser,
  markNotificationAsRead,
  updateProfile,
} = require('../controllers/users');
const { protectUser, protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/logged-in-account', protectUser, getLoggedInUser);
router.get('/dashboard-data', protectUser, getLoggedInUserDashboardData);
router.get('/profile-views', protectUser, getLoggedInUserProfileViews);
router.get('/notifications', protectUser, getNotificationsForUser);
router.get('/:id', protect, getUserById);

router.put('/profile-setup', protectUser, profileSetup);
router.put('/update-profile', protectUser, updateProfile);
router.put(
  '/edit-notification-settings',
  protectUser,
  editNotificationSettingsForUser
);
router.put('/mark-notification', protectUser, markNotificationAsRead);

module.exports = router;
