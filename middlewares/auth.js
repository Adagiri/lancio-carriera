const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/User');
const Company = require('../models/Company');
const Admin = require('../models/Admin');

module.exports.protectUser = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new ErrorResponse(401, {
        messageEn: 'Please log in to continue',
        messageGe: 'bitte einloggen zum Fortfahren',
      })
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    console.log(decoded);
    req.user = await User.findById(decoded.id).select(
      'first_name last_name email registeredWith accountType'
    );

    if (!req.user) {
      return next(
        new ErrorResponse(403, {
          messageEn: 'You are not authorized',
          messageGe: 'Sie sind nicht berechtigt',
        })
      );
    }
    req.user.id = req.user._id;

    next();
  } catch (err) {
    console.log(err);

    if (err.message === 'jwt expired') {
      return next(
        new ErrorResponse(401, {
          messageEn: 'Please log in to continue',
          messageGe: 'bitte einloggen zum Fortfahren',
        })
      );
    }

    if (err.message === 'invalid token') {
      return next(
        new ErrorResponse(401, {
          messageEn: 'Please log in to continue',
          messageGe: 'bitte einloggen zum Fortfahren',
        })
      );
    }

    return next(
      new ErrorResponse(500, {
        messageEn: 'Network error',
        messageGe: 'Netzwerkfehler',
      })
    );
  }
});

module.exports.protectCompany = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new ErrorResponse(401, {
        messageEn: 'Please log in to continue',
        messageGe: 'bitte einloggen zum Fortfahren',
      })
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await Company.findById(decoded.id).select(
      'company_name email registeredWith accountType lastTimeNewApplicantsWasViewed isAccountVerified'
    );
    if (!req.user) {
      return next(
        new ErrorResponse(403, {
          messageEn: 'You are not authorized',
          messageGe: 'Sie sind nicht berechtigt',
        })
      );
    }

    req.user.id = req.user._id;
    next();
  } catch (err) {
    console.log(err);

    if (err.message === 'jwt expired') {
      return next(
        new ErrorResponse(401, {
          messageEn: 'Please log in to continue',
          messageGe: 'bitte einloggen zum Fortfahren',
        })
      );
    }

    if (err.message === 'invalid token') {
      return next(
        new ErrorResponse(401, {
          messageEn: 'Please log in to continue',
          messageGe: 'bitte einloggen zum Fortfahren',
        })
      );
    }

    return next(
      new ErrorResponse(500, {
        messageEn: 'Network error',
        messageGe: 'Netzwerkfehler',
      })
    );
  }
});

module.exports.protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new ErrorResponse(401, {
        messageEn: 'Please log in to continue',
        messageGe: 'bitte einloggen zum Fortfahren',
      })
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await Admin.findById(decoded.id).select(
      'name email accountType role'
    );
    if (!req.user) {
      return next(
        new ErrorResponse(403, {
          messageEn: 'You are not authorized',
          messageGe: 'Sie sind nicht berechtigt',
        })
      );
    }

    req.user.id = req.user._id;
    next();
  } catch (err) {
    console.log(err);

    if (err.message === 'jwt expired') {
      return next(
        new ErrorResponse(401, {
          messageEn: 'Please log in to continue',
          messageGe: 'bitte einloggen zum Fortfahren',
        })
      );
    }

    if (err.message === 'invalid token') {
      return next(
        new ErrorResponse(401, {
          messageEn: 'Please log in to continue',
          messageGe: 'bitte einloggen zum Fortfahren',
        })
      );
    }

    return next(
      new ErrorResponse(500, {
        messageEn: 'Network error',
        messageGe: 'Netzwerkfehler',
      })
    );
  }
});

module.exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new ErrorResponse(401, {
        messageEn: 'Please log in to continue',
        messageGe: 'bitte einloggen zum Fortfahren',
      })
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const company = await Company.findById(decoded.id).select(
      '_id company_name email registeredWith accountType lastTimeNewApplicantsWasViewed isAccountVerified'
    );
    const user = await User.findById(decoded.id).select(
      '_id first_name last_name email registeredWith accountType'
    );
    const admin = await Admin.findById(decoded.id).select(
      '_id name email accountType role'
    );

    if (!company && !user && !admin) {
      return next(
        new ErrorResponse(403, {
          messageEn: 'You are not authorized',
          messageGe: 'Sie sind nicht berechtigt',
        })
      );
    }

    user && (req.user = user);
    company && (req.user = company);
    admin && (req.user = admin);

    req.user.id = req.user._id;

    next();
  } catch (err) {
    if (err.message === 'jwt expired') {
      return next(
        new ErrorResponse(401, {
          messageEn: 'Please log in to continue',
          messageGe: 'bitte einloggen zum Fortfahren',
        })
      );
    }
    if (err.message === 'invalid token') {
      return next(
        new ErrorResponse(401, {
          messageEn: 'Please log in to continue',
          messageGe: 'bitte einloggen zum Fortfahren',
        })
      );
    }

    return next(
      new ErrorResponse(500, {
        messageEn: 'Network error',
        messageGe: 'Netzwerkfehler',
      })
    );
  }
});

module.exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorResponse(403, `Unauthorized`));
    }
    next();
  };
};
