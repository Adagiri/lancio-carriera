const express = require('express');

const {
  getLoggedInCompany,
  profileSetup,
  updateProfile,
  getLoggedInCompanyDashboardData,
  editNotificationSettingsForCompany,
  getNotificationsForCompany,
  markNotificationAsRead,
  reportACompany,
} = require('../controllers/companies');
const { protectCompany, protectUser } = require('../middlewares/auth');
const router = express.Router();

router.get('/dashboard-data', protectCompany, getLoggedInCompanyDashboardData);
router.get('/logged-in-account', protectCompany, getLoggedInCompany);
router.get('/notifications', protectCompany, getNotificationsForCompany);
router.put('/profile-setup', protectCompany, profileSetup);
router.put('/update-profile', protectCompany, updateProfile);
router.post('/report', protectUser, reportACompany);

router.put(
  '/edit-notification-settings',
  protectCompany,
  editNotificationSettingsForCompany
);

router.put('/mark-notification', protectCompany, markNotificationAsRead);

module.exports = router;
