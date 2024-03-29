const mongoose = require('mongoose');
const { startOfWeek, startOfMonth, startOfDay } = require('date-fns');
const asyncHandler = require('../middlewares/async');
const Job = require('../models/Job');
const ErrorResponse = require('../utils/errorResponse');
const Company = require('../models/Company');
const CompanyNotification = require('../models/CompanyNotification');
const User = require('../models/User');
const UserNotification = require('../models/UserNotification');
const {
  hasUserAppliedToJob,
  isJobSavedByUser,
  getTimeFrame,
} = require('../utils/general');

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
    titleGe: user.first_name,
    body: `Applied to your job: ${job.position}`,
    bodyGe: `Hat sich für Ihren Job beworben: ${job.position}`,
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

const sendNotificationOnJobReported = async ({ user, job }) => {
  const company = job.company;
  const arguments = {
    owner: company._id,
    case: 'Job Reported',
    title: user.first_name,
    titleGe: user.first_name,
    body: `Reported your job: ${job.position}`,
    bodyGe: `Habe deinen Job gemeldet: ${job.position}`,
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

const sendNotificationOnJobPosted = async (job) => {
  const company = job.company;
  const arguments = {
    owner: company._id,
    case: 'Job Posted',
    title: job.position,
    titleGe: job.position,
    body: `Your job post is live`,
    bodyGe: `Ihre Stellenausschreibung ist online`,
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

const sendNotificationOnJobClosed = async (job) => {
  const company = job.company;
  // Company
  const companyArguments = {
    owner: company._id,
    case: 'Job Closed',
    title: job.position,
    titleGe: job.position,
    body: `You closed this position`,
    bodyGe: `Sie haben diese Position geschlossen`,
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
          $inc: { unreadNotifications: 1 },
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
      titleGe: job.position,
      body: `This position is now closed`,
      bodyGe: `Diese Position ist nun geschlossen`,
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
        $inc: { unreadNotifications: 1 },
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
    titleGe: 'Bewerbung angenommen',
    body: `Application for ${job.position} has been accepted`,
    bodyGe: `Bewerbung für ${job.position} wurde angenommen`,
    subject: job._id,
    subjectType: 'Job',
    company: job.company._id,
  };

  if (applicant.profile?.notificationSettings?.onApplicationAccepted) {
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await User.findByIdAndUpdate(
        applicant.profile._id,
        {
          $inc: { unreadNotifications: 1 },
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

module.exports.getJobListings = asyncHandler(async (req, res, next) => {
  const query = req.query;
  const cursor = query.cursor;
  const limit = Math.abs(Number(query.limit)) || 10;

  const filter = { ...query };

  const type = query.type || '';
  const category = query.category || [];
  const location = query.location || '';
  const timeFrame = query.timeFrame || 'none';
  const searchTerm = query.searchTerm || '';
  const minApplicantCount = Math.abs(Number(query.minApplicantCount)) || 0;
  const maxApplicantCount = Math.abs(Number(query.maxApplicantCount)) || 1000;
  const regex = new RegExp(searchTerm, 'i');

  filter.createdAt = getTimeFrame(timeFrame);
  searchTerm && (filter.position = { $regex: regex });
  type && (filter.type = type);
  if (category && typeof category === 'string') {
    filter.category = category;
  }
  if (Array.isArray(category) && category.length > 0) {
    filter.category = { $in: category };
  }
  location && (filter.location = location);
  filter.applicantsCount = { $gte: minApplicantCount, $lte: maxApplicantCount };
  filter.isVerified = true;

  delete filter.limit;
  delete filter.cursor;
  delete filter.timeFrame;
  delete filter.searchTerm;

  let data = await Job.find({ ...filter })
    .sort({ _id: -1 })
    .populate('company', 'company_name photo address state country city email')
    .populate({
      path: 'applicants.profile',
      select:
        'first_name last_name photo age state country city softSkills bio email',
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

  if (req.user.accountType === 'personal') {
    const userId = req.user.id;
    const userData = await User.findById(userId).select('savedJobs');

    data = data.map((job) => {
      job = job.toObject();
      job.hasUserApplied = hasUserAppliedToJob(userId, job);
      job.isJobSaved = isJobSavedByUser(job._id, userData.savedJobs);

      return job;
    });
  }

  return res.json({
    hasNextPage,
    nextPageCursor,
    jobs: data,
    count: data.length,
  });
});

module.exports.getJobById = asyncHandler(async (req, res, next) => {
  const jobId = req.params.id;

  let job = await Job.findById(jobId)
    .populate('company', 'company_name photo address state country city email')
    .populate({
      path: 'applicants.profile',
      select:
        'first_name last_name age photo country state city softSkills bio email',
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
  if (req.user.accountType === 'personal') {
    const userId = req.user.id;
    const userData = await User.findById(userId).select('savedJobs');

    job.hasUserApplied = hasUserAppliedToJob(userId, job);
    job.isJobSaved = isJobSavedByUser(job._id, userData.savedJobs);
  }

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

module.exports.getJobPostings = asyncHandler(async (req, res, next) => {
  const query = req.query;

  const cursor = query.cursor;
  const limit = Math.abs(Number(query.limit)) || 10;

  const filter = { ...query };

  const minApplicantCount = Math.abs(Number(query.minApplicantCount)) || 0;
  const maxApplicantCount = Math.abs(Number(query.maxApplicantCount)) || 10000;
  const category = query.category || [];
  const timeFrame = query.timeFrame || 'none';
  const searchTerm = query.searchTerm || '';
  const regex = new RegExp(searchTerm, 'i');

  filter.applicantsCount = { $gte: minApplicantCount, $lte: maxApplicantCount };
  filter.createdAt = getTimeFrame(timeFrame);
  searchTerm && (filter.position = { $regex: regex });
  if (category && typeof category === 'string') {
    filter.category = category;
  }
  if (Array.isArray(category) && category.length > 0) {
    filter.category = { $in: category };
  }

  delete filter.limit;
  delete filter.cursor;
  delete filter.timeFrame;
  delete filter.minApplicantCount;
  delete filter.maxApplicantCount;
  delete filter.searchTerm;

  let data = await Job.find({
    company: req.user.id,
    ...filter,
  })
    .populate('company')
    .populate({
      path: 'applicants.profile',
      select:
        'first_name last_name photo age state country city softSkills bio email',
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
    {
      $match: {
        company: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $unwind: '$applicants',
    },
    {
      $match: {
        'applicants.createdAt': { $gt: currentTime },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'applicants.profile',
        foreignField: '_id',
        as: 'applicants.profile',
      },
    },
    {
      $unwind: '$applicants.profile',
    },
    {
      $project: {
        _id: 0,
        jobId: '$_id',
        profile: '$applicants.profile',
        coverLetter: '$applicants.coverLetter',
        resume: '$applicants.resume',
        email: '$applicants.email',
        createdAt: '$applicants.createdAt',
        status: '$applicants.status',
      },
    },
  ]);

  data = data.map((user) => {
    delete user.profile.password;
    delete user.profile.notificationSettings;

    return user;
  });

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
    duration === 'this-week'
      ? startOfWeek(today, { weekStartsOn: 1 })
      : duration === 'this-month'
      ? startOfMonth(today)
      : duration === 'today'
      ? startOfDay(today)
      : new Date('2023-01-01');

  let data = await Job.find({
    'applicants.createdAt': { $gt: targetTime },
    'applicants.profile': userId,
  })
    .populate('company', 'company_name photo address state country city email')
    .populate({
      path: 'applicants.profile',
      select:
        'first_name last_name photo age state country city softSkills bio email',
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

  const userData = await User.findById(userId).select('savedJobs');
  data = data.map((job) => {
    job = job.toObject();
    job.hasUserApplied = hasUserAppliedToJob(userId, job);
    job.isJobSaved = isJobSavedByUser(job._id, userData.savedJobs);

    return job;
  });

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

  const companyId = req.user.id;
  args.company = companyId;

  // If the company is a verified user, then the job should be tagged as verfied
  req.user.isAccountVerified && (args.isVerified = true);

  let job = await Job.create(args);

  job = await Job.findById(job._id)
    .populate('company')
    .populate('applicants.profile');

  // Increase the Job Post count
  await Company.findByIdAndUpdate(req.user.id, { $inc: { jobPostCount: 1 } });

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
      'first_name last_name age photo country state city notificationSettings softSkills bio email'
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

  const newApplicant = {
    profile: userId,
    resume: args.resume,
    coverLetter: args.coverLetter,
  };

  job.applicants.push(newApplicant);
  job.applicantsCount += 1;
  await job.save();

  await User.findByIdAndUpdate(userId, { $inc: { jobCount: 1 } });

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
    select:
      'first_name last_name age photo country state city notificationSettings softSkills bio email',
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
  job.isReported = true;
  job.reportedBy.push(userId);
  await job.save();

  await sendNotificationOnJobReported({
    user: req.user,
    job: job,
  });

  return res.status(200).json({ success: true, job: job });
});

module.exports.saveAJob = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const jobId = req.body.jobId;
  // validate arguments
  const job = await Job.findById(jobId);

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  const user = await User.findById(userId);
  if (user.savedJobs.findIndex((id) => id.toString() === jobId) === -1) {
    user.savedJobs.push(jobId);
    await user.save();
  }

  return res.status(200).json({ success: true });
});

module.exports.unsaveAJob = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const jobId = req.body.jobId;
  // validate arguments
  const job = await Job.findById(jobId);

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  const user = await User.findById(userId);
  user.savedJobs = user.savedJobs.filter((id) => id.toString() !== jobId);
  await user.save();

  return res.status(200).json({ success: true });
});

module.exports.closeAJob = asyncHandler(async (req, res, next) => {
  const jobId = req.body.jobId;
  // validate arguments
  const job = await Job.findByIdAndUpdate(
    jobId,
    { isClosed: true },
    { new: true }
  );

  return res.status(200).json({ success: true, job: job });
});

module.exports.getJobListingsPostedByCompany = asyncHandler(
  async (req, res, next) => {
    let data = await Job.find({
      company: req.params.companyId,
    })
      .populate('company')
      .populate({
        path: 'applicants.profile',
        select:
          'first_name last_name photo age state country city softSkills bio email',
      });

    if (req.user.accountType === 'personal') {
      const userId = req.user.id;
      const userData = await User.findById(userId).select('savedJobs');

      data = data.map((job) => {
        job = job.toObject();
        job.hasUserApplied = hasUserAppliedToJob(userId, job);
        job.isJobSaved = isJobSavedByUser(job._id, userData.savedJobs);

        return job;
      });
    }

    return res.json({
      jobs: data,
    });
  }
);
