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
const CompanyNotification = require('../models/CompanyNotification');
const ErrorResponse = require('../utils/errorResponse');
const { getTimeFrame } = require('../utils/general');

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
  console.log(currentTime);
  const result = await Job.countDocuments({
    createdAt: { $gt: currentTime },
    company: mongoose.Types.ObjectId(userId),
  });

  return result;
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

const sendNotificationOnCompanyReported = async ({ user, company }) => {
  const arguments = {
    owner: company._id,
    case: 'Company Reported',
    title: user.first_name,
    titleGe: user.first_name,
    body: `Reported you`,
    bodyGe: `Habe Dich gemeldet`,
    user: user._id,
    subject: user._id,
    subjectType: 'User',
  };

  if (company.notificationSettings.onCompanyReported) {
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Company.findByIdAndUpdate(
        company._id,
        {
          $inc: { unreadNotifications: 1 },
        },
        { session }
      );

      await CompanyNotification.create([arguments], {
        session,
      });
    });
    session.endSession();
  }
};

module.exports.getCompanyById = asyncHandler(async (req, res, next) => {
  const companyId = req.params.id;
  const company = await Company.findById(companyId);

  if (!company) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Company with the ID: ${companyId} was not found`,
        messageGe: `Firma mit der ID: ${companyId} wurde nicht gefunden`,
      })
    );
  }

  return res.status(200).json(company);
});

module.exports.getLoggedInCompany = asyncHandler(async (req, res, next) => {
  let company = await Company.findById(req.user.id);
  const userId = req.user.id;
  const targetTime = new Date('2022-30-30');
  const totalApplicationsCount = await getTotalApplicationsCount(
    userId,
    targetTime
  );

  company = company.toObject();
  company.totalApplicationsCount = totalApplicationsCount;
  return res.status(200).json(company);
});

module.exports.getAcceptedApplicants = asyncHandler(async (req, res, next) => {
  const applicants = await Job.aggregate([
    // Match documents where at least one applicant has the status 'Accepted'
    {
      $match: {
        company: mongoose.Types.ObjectId(req.user.id),
        'applicants.status': 'Accepted',
      },
    },
    // Unwind the 'applicants' array to work with individual applicant documents
    {
      $unwind: '$applicants',
    },
    // Match only applicants with status 'Accepted'
    {
      $match: {
        'applicants.status': 'Accepted',
      },
    },
    // Lookup to get the 'User' document for each applicant
    {
      $lookup: {
        from: 'users',
        localField: 'applicants.profile',
        foreignField: '_id',
        as: 'user',
      },
    },
    // Lookup to get the 'Company' document for each job
    {
      $lookup: {
        from: 'companies',
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    // Unwind the 'user' and 'company' arrays to work with individual documents
    {
      $unwind: '$user',
    },
    {
      $unwind: '$company',
    },
    // Project to shape the output document with the desired fields
    {
      $project: {
        _id: '$applicants._id',
        user: {
          $arrayToObject: {
            $filter: {
              input: { $objectToArray: '$user' },
              cond: {
                $not: {
                  $in: ['$$this.k', ['password', 'notificationSettings']],
                },
              },
            },
          },
        },
        job: {
          _id: '$_id',
          position: '$position',
          company: {
            companyId: '$company._id',
            name: '$company.name',
          },
        },
      },
    },
  ]);

  // Now 'applicants' contains all fields of the applicant with 'password' and 'notificationSettings' omitted from the user object

  return res.status(200).json(applicants);
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

module.exports.updateProfile = asyncHandler(async (req, res, next) => {
  const args = req.body;

  const companyBeforeEditing = await Company.findById(req.user.id).select(
    'photo businessDoc'
  );
  const company = await Company.findByIdAndUpdate(req.user.id, args, {
    new: true,
  });

  // await cleanupStorage(args, companyBeforeEditing);

  return res.status(200).json({
    success: true,
    company: company,
  });
});

module.exports.editNotificationSettingsForCompany = asyncHandler(
  async (req, res, next) => {
    const args = req.body;

    const updates = {};
    for (const key in args) {
      updates[`notificationSettings.${key}`] = args[key];
    }

    const company = await Company.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    });

    return res.status(200).json({
      success: true,
      company: company,
    });
  }
);

module.exports.getNotificationsForCompany = asyncHandler(
  async (req, res, next) => {
    // Initialize cursor value as a default
    let cursor = '000000000000000000000000';

    // Check if a cursor is provided in the query parameter
    if (req.query.cursor !== 'null') {
      cursor = req.query.cursor;
    }

    // Determine the limit for the number of notifications to retrieve
    const limit = Math.abs(Number(req.query.limit)) || 10;

    // Define the base query to filter notifications by owner
    const query = { owner: req.user.id };

    // Handle case query parameter and set timeFrame
    if (req.query.case) {
      query.case = req.query.case.replace('_', ' ');
    }
    const timeFrame = query.timeFrame || 'none';
    query.createdAt = getTimeFrame(timeFrame);

    // Find the document corresponding to the cursor, if available
    const cursorDocument = await CompanyNotification.findById(cursor).select(
      'createdAt'
    );

    // Update the query to filter notifications based on the cursor's createdAt
    if (cursorDocument) {
      query.createdAt = { $lte: cursorDocument.createdAt };
    }

    // Fetch notifications based on the modified query
    const notifications = await CompanyNotification.find(query)
      .populate({
        path: 'user',
        select: 'first_name photo',
      })
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    // Determine whether there is a next page of notifications
    const hasNextPage = notifications.length > limit;

    // Calculate the cursor for the next page, if applicable
    let nextPageCursor = null;
    if (hasNextPage) {
      nextPageCursor = notifications.pop()._id;
    }

    // Respond with the JSON data including pagination details
    return res.json({
      hasNextPage,
      nextPageCursor,
      notifications,
      count: notifications.length,
    });
  }
);

module.exports.markNotificationAsRead = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    // Reduce user's notification count
    await Company.findByIdAndUpdate(
      req.user._id,
      {
        $inc: { unreadNotifications: -1 },
      },
      { session }
    );

    // Mark notification as read
    await CompanyNotification.findByIdAndUpdate(
      req.body.notificationId,
      {
        hasBeenRead: true,
      },
      { session }
    );
  });
  session.endSession();

  return res.json({
    success: true,
  });
});

module.exports.reportACompany = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.body.companyId).select(
    'company_name notificationSettings'
  );

  if (company) {
    // Send notification
    await sendNotificationOnCompanyReported({
      user: req.user,
      company: company,
    });
  }

  return res.json({
    success: true,
  });
});

module.exports.markAllNotificationsAsRead = asyncHandler(
  async (req, res, next) => {
    const companyId = req.user.id;
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      // Reduce user's notification count
      await Company.findByIdAndUpdate(
        companyId,
        {
          $set: { unreadNotifications: 0 },
        },
        { session }
      );

      // Mark notification as read
      await CompanyNotification.updateMany(
        { owner: companyId },
        {
          hasBeenRead: true,
        },
        { session }
      );
    });
    session.endSession();

    return res.json({
      success: true,
    });
  }
);
