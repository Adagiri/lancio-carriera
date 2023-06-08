const jwt = require('jsonwebtoken');
const asyncHandler = require('./async');
const ErrorResponse = require('../../utils/errorResponse');
const User = require('../User');
const Company = require('../Company');

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
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(
        new ErrorResponse(403, {
          messageEn: 'You are not authorized',
          messageGe: 'Sie sind nicht berechtigt',
        })
      );
    }

    next();
  } catch (err) {
    console.log(err);
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
    req.company = await Company.findById(decoded.id);
    if (!req.company) {
      return next(
        new ErrorResponse(403, {
          messageEn: 'You are not authorized',
          messageGe: 'Sie sind nicht berechtigt',
        })
      );
    }

    next();
  } catch (err) {
    console.log(err);
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
    const company = await Company.findById(decoded.id).select('_id');
    const user = await User.findById(decoded.id).select('_id');

    if (!company && !user) {
      return next(
        new ErrorResponse(403, {
          messageEn: 'You are not authorized',
          messageGe: 'Sie sind nicht berechtigt',
        })
      );
    }

    next();
  } catch (err) {
    console.log(err);
    return next(
      new ErrorResponse(500, {
        messageEn: 'Network error',
        messageGe: 'Netzwerkfehler',
      })
    );
  }
});
