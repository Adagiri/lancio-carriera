const express = require('express');

const {
  getUserById,
  getLoggedInUser,
  profileSetupStepOne,
  profileSetupStepTwo,
  profileSetupStepThree,
  profileSetupStepFour,
  profileSetup,
  getLoggedInUserProfileViews,
  getLoggedInUserDashboardData,
} = require('../controllers/users');
const { protectUser, protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/logged-in-account', protectUser, getLoggedInUser);
router.get('/dashboard-data', protectUser, getLoggedInUserDashboardData);
router.get('/profile-views', protectUser, getLoggedInUserProfileViews);
router.get('/:id', protect, getUserById);

router.put('/profile-setup/1', protectUser, profileSetupStepOne);
router.put('/profile-setup', protectUser, profileSetup);
router.put('/profile-setup/2', protectUser, profileSetupStepTwo);
router.put('/profile-setup/3', protectUser, profileSetupStepThree);
router.put('/profile-setup/4', protectUser, profileSetupStepFour);

module.exports = router;
