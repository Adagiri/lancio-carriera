const express = require('express');

const {
  getCompanyById,
  getLoggedInCompany,
  profileSetup,
  updateProfile,
  getLoggedInCompanyDashboardData,
  editNotificationSettingsForCompany,
  getNotificationsForCompany,
  markNotificationAsRead,
  reportACompany,
  getAcceptedApplicants,
} = require('../controllers/companies');
const { protectCompany, protectUser, protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/dashboard-data', protectCompany, getLoggedInCompanyDashboardData);
router.get('/logged-in-account', protectCompany, getLoggedInCompany);
router.get('/notifications', protectCompany, getNotificationsForCompany);
router.get('/get-accepted-applicants', protectCompany, getAcceptedApplicants);
router.get('/:id', protect, getCompanyById);

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
