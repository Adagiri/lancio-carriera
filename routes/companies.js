const express = require('express');

const {
  getLoggedInCompany,
  profileSetup,
  profileSetupStepOne,
  profileSetupStepTwo,
  profileSetupStepThree,
  getLoggedInCompanyDashboardData,
} = require('../controllers/companies');
const { protectCompany } = require('../middlewares/auth');
const router = express.Router();


router.get('/dashboard-data', protectCompany, getLoggedInCompanyDashboardData);
router.get('/logged-in-account', protectCompany, getLoggedInCompany);
router.put('/profile-setup', protectCompany, profileSetup);
router.put('/profile-setup/1', protectCompany, profileSetupStepOne);
router.put('/profile-setup/2', protectCompany, profileSetupStepTwo);
router.put('/profile-setup/3', protectCompany, profileSetupStepThree);

module.exports = router;
