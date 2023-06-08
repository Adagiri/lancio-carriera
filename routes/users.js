const express = require('express');

const {
  getUser,
  getLoggedInUser,
  profileSetupStepOne,
  profileSetupStepTwo,
  profileSetupStepThree,
  profileSetupStepFour,
  profileSetup,
} = require('../controllers/users');
const { protectUser } = require('../middlewares/auth');
const router = express.Router();

router.get('/logged-in-account', protectUser, getLoggedInUser);
router.put('/profile-setup/1', protectUser, profileSetupStepOne);
router.put('/profile-setup', protectUser, profileSetup);
router.put('/profile-setup/2', protectUser, profileSetupStepTwo);
router.put('/profile-setup/3', protectUser, profileSetupStepThree);
router.put('/profile-setup/4', protectUser, profileSetupStepFour);

module.exports = router;
