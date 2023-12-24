const mongoose = require('mongoose');
const {
  startOfMonth,
  endOfMonth,
  startOfDay,
  addDays,
  startOfWeek,
  format,
  endOfDay,
} = require('date-fns');

const asyncHandler = require('../middlewares/async.js');

const ErrorResponse = require('../utils/errorResponse.js');
const {
  sendResetPasswordEmailForAdmin,
  sendPersonalizedEmailToUser,
} = require('../utils/messages.js');
const {
  generateVerificationCode,
  getSignedJwtToken,
  getEncryptedToken,
  confirmPassword,
  generateEncryptedPassword,
} = require('../utils/general.js');
const Admin = require('../models/Admin.js');
const User = require('../models/User.js');
const Job = require('../models/Job.js');
const Company = require('../models/Company.js');
const UserNotification = require('../models/UserNotification.js');
const CompanyNotification = require('../models/CompanyNotification.js');

const allowedRoles = ['owner', 'master', 'moderator'];
const timeFrameValues = ['this-month', 'this-week', 'all-time'];

function divideMonthIntoParts() {
  // Get the current date
  const currentDate = new Date();

  // Get the start and end of the current month
  const startOfMonthDate = startOfMonth(currentDate);
  const endOfMonthDate = endOfMonth(currentDate);

  // Calculate the number of days in the current month
  const daysInMonth = endOfMonthDate.getDate() - startOfMonthDate.getDate() + 1;

  // Calculate the number of days in each part (assuming 4 parts)
  const daysPerPart = Math.ceil(daysInMonth / 4);

  // Initialize an array to store the divisions
  const divisions = [];

  // Loop to create divisions
  for (let i = 0; i < 4; i++) {
    const minDay = i * daysPerPart + 1;
    const maxDay = (i + 1) * daysPerPart;

    // Ensure that maxDay does not exceed the total days in the month
    const adjustedMaxDay = Math.min(maxDay, daysInMonth);

    // Calculate min and max dates for the division
    const minDate = addDays(startOfMonthDate, minDay - 1);
    const maxDate = addDays(startOfMonthDate, adjustedMaxDay - 1);

    // Push the division to the array
    divisions.push({
      min: minDay,
      max: adjustedMaxDay,
      minDate: startOfDay(minDate),
      maxDate: startOfDay(maxDate),
    });
  }

  return divisions;
}

const divideWeekIntoParts = () => {
  const currentDate = new Date();
  const startOfWeekDate = startOfWeek(currentDate);

  const divisions = [];

  for (let i = 0; i < 7; i++) {
    const minDate = addDays(startOfWeekDate, i);
    const maxDate = endOfDay(minDate);

    divisions.push({
      dayOfWeek: format(minDate, 'EEEE'), // Get the day name (e.g., Monday)
      minDate,
      maxDate,
    });
  }

  return divisions;
};

const getCurrentWeekAnalyticsData = async (model) => {
  let divisions = divideWeekIntoParts();

  divisions = await Promise.all(
    divisions.map(async (division) => {
      const userSignupCount = await model.countDocuments({
        createdAt: { $gte: division.minDate, $lte: division.maxDate },
        isAccountActivated: true,
      });

      division.count = userSignupCount;
      delete division.minDate;
      delete division.maxDate;

      return division;
    })
  );

  return divisions;
};

const getCurrentMonthAnalyticsData = async (model) => {
  let divisions = divideMonthIntoParts();

  divisions = await Promise.all(
    divisions.map(async (division) => {
      const userSignupCount = await model.countDocuments({
        createdAt: { $gte: division.minDate, $lte: division.maxDate },
        isAccountActivated: true,
      });

      division.count = userSignupCount;
      delete division.minDate;
      delete division.maxDate;

      return division;
    })
  );

  return divisions;
};

const getUserAnalyticsData = async (timeFrame) => {
  try {
    if (timeFrame === 'this-month') {
      const data = await getCurrentMonthAnalyticsData(User);
      return data;
    } else {
      const data = await getCurrentWeekAnalyticsData(User);
      return data;
    }
  } catch (error) {
    throw error;
  }
};

const getCompanyAnalyticsData = async (timeFrame) => {
  try {
    if (timeFrame === 'this-month') {
      const data = await getCurrentMonthAnalyticsData(Company);
      return data;
    } else {
      const data = await getCurrentWeekAnalyticsData(Company);
      return data;
    }
  } catch (error) {
    throw error;
  }
};

const getJobCurrentMonthAnalyticsData = async (model) => {
  let divisions = divideMonthIntoParts();

  divisions = await Promise.all(
    divisions.map(async (division) => {
      division.verifiedJobsCount = await model.countDocuments({
        createdAt: { $gte: division.minDate, $lte: division.maxDate },
        isVerified: true,
      });

      division.unverifiedJobsCount = await model.countDocuments({
        createdAt: { $gte: division.minDate, $lte: division.maxDate },
        isVerified: false,
      });

      division.totalJobCount =
        division.verifiedJobsCount + division.unverifiedJobsCount;

      division.reportedJobsCount = await model.countDocuments({
        createdAt: { $gte: division.minDate, $lte: division.maxDate },
        isReported: true,
      });

      delete division.minDate;
      delete division.maxDate;

      return division;
    })
  );

  return divisions;
};

const getJobCurrentWeekAnalyticsData = async (model) => {
  let divisions = divideWeekIntoParts();

  divisions = await Promise.all(
    divisions.map(async (division) => {
      division.verifiedJobsCount = await model.countDocuments({
        createdAt: { $gte: division.minDate, $lte: division.maxDate },
        isVerified: true,
      });

      division.unverifiedJobsCount = await model.countDocuments({
        createdAt: { $gte: division.minDate, $lte: division.maxDate },
        isVerified: false,
      });

      division.totalJobCount =
        division.verifiedJobsCount + division.unverifiedJobsCount;

      division.reportedJobsCount = await model.countDocuments({
        createdAt: { $gte: division.minDate, $lte: division.maxDate },
        isReported: true,
      });

      delete division.minDate;
      delete division.maxDate;

      return division;
    })
  );

  return divisions;
};

const getJobAnalyticsData = async (timeFrame) => {
  try {
    if (timeFrame === 'this-month') {
      const data = await getJobCurrentMonthAnalyticsData(Job);
      return data;
    } else {
      const data = await getJobCurrentWeekAnalyticsData(Job);
      return data;
    }
  } catch (error) {
    throw error;
  }
};
module.exports.register = asyncHandler(async (req, res, next) => {
  const validators = ['name', 'email', 'role', 'password'];

  const args = {};
  for (const elem of validators) {
    const value = req.body[elem];

    if (value) {
      args[elem] = value;
    } else {
      return next(
        new ErrorResponse(400, {
          messageEn: `${elem} is required`,
          messageGe: `${elem} ist erforderlich`,
        })
      );
    }
  }

  if (args.email) {
    const admin = await Admin.findOne({ email: args.email });

    if (admin) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Email already taken',
          messageGe: 'E-Mail bereits vergeben',
        })
      );
    }
  }

  args.password = await generateEncryptedPassword(args.password);

  let admin = await Admin.create(args);

  admin = admin.toObject();
  delete admin.password;
  return res.status(200).json({
    success: true,
    admin,
  });
});

module.exports.login = asyncHandler(async (req, res, next) => {
  const args = req.body;

  // validate arguments
  let admin = await Admin.findOne({
    email: args.email,
  }).select('+password');

  if (!admin) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Admin not found',
        messageGe: 'Administrator nicht gefunden',
      })
    );
  }

  const isPasswordMatch = await confirmPassword(admin.password, args.password);

  if (!isPasswordMatch) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Invalid credentials',
        messageGe: 'Ungültige Anmeldeinformationen',
      })
    );
  }

  const authToken = getSignedJwtToken(admin);

  admin = await Admin.findById(admin._id);
  return res.status(200).json({
    success: true,
    authToken: authToken,
    admin: admin,
  });
});

module.exports.getAdmin = asyncHandler(async (req, res, next) => {
  const userId = req.params.adminId;
  const user = await Admin.findById(userId);

  if (!user) {
    return next(
      new ErrorResponse(404, {
        messageEn: `User with the ID: ${userId} was not found`,
        messageGe: `Benutzer mit der ID: ${userId} wurde nicht gefunden`,
      })
    );
  }

  return res.status(200).json(user);
});

module.exports.getAdmins = asyncHandler(async (req, res, next) => {
  const allowedFilters = ['name', 'email', 'role'];
  const query = req.query;

  for (key in query) {
    if (allowedFilters.indexOf(key) === -1) {
      return next(
        new ErrorResponse(400, {
          messageEn: `Invalid filter: ${key}`,
          messageGe: `Ungültiger Filter: ${key}`,
        })
      );
    }
  }

  let admins = await Admin.find(query).sort({ _id: -1 });

  return res.status(200).json(admins);
});

module.exports.sendResetPasswordLink = asyncHandler(async (req, res, next) => {
  const email = req.body.email;

  if (!email) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Email is required',
        messageGe: 'E-Mail ist erforderlich',
      })
    );
  }

  const user = await Admin.findOne({
    email: email,
  });

  if (!user) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'No account with such email',
        messageGe: 'Kein Konto mit einer solchen E-Mail',
      })
    );
  }

  const { token, encryptedToken, tokenExpiry } = generateVerificationCode(
    20,
    10
  );

  user.resetPasswordToken = encryptedToken;
  user.resetPasswordTokenExpiry = tokenExpiry;
  await user.save();

  await sendResetPasswordEmailForAdmin(email, token);

  // Send email
  return res.status(200).json({
    success: true,
  });
});

module.exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!password || !token) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Password and Token are required',
        messageGe: 'Passwort und Token sind erforderlich',
      })
    );
  }
  const encryptedToken = getEncryptedToken(token);

  const user = await Admin.findOne({
    resetPasswordToken: encryptedToken,
  });

  if (!user) {
    return next(
      new ErrorResponse(404, {
        messageEn: 'Invalid token',
        messageGe: 'Ungültiges Token',
      })
    );
  }

  if (new Date(user.resetPasswordTokenExpiry) < new Date()) {
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpiry = undefined;
    await user.save();
    return next(
      new ErrorResponse(400, {
        messageEn: 'Reset password session expired',
        messageGe: 'Die Sitzung zum Zurücksetzen des Passworts ist abgelaufen',
      })
    );
  }

  user.password = await generateEncryptedPassword(password);
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpiry = undefined;

  await user.save();

  res.status(200).json({
    success: true,
  });
});

module.exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;

  const admin = await Admin.findById(userId);
  if (!admin) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'User not found',
        messageGe: 'Benutzer nicht gefunden',
      })
    );
  }

  await Admin.findByIdAndRemove(admin._id);
  return res.status(200).json({
    success: true,
    admin: admin,
  });
});

module.exports.deleteAccountByEmail = asyncHandler(async (req, res, next) => {
  const email = req.body.email || 'xyzarn@gmail.com';
  if (process.env.TEST_ENV !== 'true') {
    return next(
      new ErrorResponse(400, {
        messageEn: 'You cannot use this API in production',
        messageGe: 'Sie können diese API nicht in der Produktion verwenden',
      })
    );
  } else {
    const admin = await Admin.findOne({ email: email });
    if (!admin) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'User not found',
          messageGe: 'Benutzer nicht gefunden',
        })
      );
    }

    await Admin.findByIdAndRemove(admin._id);
    return res.status(200).json({
      success: true,
      admin: admin,
    });
  }
});

module.exports.deleteAdminAccount = asyncHandler(async (req, res, next) => {
  const adminId = req.body.adminId;
  const loggedInUser = req.user;

  if (!adminId) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Admin id is required',
        messageGe: 'Admin-ID ist erforderlich',
      })
    );
  }

  const admin = await Admin.findById(adminId);

  if (!admin) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Admin not found',
        messageGe: 'Administrator nicht gefunden',
      })
    );
  }

  if (String(loggedInUser.id) === String(adminId)) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'You cannot delete your own account',
        messageGe: 'Sie können Ihr eigenes Konto nicht löschen',
      })
    );
  }

  if (admin.role === 'master' && loggedInUser.role !== 'owner') {
    return next(
      new ErrorResponse(400, {
        messageEn: 'You cannot delete another master Admin',
        messageGe: 'Sie können keinen anderen Master-Administrator löschen',
      })
    );
  }

  await Admin.findByIdAndRemove(admin._id);

  return res.status(200).json({
    success: true,
    admin: admin,
  });
});

module.exports.createAdmin = asyncHandler(async (req, res, next) => {
  const validators = ['name', 'email', 'role', 'password'];

  const args = {};
  for (const elem of validators) {
    const value = req.body[elem];
    if (value) {
      args[elem] = value;
    } else {
      return next(
        new ErrorResponse(400, {
          messageEn: `${elem} is required`,
          messageGe: `${elem} ist erforderlich`,
        })
      );
    }
  }

  const existingUser = await Admin.findOne({ email: args.email });

  if (existingUser) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Email already taken',
        messageGe: 'E-Mail bereits vergeben',
      })
    );
  }

  if (args.role === 'owner') {
    return next(
      new ErrorResponse(400, {
        messageEn: `You cannot assign OWNER role to another admin`,
        messageGe: `Sie können die OWNER-Rolle keinem anderen Administrator zuweisen`,
      })
    );
  }

  args.password = await generateEncryptedPassword(args.password);
  let admin = await Admin.create(args);

  admin = admin.toObject();
  delete admin.password;

  return res.status(200).json({
    success: true,
    admin,
  });
});

module.exports.updateAdmin = asyncHandler(async (req, res, next) => {
  const validators = ['name', 'role'];

  const args = {};
  for (const elem of validators) {
    const value = req.body[elem];
    if (value) {
      args[elem] = value;
    } else {
      return next(
        new ErrorResponse(400, {
          messageEn: `${elem} is required`,
          messageGe: `${elem} ist erforderlich`,
        })
      );
    }
  }

  if (args.role === 'owner') {
    return next(
      new ErrorResponse(400, {
        messageEn: `You cannot assign OWNER role to another admin`,
        messageGe: `Sie können die OWNER-Rolle keinem anderen Administrator zuweisen`,
      })
    );
  }

  if (allowedRoles.indexOf(args.role) === -1) {
    return next(
      new ErrorResponse(400, {
        messageEn: `Invalid role`,
        messageGe: `Ungültige Rolle`,
      })
    );
  }

  const adminId = req.params.adminId;

  if (!adminId) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Admin id is required',
        messageGe: 'Admin-ID ist erforderlich',
      })
    );
  }

  let admin = await Admin.findById(adminId);

  if (!admin) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Admin not found',
        messageGe: 'Administrator nicht gefunden',
      })
    );
  }

  delete args.password;
  delete args.email;
  admin = await Admin.findByIdAndUpdate(admin._id, args, { new: true });

  return res.status(200).json({
    success: true,
    admin: admin,
  });
});

module.exports.getUsers = asyncHandler(async (req, res, next) => {
  const allowedParams = [
    'page',
    'limit',
    'sort-by',
    'sort-order',
    'searchTerm',
  ];
  const query = req.query;

  for (key in query) {
    if (allowedParams.indexOf(key) === -1) {
      return next(
        new ErrorResponse(400, {
          messageEn: `Invalid param: ${key}`,
          messageGe: `Ungültiger Param: ${key}`,
        })
      );
    }
  }

  const page = query.page ? parseInt(Math.abs(query.page)) : 1;
  const limit = query.limit ? parseInt(Math.abs(query.limit)) : 10;
  const skip = (page - 1) * limit;

  const sort = { _id: -1 };

  if (query['sort-by'] === 'age' && query['sort-order'] === 'ascending') {
    delete sort._id;
    sort['age'] = 1;
  }

  if (query['sort-by'] === 'age' && query['sort-order'] === 'descending') {
    delete sort._id;
    sort['age'] = -1;
  }

  if (query['sort-by'] === 'job' && query['sort-order'] === 'ascending') {
    delete sort._id;
    sort['jobCount'] = 1;
  }

  if (query['sort-by'] === 'job' && query['sort-order'] === 'descending') {
    delete sort._id;
    sort['jobCount'] = -1;
  }

  if (query.searchTerm) {
    const keyword = query.searchTerm;

    query.$or = [
      {
        first_name: { $regex: keyword, $options: 'i' },
      },
      {
        last_name: { $regex: keyword, $options: 'i' },
      },
      {
        email: { $regex: keyword, $options: 'i' },
      },
    ];
  }

  delete query.limit;
  delete query.page;
  delete query['sort-by-age'];
  delete query['sort-by-jobs'];

  query.isAccountActivated = true;

  let users = await User.find(query).sort(sort).skip(skip).limit(limit);
  let totalCount = await User.countDocuments(query);
  return res.status(200).json({ users, totalCount });
});

module.exports.getUserById = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;

  let user = await User.findById(userId);

  return res.status(200).json(user);
});

module.exports.getUserJobs = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;

  const allowedParams = ['page', 'limit'];
  const query = req.query;

  for (key in query) {
    if (allowedParams.indexOf(key) === -1) {
      return next(
        new ErrorResponse(400, {
          messageEn: `Invalid param: ${key}`,
          messageGe: `Ungültiger Param: ${key}`,
        })
      );
    }
  }

  const page = query.page ? parseInt(Math.abs(query.page)) : 1;
  const limit = query.limit ? parseInt(Math.abs(query.limit)) : 10;
  const skip = (page - 1) * limit;

  let jobs = await Job.find({
    'applicants.profile': userId,
  })
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit);

  let totalCount = await Job.countDocuments({
    'applicants.profile': userId,
  });

  return res.status(200).json({ jobs, totalCount });
});

module.exports.getUsersDashboard = asyncHandler(async (req, res, next) => {
  const timeFrame = req.query.timeFrame || 'this-month';

  if (timeFrameValues.indexOf(timeFrame) === -1) {
    return next(
      new ErrorResponse(400, {
        messageEn: `Invalid value for timeFrame: ${timeFrame}`,
        messageGe: `Ungültiger Wert für timeFrame: ${timeFrame}`,
      })
    );
  }

  const _15to16 = await User.countDocuments({ age: { $gte: 15, $lte: 16 } });
  const _17to18 = await User.countDocuments({ age: { $gte: 17, $lte: 18 } });
  const _19above = await User.countDocuments({ age: { $gte: 19 } });
  const totalUserCount = await User.countDocuments({
    isAccountActivated: true,
  });

  const analyticsData = await getUserAnalyticsData(timeFrame);

  const data = {
    ageRangeData: {
      _15to16,
      _17to18,
      _19above,
    },

    analyticsData: {
      ...analyticsData,
    },

    totalUserCount: totalUserCount,
  };

  return res.status(200).json({ data });
});

module.exports.getCompanies = asyncHandler(async (req, res, next) => {
  const allowedParams = [
    'page',
    'limit',
    'sort-by',
    'sort-order',
    'searchTerm',
    'status',
  ];
  const query = req.query;

  for (key in query) {
    if (allowedParams.indexOf(key) === -1) {
      return next(
        new ErrorResponse(400, {
          messageEn: `Invalid param: ${key}`,
          messageGe: `Ungültiger Param: ${key}`,
        })
      );
    }
  }

  const page = query.page ? parseInt(Math.abs(query.page)) : 1;
  const limit = query.limit ? parseInt(Math.abs(query.limit)) : 10;
  const skip = (page - 1) * limit;

  const sort = { _id: -1 };

  if (query['sort-by'] === 'job' && query['sort-order'] === 'ascending') {
    delete sort._id;
    sort['jobPostCount'] = 1;
  }

  if (query['sort-by'] === 'job' && query['sort-order'] === 'descending') {
    delete sort._id;
    sort['jobPostCount'] = -1;
  }

  if (query.searchTerm) {
    const keyword = query.searchTerm;

    query.$or = [
      {
        company_name: { $regex: keyword, $options: 'i' },
      },
    ];
  }

  delete query.limit;
  delete query.page;
  delete query['sort-by-age'];
  delete query['sort-by-jobs'];

  query.isAccountActivated = true;

  let companies = await Company.find(query).sort(sort).skip(skip).limit(limit);
  let totalCount = await Company.countDocuments(query);
  return res.status(200).json({ companies, totalCount });
});

module.exports.getCompanyById = asyncHandler(async (req, res, next) => {
  const companyId = req.params.companyId;

  let company = await Company.findById(companyId);

  return res.status(200).json(company);
});

module.exports.getCompanyJobs = asyncHandler(async (req, res, next) => {
  const companyId = req.params.companyId;

  const allowedParams = ['page', 'limit'];
  const query = req.query;

  for (key in query) {
    if (allowedParams.indexOf(key) === -1) {
      return next(
        new ErrorResponse(400, {
          messageEn: `Invalid param: ${key}`,
          messageGe: `Ungültiger Param: ${key}`,
        })
      );
    }
  }

  const page = query.page ? parseInt(Math.abs(query.page)) : 1;
  const limit = query.limit ? parseInt(Math.abs(query.limit)) : 10;
  const skip = (page - 1) * limit;

  let jobs = await Job.find({
    company: companyId,
  })
    .populate('applicants.profile', 'first_name last_name email photo')
    .sort({ _id: -1 })
    .skip(skip)
    .limit(limit);


  let totalCount = await Job.countDocuments({
    company: companyId,
  });

  return res.status(200).json({ jobs, totalCount });
});

module.exports.getCompaniesDashboard = asyncHandler(async (req, res, next) => {
  const timeFrame = req.query.timeFrame || 'this-month';

  if (timeFrameValues.indexOf(timeFrame) === -1) {
    return next(
      new ErrorResponse(400, {
        messageEn: `Invalid value for timeFrame: ${timeFrame}`,
        messageGe: `Ungültiger Wert für timeFrame: ${timeFrame}`,
      })
    );
  }

  const totalCompanyCount = await Company.countDocuments({
    isAccountActivated: true,
  });

  const currentDate = new Date();
  const totalCompanyCountForCurrentMonth = await Company.countDocuments({
    isAccountActivated: true,
    createdAt: {
      $gte: startOfMonth(currentDate),
      $lte: endOfMonth(currentDate),
    },
  });

  const analyticsData = await getCompanyAnalyticsData(timeFrame);

  const data = {
    analyticsData: {
      ...analyticsData,
    },

    totalCompanyCount: totalCompanyCount,
    totalCompanyCountForCurrentMonth: totalCompanyCountForCurrentMonth,
  };

  return res.status(200).json({ data });
});

module.exports.verifyCompany = asyncHandler(async (req, res, next) => {
  const { companyId } = req.body;

  if (!companyId) {
    return next(new ErrorResponse(400, { messageEn: 'companyId is required' }));
  }

  await Company.findByIdAndUpdate(companyId, { isAccountVerified: true });
  await Job.updateMany({ company: companyId }, { isVerified: true });

  return res.status(200).json({
    success: true,
  });
});

module.exports.getJobs = asyncHandler(async (req, res, next) => {
  const allowedParams = [
    'page',
    'limit',
    'sort-by',
    'sort-order',
    'searchTerm',
    'applicantsCount',
  ];

  const query = req.query;

  for (key in query) {
    if (allowedParams.indexOf(key) === -1) {
      return next(
        new ErrorResponse(400, {
          messageEn: `Invalid param: ${key}`,
          messageGe: `Ungültiger Param: ${key}`,
        })
      );
    }
  }

  const page = query.page ? parseInt(Math.abs(query.page)) : 1;
  const limit = query.limit ? parseInt(Math.abs(query.limit)) : 10;
  const skip = (page - 1) * limit;

  const sort = { _id: -1 };

  if (
    query['sort-by'] === 'applicantsCount' &&
    query['sort-order'] === 'ascending'
  ) {
    delete sort._id;
    sort['applicantsCount'] = 1;
  }

  if (
    query['sort-by'] === 'applicantsCount' &&
    query['sort-order'] === 'descending'
  ) {
    delete sort._id;
    sort['applicantsCount'] = -1;
  }

  if (query.searchTerm) {
    const keyword = query.searchTerm;

    query.$or = [
      {
        position: { $regex: keyword, $options: 'i' },
      },
    ];
  }

  delete query.limit;
  delete query.page;
  delete query['sort-by-age'];
  delete query['sort-by-jobs'];

  let jobs = await Job.find(query)
    .populate('company')
    .populate('applicants.profile', 'first_name last_name email photo')
    .sort(sort)
    .skip(skip)
    .limit(limit);
  let totalCount = await Job.countDocuments(query);
  return res.status(200).json({ jobs, totalCount });
});

module.exports.getJobById = asyncHandler(async (req, res, next) => {
  const jobId = req.params.jobId;

  let job = await Job.findById(jobId)
    .populate('company')
    .populate('applicants.profile', 'first_name last_name email photo');

  job = job.toObject();

  job.applicants.splice(3);

  return res.status(200).json(job);
});

module.exports.getJobApplicants = asyncHandler(async (req, res, next) => {
  const jobId = req.params.jobId;

  let job = await Job.findById(jobId).populate(
    'applicants.profile',
    'first_name last_name email photo age country state city'
  );

  job = job.toObject();

  const applicants = job.applicants;

  return res.status(200).json({ applicants });
});

module.exports.getJobsDashboard = asyncHandler(async (req, res, next) => {
  const timeFrame = req.query.timeFrame || 'this-month';

  if (timeFrameValues.indexOf(timeFrame) === -1) {
    return next(
      new ErrorResponse(400, {
        messageEn: `Invalid value for timeFrame: ${timeFrame}`,
        messageGe: `Ungültiger Wert für timeFrame: ${timeFrame}`,
      })
    );
  }

  const currentDate = new Date();
  const startOfMonthDate = startOfMonth(currentDate);
  const startOfWeekDate = startOfWeek(currentDate);
  const totalJobCount = await Job.countDocuments();

  const currentMonthJobCount = await Job.countDocuments({
    createdAt: { $gte: startOfMonthDate },
  });

  const currentWeekJobCount = await Job.countDocuments({
    createdAt: { $gte: startOfWeekDate },
  });

  const analyticsData = await getJobAnalyticsData(timeFrame);

  const data = {
    totalJobCount: totalJobCount,
    currentMonthJobCount: currentMonthJobCount,
    currentWeekJobCount: currentWeekJobCount,
    analyticsData,
  };
  return res.status(200).json({ data });
});

module.exports.deleteJob = asyncHandler(async (req, res, next) => {
  const { jobId } = req.body;

  if (!jobId) {
    return next(new ErrorResponse(400, { messageEn: 'jobId is required' }));
  }

  const job = await Job.findById(jobId).populate('company', 'email');

  if (!job) {
    return next(
      new ErrorResponse(404, {
        messageEn: `Job with the ID: ${jobId} was not found`,
        messageGe: `Job mit der ID: ${jobId} wurde nicht gefunden`,
      })
    );
  }

  const session = await mongoose.startSession();
  await session.withTransaction(async () => {
    await Job.findByIdAndDelete(jobId, { session });

    await UserNotification.deleteMany(
      { subject: jobId },
      {
        session,
      }
    );

    await CompanyNotification.deleteMany(
      { subject: jobId },
      {
        session,
      }
    );
  });

  session.endSession();

  const subject = 'Stellenanzeige gelöscht';
  const body = `Ihre Stellenanzeige mit dem Titel ${job.position} wurde von den App-Eigentümern gelöscht`;
  const email = job.company.email;

  await sendPersonalizedEmailToUser({ subject, body, email });
  return res.status(200).json({
    success: true,
    job: job,
  });
});

module.exports.getDashboardData = asyncHandler(async (req, res, next) => {
  const timeFrame = req.query.timeFrame || 'all-time';

  if (timeFrameValues.indexOf(timeFrame) === -1) {
    return next(
      new ErrorResponse(400, {
        messageEn: `Invalid value for timeFrame: ${timeFrame}`,
        messageGe: `Ungültiger Wert für timeFrame: ${timeFrame}`,
      })
    );
  }

  let timeLimit = new Date('2023-01-01');

  const currentDate = new Date();
  timeFrame === 'this-month' && (timeLimit = startOfMonth(currentDate));
  timeFrame === 'this-week' && (timeLimit = startOfWeek(currentDate));

  console.log(timeLimit);
  const totalCompanyCount = await Company.countDocuments({
    createdAt: { $gte: timeLimit },
  });

  const totalUserCount = await User.countDocuments({
    createdAt: { $gte: timeLimit },
  });

  const totalJobCount = await Job.countDocuments({
    createdAt: { $gte: timeLimit },
  });

  const latestJobs = await Job.find()
    .populate('applicants.profile', 'first_name last_name photo').populate('company', 'company_name')
    .sort({ createdAt: -1 })
    .limit(5);

  const latestUsers = await User.find().limit(5);
  const latestCompanies = await Company.find().limit(5);

  const data = {
    totalJobCount: totalJobCount,
    totalUserCount: totalUserCount,
    totalCompanyCount: totalCompanyCount,
    latestJobs: latestJobs,
    latestUsers: latestUsers,
    latestCompanies: latestCompanies,
  };

  return res.status(200).json({ data });
});
