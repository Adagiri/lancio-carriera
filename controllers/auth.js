const asyncHandler = require('../middlewares/async');

const ErrorResponse = require('../utils/errorResponse.js');
const User = require('../models/User');
const {
  sendAccountActivationEmailForUser,
  sendWelcomeEmailForUser,
  sendAccountActivationEmailForCompany,
  sendWelcomeEmailForCompany,
  sendResetPasswordEmailForCompany,
  sendResetPasswordEmailForUser,
} = require('../utils/messages');
const {
  generateVerificationCode,
  generateRandomNumbers,
  getSignedJwtToken,
  getEncryptedToken,
  confirmPassword,
  generateEncryptedPassword,
} = require('../utils/general');
const Company = require('../models/Company');

module.exports.registerWithEmail = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const { first_name, email, accountType } = args;

  // validate arguments

  if (accountType === 'company') {
    const existingAccount = await Company.findOne({
      email: email,
      isAccountActivated: true,
    });

    if (existingAccount) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Email already taken',
          messageGe: 'E-Mail bereits vergeben',
        })
      );
    }
  } else {
    const existingAccount = await User.findOne({
      email: email,
      isAccountActivated: true,
    });

    if (existingAccount) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Email already taken',
          messageGe: 'E-Mail bereits vergeben',
        })
      );
    }
  }

  const { token, encryptedToken, tokenExpiry, code } = generateVerificationCode(
    20,
    10
  );

  args.password = await generateEncryptedPassword(args.password);
  args.accountActivationCode = code;
  args.accountActivationToken = encryptedToken;
  args.accountActivationTokenExpiry = tokenExpiry;
  args.registeredWith = 'email';

  if (accountType === 'company') {
    await Company.create(args);
    await sendAccountActivationEmailForCompany({ email, code });
  } else {
    await User.create(args);
    await sendAccountActivationEmailForUser({ email, first_name, code });
  }

  return res.status(200).json({
    success: true,
    token,
  });
});

module.exports.registerWithGoogle = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const { idToken, first_name, accountType } = args;

  // validat args

  if (accountType === 'company') {
    const existingEmail = await Company.findOne({
      email: args.email,
      isAccountActivated: true,
    });

    if (existingEmail) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Email already registered',
          messageGe: 'Email schon registriert',
        })
      );
    }

    const existingToken = await Company.findOne({
      googleAuthToken: idToken,
      isAccountActivated: true,
    });

    if (existingToken) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Account already registered',
          messageGe: 'Konto bereits registriert',
        })
      );
    }
  } else {
    const existingEmail = await User.findOne({
      email: args.email,
      isAccountActivated: true,
    });

    if (existingEmail) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Email already registered',
          messageGe: 'Email schon registriert',
        })
      );
    }

    const existingToken = await User.findOne({
      googleAuthToken: idToken,
      isAccountActivated: true,
    });

    if (existingToken) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Account already registered',
          messageGe: 'Konto bereits registriert',
        })
      );
    }
  }

  args.registeredWith = 'google';
  args.googleAuthToken = idToken;
  args.isAccountActivated = true;

  if (accountType === 'company') {
    const company = await Company.create(args);

    await sendWelcomeEmailForCompany({ email: args.email });
    const authToken = getSignedJwtToken(company);

    // Delete any other documents with the same email where the 'isAccountActivated' field is set to false
    await Company.deleteMany({ email: args.email, isAccountActivated: false });

    return res.status(200).json({
      success: true,
      company: company,
      authToken: authToken,
    });
  } else {
    const user = await User.create(args);
    await sendWelcomeEmailForUser({ email: args.email, first_name });
    const authToken = getSignedJwtToken(user);

    // Delete any other documents with the same email where the 'isAccountActivated' field is set to false
    await User.deleteMany({ email: args.email, isAccountActivated: false });

    return res.status(200).json({
      success: true,
      user: user,
      authToken: authToken,
    });
  }
});

module.exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const { accountType } = args;
  // validate arguments
  const model = accountType === 'company' ? Company : User;
  const encryptedToken = getEncryptedToken(args.token);

  const user = await model.findOne({
    accountActivationToken: encryptedToken,
    isAccountActivated: false,
  });

  if (!user) {
    return next(
      new ErrorResponse(404, {
        messageEn: 'Invalid token',
        messageGe: 'Ungültiges Token',
      })
    );
  }

  if (new Date(user.accountActivationTokenExpiry) < new Date()) {
    user.accountActivationToken = undefined;
    user.accountActivationCode = undefined;
    user.accountActivationTokenExpiry = undefined;
    await user.save();
    return next(
      new ErrorResponse(400, {
        messageEn: 'Registration session expired',
        messageGe: 'Die Registrierungssitzung ist abgelaufen',
      })
    );
  }

  if (user.accountActivationCode !== args.code) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Incorrect code',
        messageGe: 'Falscher Code',
      })
    );
  }

  user.isAccountActivated = true;
  user.accountActivationToken = undefined;
  user.accountActivationCode = undefined;
  user.accountActivationTokenExpiry = undefined;
  await user.save();

  const { email, first_name } = user;
  if (accountType === 'company') {
    await sendWelcomeEmailForCompany({ email });
    const authToken = getSignedJwtToken(user);

    // Delete any other documents with the same email where the 'isAccountActivated' field is set to false
    await Company.deleteMany({ email: email, isAccountActivated: false });

    res.status(200).json({
      success: true,
      authToken: authToken,
      company: user,
    });
  } else {
    await sendWelcomeEmailForUser({ email, first_name });
    const authToken = getSignedJwtToken(user);

    // Delete any other documents with the same email where the 'isAccountActivated' field is set to false
    await User.deleteMany({ email: email, isAccountActivated: false });

    res.status(200).json({
      success: true,
      authToken: authToken,
      user: user,
    });
  }
});

module.exports.loginWithEmail = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const { accountType } = args;

  // validate arguments
  const model = accountType === 'company' ? Company : User;
  let user = await model
    .findOne({
      email: args.email,
      isAccountActivated: true,
      registeredWith: 'email',
    })
    .select('+password');

  if (!user) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Invalid credentials',
        messageGe: 'Ungültige Anmeldeinformationen',
      })
    );
  }

  const isPasswordMatch = await confirmPassword(user.password, args.password);

  if (!isPasswordMatch) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Invalid credentials',
        messageGe: 'Ungültige Anmeldeinformationen',
      })
    );
  }

  const authToken = getSignedJwtToken(user);

  user = await model.findById(user._id);
  if (accountType === 'company') {
    return res.status(200).json({
      success: true,
      authToken: authToken,
      company: user,
    });
  } else {
    return res.status(200).json({
      success: true,
      authToken: authToken,
      user: user,
    });
  }
});

module.exports.loginWithGoogle = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const { accountType } = args;

  // validate arguments
  const model = accountType === 'company' ? Company : User;

  let user = await model.findOne({
    googleAuthToken: args.idToken,
    isAccountActivated: true,
  });

  console.log(user);
  if (!user) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'Account not registered',
        messageGe: 'Konto nicht registriert',
      })
    );
  }

  const authToken = getSignedJwtToken(user);

  user = await model.findById(user._id);

  if (accountType === 'company') {
    return res.status(200).json({
      success: true,
      authToken: authToken,
      company: user,
    });
  } else {
    return res.status(200).json({
      success: true,
      authToken: authToken,
      user: user,
    });
  }
});

module.exports.sendResetPasswordCode = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const { accountType, email } = args;

  // validate arguments
  const model = accountType === 'company' ? Company : User;

  const user = await model.findOne({
    email: email,
    registeredWith: 'email',
    isAccountActivated: true,
  });

  if (!user) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'No account with such email',
        messageGe: 'Kein Konto mit einer solchen E-Mail',
      })
    );
  }

  const { token, encryptedToken, tokenExpiry, code } = generateVerificationCode(
    20,
    10
  );

  user.resetPasswordCode = code;
  user.resetPasswordToken = encryptedToken;
  user.resetPasswordTokenExpiry = tokenExpiry;
  await user.save();

  if (accountType === 'company') {
    await sendResetPasswordEmailForCompany(email, code);
  } else {
    await sendResetPasswordEmailForUser(email, code);
  }

  // Send email
  return res.status(200).json({
    success: true,
    token: token,
  });
});

module.exports.verifyResetPasswordCode = asyncHandler(
  async (req, res, next) => {
    const args = req.body;
    const { accountType } = args;
    // validate arguments
    const model = accountType === 'company' ? Company : User;
    const encryptedToken = getEncryptedToken(args.token);

    const user = await model.findOne({
      resetPasswordToken: encryptedToken,
    });

    console.log(user);

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
      user.resetPasswordCode = undefined;
      user.resetPasswordTokenExpiry = undefined;
      await user.save();
      return next(
        new ErrorResponse(400, {
          messageEn: 'Reset password session expired',
          messageGe:
            'Die Sitzung zum Zurücksetzen des Passworts ist abgelaufen',
        })
      );
    }

    if (user.resetPasswordCode !== args.code) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Incorrect code',
          messageGe: 'Falscher Code',
        })
      );
    }

    res.status(200).json({
      success: true,
      token: args.token,
    });
  }
);

module.exports.resetPassword = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const { accountType } = args;
  // validate arguments
  const model = accountType === 'company' ? Company : User;
  const encryptedToken = getEncryptedToken(args.token);

  const user = await model.findOne({
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
    user.resetPasswordCode = undefined;
    user.resetPasswordTokenExpiry = undefined;
    await user.save();
    return next(
      new ErrorResponse(400, {
        messageEn: 'Reset password session expired',
        messageGe: 'Die Sitzung zum Zurücksetzen des Passworts ist abgelaufen',
      })
    );
  }

  user.password = await generateEncryptedPassword(args.password);
  user.resetPasswordToken = undefined;
  user.resetPasswordCode = undefined;
  user.resetPasswordTokenExpiry = undefined;

  await user.save();

  res.status(200).json({
    success: true,
  });
});

module.exports.deleteAccount = asyncHandler(async (req, res, next) => {
  const args = req.body;
  const { accountType, email } = args;

  // validate arguments
  const model = accountType === 'company' ? Company : User;

  const user = await model.findOne({ email: email });
  if (!user) {
    return next(
      new ErrorResponse(400, {
        messageEn: 'User not found',
        messageGe: 'Benutzer nicht gefunden',
      })
    );
  }

  await model.findByIdAndRemove(user._id);

  if (accountType === 'company') {
    return res.status(200).json({
      success: true,
      company: user,
    });
  } else {
    return res.status(200).json({
      success: true,
      user: user,
    });
  }
});
