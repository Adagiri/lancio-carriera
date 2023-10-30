const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { sendEmail, generateEmailArguments } = require('./aws');
const { startOfDay, startOfWeek, startOfMonth } = require('date-fns');

module.exports.generateRandomNumbers = (length) => {
  let code = '';
  while (code.length < length) {
    code += Math.floor(Math.random() * (9 - 1 + 1)) + 1;
  }

  return code;
};

module.exports.getQueryArgs = (args) => {
  const filter = args.filter || {};
  // Transform the query if the property 'id' was added
  if (filter.id) {
    filter._id = mongoose.Types.ObjectId(filter.id);

    delete filter.id;
  }
  // Transform the query if the property 'ids' was added
  if (filter.ids) {
    filter._id = { $in: filter.ids.map((id) => mongoose.Types.ObjectId(id)) };
    delete filter.ids;
  }

  // Make sure deleted documents are not selected
  filter.deleted = { $ne: true };

  // Set pagination fields
  const page = parseInt(args.page, 10) || 0;
  const limit = parseInt(args.perPage, 10) || 10;
  const skip = page * limit;

  // Transform sort field
  const sort = {};
  if (args.sortField) {
    sort[args.sortField] = args.sortOrder === 'ASC' ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  return { filter, skip, limit, sort };
};

module.exports.confirmPassword = async function (
  originalPassword,
  inputedPassword
) {
  return bcrypt.compare(inputedPassword, originalPassword);
};

module.exports.getSignedJwtToken = function (user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.JWT_EXPIRY_TIME,
    }
  );
};

module.exports.generateVerificationCode = (bytes, expiryInMins) => {
  const token = crypto.randomBytes(bytes).toString('hex');

  const tokenExpiry = expiryInMins
    ? new Date(Date.now() + expiryInMins * 60 * 1000)
    : null;

  const encryptedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const code = this.generateRandomNumbers(4);

  return { token, encryptedToken, tokenExpiry, code };
};

module.exports.getEncryptedToken = (token) => {
  const encryptedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  return encryptedToken;
};

module.exports.generateEncryptedPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  const encryptedPassword = await bcrypt.hash(password, salt);

  return encryptedPassword;
};

module.exports.hasUserAppliedToJob = (userId, job) => {
  return (
    job.applicants.findIndex(
      (applicant) => applicant.profile._id.toString() === userId
    ) !== -1
  );
};

module.exports.isJobSavedByUser = (jobId, savedJobs) => {
  return savedJobs.findIndex((id) => id.toString() === jobId.toString()) !== -1;
};

module.exports.getTimeFrame = (timeFrame) => {
  const today = new Date();
  if (timeFrame === 'today') {
    return { $gte: startOfDay(today) };
  } else if (timeFrame === 'this-week') {
    return { $gte: startOfWeek(today, { weekStartsOn: 1 }) };
  } else if (timeFrame === 'this-month') {
    return { $gte: startOfMonth(today) };
  } else {
    return { $gte: new Date('2023-01-01') };
  }
};
