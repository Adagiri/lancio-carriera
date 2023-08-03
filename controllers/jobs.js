const mongoose = require('mongoose');
const { startOfWeek, startOfMonth, startOfDay } = require('date-fns');
const asyncHandler = require('../middlewares/async');
const Job = require('../models/Job');
const ErrorResponse = require('../utils/errorResponse');
const Company = require('../models/Company');
const CompanyNotification = require('../models/CompanyNotification');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');

const isAnApplicant = (applicantsIds, userId) => {
  return applicantsIds.map((id) => id.toString()).indexOf(userId) === -1
    ? false
    : true;
};

const sendNotificationOnApplicantApplied = async ({ user, job }) => {
  const company = job.company;
  const arguments = {
    owner: company._id,
    case: 'Applicant Applied',
    title: user.first_name,
    body: `Applied to your job: ${job.position}`,
    user: user._id,
    subject: job._id,
    subjectType: 'Job',
  };

  if (company.notificationSettings.onApplicantApplied) {
    // Send the email if it's turned on in the company's settings page
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Company.findByIdAndUpdate(
        company._id,
        {
          $inc: { unviewedNotifications: 1 },
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

const sendNotificationOnJobReported = async ({ user, job }) => {
  const company = job.company;
  const arguments = {
    owner: company._id,
    case: 'Job Reported',
    title: user.first_name,
    body: `Reported your job: ${job.position}`,
    user: user._id,
    subject: job._id,
    subjectType: 'Job',
  };

  if (company.notificationSettings.onJobReported) {
    // Send the email if it's turned on in the company's settings page
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Company.findByIdAndUpdate(
        company._id,
        {
          $inc: { unviewedNotifications: 1 },
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

const sendNotificationOnJobPosted = async (job) => {
  const company = job.company;
  const arguments = {
    owner: company._id,
    case: 'Job Posted',
    title: job.position,
    body: `Your job post is live`,
    subject: job._id,
    subjectType: 'Job',
  };

  if (company.notificationSettings.onJobPosted) {
    // Send the email if it's turned on in the company's settings page
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Company.findByIdAndUpdate(
        company._id,
        {
          $inc: { unviewedNotifications: 1 },
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

const sendNotificationOnJobClosed = async (job) => {
  const company = job.company;
  // Company
  const companyArguments = {
    owner: company._id,
    case: 'Job Closed',
    title: job.position,
    body: `You closed this position`,
    subject: job._id,
    subjectType: 'Job',
  };

  if (company.notificationSettings.onJobClosed) {
    // Send the email if it's turned on in the company's settings page
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Company.findByIdAndUpdate(
        company._id,
        {
          $inc: { unviewedNotifications: 1 },
        },
        { session }
      );

      await CompanyNotification.create([companyArguments], {
        session,
      });
    });
    session.endSession();
  }

  // Applicants
  const selectedApplicants = job.applicants.filter(
    (applicant) => applicant.profile?.notificationSettings?.onJobClosed === true
  );

  const selectedApplicantsArguments = selectedApplicants.map((applicant) => {
    return {
      owner: applicant.profile._id,
      case: 'Job Closed',
      title: job.position,
      body: `This position is now closed`,
      subject: job._id,
      subjectType: 'Job',
      company: company._id,
    };
  });

  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    await User.updateMany(
      { _id: selectedApplicants.map((applicant) => applicant.profile._id) },
      {
        $inc: { unviewedNotifications: 1 },
      },
      { session }
    );

    await UserNotification.create(selectedApplicantsArguments, {
      session,
    });
  });
  session.endSession();
};

const sendNotificationOnApplicantAccepted = async ({ job, applicant }) => {
  const arguments = {
    owner: applicant.profile._id,
    case: 'Application Accepted',
    title: 'Application accepted',
    body: `Application for ${job.position} has been accepted`,
    subject: job._id,
    subjectType: 'Job',
    company: job.company._id,
  };

    console.log(applicant, 'applicant');


  if (applicant.profile?.notificationSettings?.onApplicationAccepted) {
    console.log(applicant, 'applicant')
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await User.findByIdAndUpdate(
        applicant.profile._id,
        {
          $inc: { unviewedNotifications: 1 },
        },
        { session }
      );

      await UserNotification.create([arguments], {
        session,
      });
    });
    session.endSession();
  }

};

module.exports.getJobs = asyncHandler(async (req, res, next) => {
  const query = req.query;

  const cursor = query.cursor;
  const limit = Math.abs(Number(query.limit)) || 10;

  let data = await Job.find().sort({ _id: -1 }).populate('company').populate({
    path: 'applicants.profile',
    select: 'first_name last_name photo',
  });
  // Sort the list
  data = data.sort((a, b) => b.createdAt - a.createdAt);

  // Filter the result based off of cursor and limit
  const cursorIndex = data.map((job) => job._id.toString()).indexOf(cursor);

  const start = cursorIndex === -1 ? 0 : cursorIndex;
  const end = start + limit;
  const nextPageCursor = data[end]?._id;
  const hasNextPage = !!nextPageCursor;
  data = data.slice(start, end);

  return res.json({
    hasNextPage,
    nextPageCursor,
    jobs: data,
    count: data.length,
  });
});

module.exports.getJobById = asyncHandler(async (req, res, next) => {
  const jobId = req.params.id;

  let job = await Job.findById(jobId).populate('company').populate({
    path: 'applicants.profile',
    select: 'first_name last_name age photo country state city',
  });

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  job = job.toObject();

  const applicantsIds = job.applicants
    .filter((applicant) => applicant.profile !== null)
    .map((applicant) => applicant.profile._id);

  if (isAnApplicant(applicantsIds, req.user.id)) {
    job.hasAppliedTo = true;
  } else {
    job.hasAppliedTo = false;
  }

  return res.json({
    success: true,
    job: job,
  });
});

module.exports.getCompanyJobs = asyncHandler(async (req, res, next) => {
  const query = req.query;
  console.log(query);
  const cursor = query.cursor;
  const limit = Math.abs(Number(query.limit)) || 10;

  const filter = { ...query };
  delete filter.limit;
  delete filter.cursor;
  console.log(req.user.id, 'req.user.id');
  let data = await Job.find({
    company: req.user.id,
    ...filter,
  })
    .populate('company')
    .populate({
      path: 'applicants.profile',
      select: 'first_name last_name photo',
    });
  // Sort the list
  data = data.sort((a, b) => b.createdAt - a.createdAt);

  // Filter the result based off of cursor and limit
  const cursorIndex = data.map((job) => job._id.toString()).indexOf(cursor);

  const start = cursorIndex === -1 ? 0 : cursorIndex;
  const end = start + limit;
  const nextPageCursor = data[end]?._id;
  const hasNextPage = !!nextPageCursor;
  data = data.slice(start, end);

  return res.json({
    hasNextPage,
    nextPageCursor,
    jobs: data,
    count: data.length,
  });
});

module.exports.getNewApplicantsList = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const query = req.query;
  const cursor = query.cursor;
  const limit = Math.abs(Number(query.limit)) || 10;

  const currentTime = new Date(req.user.lastTimeNewApplicantsWasViewed);

  let data = await Job.aggregate([
    { $unwind: '$applicants' },
    {
      $match: {
        'applicants.createdAt': { $gt: currentTime },
        company: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: 'users', // Assuming the collection name for the User model is 'users'
        localField: 'applicants.profile',
        foreignField: '_id',
        as: 'applicants.profile',
      },
    },
    {
      $project: {
        _id: 0,
        jobId: '$_id',
        profile: { $arrayElemAt: ['$applicants.profile', 0] },
        coverLetter: '$applicants.coverLetter',
        resume: '$applicants.resume',
        createdAt: '$applicants.createdAt',
        status: '$applicants.status',
      },
    },
  ]);

  const totalCount = data.length;

  // // Sort the list
  data = data.sort((a, b) => b.createdAt - a.createdAt);
  console.log(data);

  // // Filter the result based off of cursor and limit
  const cursorIndex = data
    .map((applicant) => applicant.profile._id.toString())
    .indexOf(cursor);

  const start = cursorIndex === -1 ? 0 : cursorIndex;
  const end = start + limit;
  const nextPageCursor = data[end]?._id;
  const hasNextPage = !!nextPageCursor;
  data = data.slice(start, end);

  await Company.findByIdAndUpdate(userId, {
    lastTimeNewApplicantsWasViewed: new Date(),
  });

  return res.json({
    hasNextPage,
    nextPageCursor,
    applicants: data,
    count: data.length,
    totalCount: totalCount,
  });
});

module.exports.getNewApplicantsCount = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const currentTime = new Date(req.user.lastTimeNewApplicantsWasViewed);

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

  await Company.findByIdAndUpdate(userId, {
    lastTimeNewApplicantsWasViewed: new Date(),
  });

  return res.json({
    count: count,
  });
});

module.exports.getUserJobs = asyncHandler(async (req, res, next) => {
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

  let data = await Job.find({
    'applicants.createdAt': { $gt: targetTime },
    'applicants.profile': userId,
  })
    .populate('company')
    .populate({
      path: 'applicants.profile',
      select: 'first_name last_name photo',
    });

  const totalCount = data.length;

  // Sort the list
  data = data.sort((a, b) => b.createdAt - a.createdAt);

  // Filter the result based off of cursor and limit
  const cursorIndex = data.map((job) => job._id.toString()).indexOf(cursor);

  const start = cursorIndex === -1 ? 0 : cursorIndex;
  const end = start + limit;
  const nextPageCursor = data[end]?._id;
  const hasNextPage = !!nextPageCursor;
  data = data.slice(start, end);

  return res.json({
    hasNextPage,
    nextPageCursor,
    jobs: data,
    count: data.length,
    totalCount: totalCount,
  });
});

module.exports.postJob = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments
  args.company = req.user.id;
  let job = await Job.create(args);

  job = await Job.findById(job._id)
    .populate('company')
    .populate('applicants.profile');

  await sendNotificationOnJobPosted(job);

  return res.status(201).json({ success: true, job: job });
});

module.exports.editJob = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const jobId = args.jobId;

  const jobBeforeEdit = await Job.findById(jobId).select('isClosed');
  // validate arguments

  let job = await Job.findByIdAndUpdate(jobId, args, { new: true })
    .populate('company')
    .populate(
      'applicants.profile',
      'first_name last_name age photo country state city notificationSettings'
    );

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  const isJobClosed =
    args.isClosed === true && jobBeforeEdit.isClosed === false;

  if (isJobClosed) {
    await sendNotificationOnJobClosed(job);
  }
  return res.status(200).json({ success: true, job: job });
});

module.exports.applyToJob = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const userId = req.user.id;
  const jobId = args.jobId;
  // validate arguments
  const job = await Job.findById(jobId).populate({
    path: 'company',
    select: 'company_name photo notificationSettings',
  });

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  // if (
  //   job.applicants.findIndex(
  //     (applicant) => applicant.profile.toString() === userId
  //   ) !== -1
  // ) {
  //   return next(
  //     new ErrorResponse(404, {
  //       messageEn: `You already applied for this job`,
  //       messageGe: `Sie haben sich bereits für diese Stelle beworben`,
  //     })
  //   );
  // }

  console.log(req.user, job.applicants);

  const newApplicant = {
    profile: userId,
    resume: args.resume,
    coverLetter: args.coverLetter,
  };

  job.applicants.push(newApplicant);
  job.applicantsCount += 1;
  await job.save();

  await sendNotificationOnApplicantApplied({
    user: req.user,
    job: job,
  });

  return res.status(200).json({ success: true, job: job });
});

module.exports.acceptApplicant = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const userId = req.user.id;
  const jobId = args.jobId;
  const applicantId = args.applicantId;
  // validate arguments
  const job = await Job.findById(jobId).populate('company').populate({
    path: 'applicants.profile',
    select: 'first_name last_name age photo country state city notificationSettings',
  });

  // Job Exists or Not
  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  // LoggedIn User is Authorized or Not
  if (job.company._id.toString() !== userId) {
    return next(
      new ErrorResponse(403, {
        messageEn: 'You are not authorized',
        messageGe: 'Sie sind nicht berechtigt',
      })
    );
  }

  // An Applicant has Already been Accepted or Not
  // if (job.applicants.find((applicant) => applicant.status === 'Accepted')) {
  //   return next(
  //     new ErrorResponse(400, {
  //       messageEn: `You have already accepted an applicant`,
  //       messageGe: `Sie haben bereits einen Bewerber angenommen`,
  //     })
  //   );
  // }

  const applicantIndex = job.applicants.findIndex(
    (applicant) => applicant.profile._id.toString() === applicantId
  );

  if (applicantIndex === -1) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Applicant-ID: ${applicantId} does not belong to an applicant on this Job posting`,
        messageGe: `Bewerber-ID: ${applicantId} gehört keinem Bewerber in dieser Stellenausschreibung`,
      })
    );
  }

  // Change Chosen Applicant's Status to Accepted
  job.applicants = job.applicants.map((applicant) => {
    if (applicant.profile._id.toString() === applicantId) {
      applicant.status = 'Accepted';
    }

    return applicant;
  });

  await job.save();

  const selectedApplicant = job.applicants.find(
    (applicant) => applicant.profile._id.toString() === applicantId
  );
  await sendNotificationOnApplicantAccepted({
    applicant: selectedApplicant,
    job: job,
  });

  return res.status(200).json({ success: true, job: job });
});

module.exports.reportJob = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const userId = req.user.id;
  const jobId = args.jobId;
  // validate arguments
  const job = await Job.findById(jobId).populate({
    path: 'company',
    select: 'company_name photo notificationSettings',
  });

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  if (job.reportedBy.findIndex((id) => id.toString() === userId) !== -1) {
    return next(
      new ErrorResponse(404, {
        messageEn: `You already reported this job`,
        messageGe: `Sie haben diesen Job bereits gemeldet`,
      })
    );
  }

  job.reportedBy.push(userId);
  await job.save();

  await sendNotificationOnJobReported({
    user: req.user,
    job: job,
  });

  return res.status(200).json({ success: true, job: job });
});
