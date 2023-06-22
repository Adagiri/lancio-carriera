const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse.js');
const User = require('../models/User');
const UserProfileView = require('../models/UserProfileView');
const { startOfWeek, startOfMonth, startOfDay } = require('date-fns');
const Company = require('../models/Company');

module.exports.getUserById = asyncHandler(async (req, res, next) => {
  const userId = req.params.id;
  const loggedInUserId = req.user.id;
  const user = await User.findById(userId);

  if (!user) {
    return next(
      new ErrorResponse(404, {
        messageEn: `User with the ID: ${userId} was not found`,
        messageGe: `Benutzer mit der ID: ${userId} wurde nicht gefunden`,
      })
    );
  }

  if (req.user.accountType === 'company') {
    await UserProfileView.updateOne(
      { user: userId },
      { $push: { views: { company: loggedInUserId } } },
      { upsert: true }
    );
  }

  return res.status(200).json(user);
});

module.exports.getLoggedInUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  return res.status(200).json(user);
});

module.exports.getLoggedInUserProfileViews = asyncHandler(
  async (req, res, next) => {
    const userId = req.user.id;
    const query = req.query;
    const cursor = query.cursor;
    const limit = Math.abs(Number(query.limit)) || 10;

    const today = new Date();
    const duration = query.duration;
    const targetTime =
      duration === 'thisWeek'
        ? startOfWeek(today)
        : duration === 'thisMonth'
        ? startOfMonth(today)
        : duration === 'today'
        ? startOfDay(today)
        : new Date('2023-01-01');

    let userProfileViews = await UserProfileView.findOne({
      user: userId,
      'company.createdAt': { $gt: targetTime },
    });

    // Sort is done earlier to make sure that after the filtering for duplicate values below, we have the most recent of each item on the list
    const companyIds =
      userProfileViews?.views
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((view) => view.company) || [];

    let data = companyIds.filter(
      (id, index) => companyIds.indexOf(id) === index
    );

    const totalCount = data.length;

    // Filter the result based off of cursor and limit
    const cursorIndex = data.indexOf(cursor);

    const start = cursorIndex === -1 ? 0 : cursorIndex;
    const end = start + limit;
    const nextPageCursor = data[end]?._id;
    const hasNextPage = !!nextPageCursor;
    data = data.slice(start, end);

    data = await Company.find({ _id: { $in: data } }).select(
      'company_name email photo country state city address bio'
    );

    return res.json({
      hasNextPage,
      nextPageCursor,
      views: data,
      count: data.length,
      totalCount: totalCount,
    });
  }
);

module.exports.getLoggedInUserDashboardData = asyncHandler(
  async (req, res, next) => {
    // - jobs applied count
    // - profileViewDetails: {count: 900, recentView: [{company_name, photo}], cardText: "Cloud Hacks and 2 others"}
    // - profileViewGraphData: ...
    const userId = req.user.id;
    const query = req.query;
    const cursor = query.cursor;
    const limit = Math.abs(Number(query.limit)) || 10;

    const today = new Date();
    const duration = query.duration;
    const targetTime =
      duration === 'thisWeek'
        ? startOfWeek(today)
        : duration === 'thisMonth'
        ? startOfMonth(today)
        : duration === 'today'
        ? startOfDay(today)
        : new Date('2023-01-01');

    let userProfileViews = await UserProfileView.findOne({
      user: userId,
      'company.createdAt': { $gt: targetTime },
    });

    // Sort is done earlier to make sure that after the filtering for duplicate values below, we have the most recent of each item on the list
    const companyIds =
      userProfileViews?.views
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((view) => view.company) || [];

    let data = companyIds.filter(
      (id, index) => companyIds.indexOf(id) === index
    );

    const totalCount = data.length;

    // Filter the result based off of cursor and limit
    const cursorIndex = data.indexOf(cursor);

    const start = cursorIndex === -1 ? 0 : cursorIndex;
    const end = start + limit;
    const nextPageCursor = data[end]?._id;
    const hasNextPage = !!nextPageCursor;
    data = data.slice(start, end);

    data = await Company.find({ _id: { $in: data } }).select(
      'company_name email photo country state city address bio'
    );

    return res.json({
      hasNextPage,
      nextPageCursor,
      views: data,
      count: data.length,
      totalCount: totalCount,
    });
  }
);

module.exports.profileSetup = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isProfileSetupComplete = true;
  const user = await User.findByIdAndUpdate(req.user.id, args, {
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
  const user = await User.findByIdAndUpdate(req.user.id, args, { new: true });

  return res.status(200).json({
    success: true,
    user: user,
  });
});

module.exports.profileSetupStepTwo = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepTwoProfileSetupComplete = true;
  const user = await User.findByIdAndUpdate(req.user.id, args, { new: true });

  return res.status(200).json({
    success: true,
    user: user,
  });
});

module.exports.profileSetupStepThree = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isStepThreeProfileSetupComplete = true;
  const user = await User.findByIdAndUpdate(req.user.id, args, { new: true });

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
  const user = await User.findByIdAndUpdate(req.user.id, args, { new: true });

  return res.status(200).json({
    success: true,
    user: user,
  });
});
