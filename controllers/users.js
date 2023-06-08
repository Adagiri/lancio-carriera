const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse.js');
const User = require('../models/User');

module.exports.getLoggedInUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  return res.status(200).json(user);
});

module.exports.profileSetup = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isProfileSetupComplete = true;
  const user = await User.findByIdAndUpdate(req.user._id, args, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    user: user,
  });
});

module.exports.profileSetupStepOne = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepOneProfileSetupComplete = true;
  const user = await User.findByIdAndUpdate(req.user._id, args, { new: true });

  return res.status(200).json({
    success: true,
    user: user,
  });
});

module.exports.profileSetupStepTwo = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepTwoProfileSetupComplete = true;
  const user = await User.findByIdAndUpdate(req.user._id, args, { new: true });

  return res.status(200).json({
    success: true,
    user: user,
  });
});

module.exports.profileSetupStepThree = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepThreeProfileSetupComplete = true;
  const user = await User.findByIdAndUpdate(req.user._id, args, { new: true });

  return res.status(200).json({
    success: true,
    user: user,
  });
});

module.exports.profileSetupStepFour = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepFourProfileSetupComplete = true;
  args.isProfileSetupComplete = true;
  const user = await User.findByIdAndUpdate(req.user._id, args, { new: true });

  return res.status(200).json({
    success: true,
    user: user,
  });
});
