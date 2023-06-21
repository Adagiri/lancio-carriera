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

  let data = await Job.find()
    .sort({ _id: -1 })
    .populate('company')
    .populate('applicants.profile', 'firstName lastName photo');
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

  const job = await Job.findById(jobId)
    .populate('company')
    .populate('applicants.profile');

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  console.log(job.applicants);

  const applicantsIds = job.applicants
    .filter((applicant) => applicant.profile !== null)
    .map((applicant) => applicant.profile._id);

  if (isAnApplicant(applicantsIds, req.user.id)) {
    job.hasAppliedTo = true;
  }

  return res.json({
    success: true,
    job: job,
  });
});

module.exports.getCompanyJobs = asyncHandler(async (req, res, next) => {
  const query = req.query;

  const cursor = query.cursor;
  const limit = Math.abs(Number(query.limit)) || 10;

  let data = await Job.find({
    company: req.user.id,
  })
    .populate('company')
    .populate('applicants.profile', 'firstName lastName photo');
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

  if (job.applicants.findIndex((applicant) => applicant.profile === userId)) {
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
