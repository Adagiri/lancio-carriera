module.exports.getNewApplicantsList = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const query = req.query;
  const cursor = query.cursor;
  const limit = Math.abs(Number(query.limit)) || 10;

  const lastTimeProfileWasViewed = new Date(req.user.lastTimeNewApplicantsWasViewed);

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
        'applicants.createdAt': { $gt: lastTimeProfileWasViewed },
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
