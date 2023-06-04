const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse.js');
const User = require('../models/User');
const Company = require('../models/Company');

module.exports.getLoggedInCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.company._id);
  return res.status(200).json(company);
});

module.exports.profileSetup = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isProfileSetupComplete = true;
  const company = await Company.findByIdAndUpdate(req.company._id, args, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    company: company,
  });
});


module.exports.profileSetupStepOne = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepOneProfileSetupComplete = true;
  const company = await Company.findByIdAndUpdate(req.company._id, args, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    company: company,
  });
});

module.exports.profileSetupStepTwo = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepTwoProfileSetupComplete = true;
  const company = await Company.findByIdAndUpdate(req.company._id, args, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    company: company,
  });
});

module.exports.profileSetupStepThree = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepThreeProfileSetupComplete = true;
  args.isProfileSetupComplete = true;

  const company = await Company.findByIdAndUpdate(req.company._id, args, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    company: company,
  });
});
