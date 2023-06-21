const asyncHandler = require('../middlewares/async');
const Job = require('../models/Job');
const ErrorResponse = require('../utils/errorResponse');

const isAnApplicant = (applicantsIds, userId) => {
  return applicantsIds.map((id) => id.toString()).indexOf(userId) === -1
    ? false
    : true;
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

module.exports.postJob = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments
  args.company = req.user.id;
  let job = await Job.create(args);

  job = await Job.findById(job._id)
    .populate('company')
    .populate('applicants.profile');
  return res.status(201).json({ success: true, job: job });
});

module.exports.editJob = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const jobId = args.jobId;
  // validate arguments

  let job = await Job.findByIdAndUpdate(jobId, args, { new: true })
    .populate('company')
    .populate(
      'applicants.profile',
      'first_name last_name age photo country state city'
    );

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  console.log(args, job);

  return res.status(200).json({ success: true, job: job });
});

module.exports.applyToJob = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const userId = req.user.id;
  const jobId = args.jobId;
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

  if (
    job.applicants.findIndex((applicant) => applicant.profile === userId) !== -1
  ) {
    return next(
      new ErrorResponse(404, {
        messageEn: `You already applied for this job`,
        messageGe: `Sie haben sich bereits für diese Stelle beworben`,
      })
    );
  }

  console.log(req.user);

  const newApplicant = {
    profile: req.user.id,
    resume: args.resume,
    coverLetter: args.coverLetter,
  };

  job.applicants.push(newApplicant);
  job.applicantsCount += 1;
  await job.save();

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
    select: 'first_name last_name age photo country state city',
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
  if (job.applicants.find((applicant) => applicant.status === 'Accepted')) {
    return next(
      new ErrorResponse(400, {
        messageEn: `You have already accepted an applicant`,
        messageGe: `Sie haben bereits einen Bewerber angenommen`,
      })
    );
  }

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

  return res.status(200).json({ success: true, job: job });
});
