const asyncHandler = require('../models/middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const { getS3SignedUrl } = require('../utils/fileUploads');
const { generateRandomNumbers } = require('../utils/general');

module.exports.requestFileUploadUrl = asyncHandler(async (req, res, next) => {
  const { purpose, contentType } = req.query;

  if (purpose === 'profile-photo') {
    if (['image/jpeg', 'image/png'].indexOf(contentType) === -1) {
      return next(
        new ErrorResponse(400, {
          messageEn: 'Please upload a jpeg or png file',
          messageGe: 'Bitte laden Sie eine JPEG- oder PNG-Datei hoch',
        })
      );
    }
  }

  let key = `${purpose}/${generateRandomNumbers(30)}.${contentType.slice(6)}`;
  key = process.env.TEST_ENV === 'false' ? key : `test/${key}`;
  const uploadUrl = getS3SignedUrl(key, contentType);

  return res.status(200).json({ key: `/${key}`, uploadUrl });
});
