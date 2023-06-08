const asyncHandler = require('../models/middlewares/async');
const Job = require('../models/Job');

module.exports.getCompanyJobs = asyncHandler(async (req, res, next) => {
  const query = req.query;

  const cursor = query.cursor;
  const limit = Math.abs(Number(query.limit)) || 10;

  let data = await Job.find({
    company: req.company._id,
  }).populate('company');
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
  args.company = req.company._id;
  let job = await Job.create(args);

  job = await Job.findById(job._id).populate('company');
  return res.status(201).json({ success: true, job: job });
});
