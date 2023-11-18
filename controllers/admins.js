const asyncHandler = require('../middlewares/async.js');

const ErrorResponse = require('../utils/errorResponse.js');
const { sendResetPasswordEmailForAdmin } = require('../utils/messages.js');
const {
  generateVerificationCode,
  getSignedJwtToken,
  getEncryptedToken,
  confirmPassword,
  generateEncryptedPassword,
} = require('../utils/general.js');
const Admin = require('../models/Admin.js');

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

  if (admin.role === 'master') {
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
