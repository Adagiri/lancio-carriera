const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse.js');
const User = require('../models/User');
const UserProfileView = require('../models/UserProfileView');
const {
  startOfWeek,
  startOfMonth,
  startOfDay,
  endOfDay,
  startOfHour,
  endOfHour,
} = require('date-fns');
const Company = require('../models/Company');
const Job = require('../models/Job');

function getDayDateRange(date, dayOfWeek) {
  const targetDay = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ].indexOf(dayOfWeek.toLowerCase());
  const currentDay = date.getDay();
  const diff = targetDay - currentDay;

  const resultDate = new Date(date);
  resultDate.setDate(resultDate.getDate() + diff);

  return {
    start: startOfDay(resultDate),
    end: endOfDay(resultDate),
  };
}

function getWeekDayProfileCount({ start, end, views }) {
  return views.filter(
    (view) =>
      new Date(view.createdAt) <= new Date(end) &&
      new Date(view.createdAt) >= new Date(start)
  ).length;
}

function getMonthDayProfileCount(date, views) {
  const start = startOfDay(date);
  const end = endOfDay(date);

  console.log(views, start, end);
  return views.filter(
    (view) =>
      new Date(view.createdAt) <= new Date(end) &&
      new Date(view.createdAt) >= new Date(start)
  ).length;
}

function getHourlyProfileCount(date, views) {
  const start = startOfHour(date);
  const end = endOfHour(date);

  console.log(views, start, end);
  return views.filter(
    (view) =>
      new Date(view.createdAt) <= new Date(end) &&
      new Date(view.createdAt) >= new Date(start)
  ).length;
}

const getJobsAppliedCount = async (userId, targetTime) => {
  let data = await Job.countDocuments({
    'applicants.createdAt': { $gt: targetTime },
    'applicants.profile': userId,
  });

  return data;
};

const getProfileViewsDetail = async (userId, targetTime) => {
  let userProfileViews = await UserProfileView.findOne({
    user: userId,
    'company.createdAt': { $gt: targetTime },
  });

  // Sort is done earlier to make sure that after filtering duplicate values below, we have the most recent of each item on the list
  const companyIds =
    userProfileViews?.views
      ?.sort((a, b) => b.createdAt - a.createdAt)
      .map((view) => view.company) || [];

  let data = companyIds.filter((id, index) => companyIds.indexOf(id) === index);
  const viewCount = data.length;
  const first5Ids = data.slice(0, 5);
  const recentView = await Company.find({ _id: { $in: first5Ids } }).select(
    'company_name photo'
  );

  let summary = 'No views yet';

  if (recentView.length === 1) {
    summary = `${recentView[0].company_name} viewed your profile`;
  }

  if (recentView.length === 2) {
    summary = `${recentView[0].company_name} and ${recentView[1].company_name} viewed your profile`;
  }

  if (recentView.length > 2) {
    summary = `${recentView[0].company_name} and ${
      viewCount - 1
    } other persons viewed your profile`;
  }

  return {
    count: viewCount,
    summary: summary,
    recentView: recentView,
  };
};

const getWeeklyGraphData = (views) => {
  const today = new Date();
  return {
    monday: getWeekDayProfileCount({
      ...getDayDateRange(today, 'monday'),
      views,
    }),
    tuesday: getWeekDayProfileCount({
      ...getDayDateRange(today, 'tuesday'),
      views,
    }),
    wednesday: getWeekDayProfileCount({
      ...getDayDateRange(today, 'wednesday'),
      views,
    }),
    thursday: getWeekDayProfileCount({
      ...getDayDateRange(today, 'thursday'),
      views,
    }),
    friday: getWeekDayProfileCount({
      ...getDayDateRange(today, 'friday'),
      views,
    }),
    saturday: getWeekDayProfileCount({
      ...getDayDateRange(today, 'saturday'),
      views,
    }),
    sunday: getWeekDayProfileCount({
      ...getDayDateRange(today, 'sunday'),
      views,
    }),
  };
};

function getMonthlyGraphData(views) {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const days = {};
  for (let i = startDate.getDate(); i <= endDate.getDate(); i++) {
    const currentDate = new Date(year, month, i);
    days[i] = getMonthDayProfileCount(currentDate, views);
  }

  return days;
}

function getDailyGraphData(views) {
  const arr = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23,
  ];

  const dateTimeObject = {};

  arr.forEach((item) => {
    const currentDate = new Date();
    currentDate.setHours(item, 0, 0, 0);
    dateTimeObject[item] = getHourlyProfileCount(currentDate, views);
  });

  return dateTimeObject;
}

const getProfileViewsGraphData = async ({ userId, targetTime, duration }) => {
  let userProfileViews = await UserProfileView.findOne({
    user: userId,
    'company.createdAt': { $gt: targetTime },
  });

  let views = userProfileViews?.views || [];

  views = views.filter(
    (view, index) =>
      views.findIndex((v) => v.company === view.company) === index
  );

  let data = {};
  if (duration === 'thisWeek') {
    data = getWeeklyGraphData(views);
  }

  if (duration === 'thisMonth') {
    data = getMonthlyGraphData(views);
  }

  if (duration === 'today') {
    data = getDailyGraphData(views);
  }

  return data;
};

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

    // Sort is done earlier to make sure that after filtering duplicate values below, we have the most recent of each item on the list
    const companyIds =
      userProfileViews?.views
        ?.sort((a, b) => b.createdAt - a.createdAt)
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
    const userId = req.user.id;
    const query = req.query;
    const duration = query.duration;
    const today = new Date();
    const targetTime =
      duration === 'thisWeek'
        ? startOfWeek(today)
        : duration === 'thisMonth'
        ? startOfMonth(today)
        : duration === 'today'
        ? startOfDay(today)
        : new Date('2023-01-01');

    const jobsAppliedCount = await getJobsAppliedCount(userId, targetTime);
    const profileViewDetails = await getProfileViewsDetail(userId, targetTime);
    const profileViewGraphData = await getProfileViewsGraphData({
      userId,
      targetTime,
      duration,
    });

    console.log(jobsAppliedCount);

    return res.json({
      jobsAppliedCount: jobsAppliedCount,
      profileViewGraphData: profileViewGraphData,
      profileViewDetails: profileViewDetails,
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

module.exports.editNotificationSettingsForUser = asyncHandler(
  async (req, res, next) => {
    const args = req.body;

    const updates = {};
    for (const key in args) {
      updates[`notificationSettings.${key}`] = args[key];
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    });

    return res.status(200).json({
      success: true,
      user: user,
    });
  }
);
