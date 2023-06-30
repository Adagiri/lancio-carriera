const {
  startOfWeek,
  startOfMonth,
  startOfDay,
  endOfDay,
  startOfHour,
  endOfHour,
} = require('date-fns');
const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/async');
const Company = require('../models/Company');
const Job = require('../models/Job');

const getTotalApplicationsCount = async (userId, currentTime) => {
  const result = await Job.aggregate([
    { $unwind: '$applicants' },
    {
      $match: {
        'applicants.createdAt': { $gt: currentTime },
        company: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
      },
    },
  ]);

  const count = result.length > 0 ? result[0].count : 0;

  return count;
};

const getJobPostsCount = async (userId, currentTime) => {
  const result = await Job.countDocuments({
    createdAt: { $gt: currentTime },
    company: mongoose.Types.ObjectId(userId),
  });

  const count = result.length > 0 ? result[0].count : 0;

  return count;
};

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

function getWeekDayApplicantsCount({ start, end, applicants }) {
  return applicants.filter(
    (applicant) =>
      new Date(applicant.createdAt) <= new Date(end) &&
      new Date(applicant.createdAt) >= new Date(start)
  ).length;
}

function getMonthDayApplicantsCount(date, applicants) {
  const start = startOfDay(date);
  const end = endOfDay(date);

  return applicants.filter(
    (applicant) =>
      new Date(applicant.createdAt) <= new Date(end) &&
      new Date(applicant.createdAt) >= new Date(start)
  ).length;
}

function getHourlyApplicantsCount(date, applicants) {
  const start = startOfHour(date);
  const end = endOfHour(date);
  return applicants.filter(
    (applicant) =>
      new Date(applicant.createdAt) <= new Date(end) &&
      new Date(applicant.createdAt) >= new Date(start)
  ).length;
}

const getWeeklyGraphData = (applicants) => {
  const today = new Date();
  return {
    monday: getWeekDayApplicantsCount({
      ...getDayDateRange(today, 'monday'),
      applicants,
    }),
    tuesday: getWeekDayApplicantsCount({
      ...getDayDateRange(today, 'tuesday'),
      applicants,
    }),
    wednesday: getWeekDayApplicantsCount({
      ...getDayDateRange(today, 'wednesday'),
      applicants,
    }),
    thursday: getWeekDayApplicantsCount({
      ...getDayDateRange(today, 'thursday'),
      applicants,
    }),
    friday: getWeekDayApplicantsCount({
      ...getDayDateRange(today, 'friday'),
      applicants,
    }),
    saturday: getWeekDayApplicantsCount({
      ...getDayDateRange(today, 'saturday'),
      applicants,
    }),
    sunday: getWeekDayApplicantsCount({
      ...getDayDateRange(today, 'sunday'),
      applicants,
    }),
  };
};

function getMonthlyGraphData(applicants) {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  const days = {};
  for (let i = startDate.getDate(); i <= endDate.getDate(); i++) {
    const currentDate = new Date(year, month, i);
    days[i] = getMonthDayApplicantsCount(currentDate, applicants);
  }

  return days;
}

function getDailyGraphData(applicants) {
  const arr = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23,
  ];

  const dateTimeObject = {};

  arr.forEach((item) => {
    const currentDate = new Date();
    currentDate.setHours(item, 0, 0, 0);
    dateTimeObject[item] = getHourlyApplicantsCount(currentDate, applicants);
  });

  return dateTimeObject;
}

const getApplicantsCountGraphData = async ({
  userId,
  targetTime,
  duration,
}) => {
  let applicants = await Job.aggregate([
    { $unwind: '$applicants' },
    {
      $match: {
        'applicants.createdAt': { $gt: targetTime },
        company: mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  let data = {};
  if (duration === 'thisWeek') {
    data = getWeeklyGraphData(applicants);
  }

  if (duration === 'thisMonth') {
    data = getMonthlyGraphData(applicants);
  }

  if (duration === 'today') {
    data = getDailyGraphData(applicants);
  }

  return data;
};

module.exports.getLoggedInCompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.user.id);
  return res.status(200).json(company);
});

module.exports.getLoggedInCompanyDashboardData = asyncHandler(
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

    const totalApplicationsCount = await getTotalApplicationsCount(
      userId,
      targetTime
    );
    const jobPostsCount = await getJobPostsCount(userId, targetTime);
    const applicantsCountGraphData = await getApplicantsCountGraphData({
      userId,
      targetTime,
      duration,
    });

    return res.json({
      totalApplicationsCount: totalApplicationsCount,
      jobPostsCount: jobPostsCount,
      applicantsCountGraphData: applicantsCountGraphData,
    });
  }
);

module.exports.profileSetup = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments

  args.isProfileSetupComplete = true;
  const company = await Company.findByIdAndUpdate(req.user.id, args, {
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
  const company = await Company.findByIdAndUpdate(req.user.id, args, {
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
  const company = await Company.findByIdAndUpdate(req.user.id, args, {
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

  const company = await Company.findByIdAndUpdate(req.user.id, args, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    company: company,
  });
});
