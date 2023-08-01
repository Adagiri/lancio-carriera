const express = require('express');

const {
  getLoggedInCompany,
  profileSetup,
  getLoggedInCompanyDashboardData,
  editNotificationSettingsForCompany,
} = require('../controllers/companies');
const { protectCompany } = require('../middlewares/auth');
const router = express.Router();

router.get('/dashboard-data', protectCompany, getLoggedInCompanyDashboardData);
router.get('/logged-in-account', protectCompany, getLoggedInCompany);
router.put('/profile-setup', protectCompany, profileSetup);

router.put(
  '/edit-notification-settings',
  protectCompany,
  editNotificationSettingsForCompany
);

module.exports = router;
