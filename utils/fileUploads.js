const AWS = require('aws-sdk');

const getS3SignedUrl = (key, contentType) => {
  var params = {
    Bucket: process.env.AWS_FILEUPLOAD_BUCKET,
    Key: key,
    ContentType: contentType,
  };

  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  });

  return s3.getSignedUrl('putObject', params);
};

module.exports = { getS3SignedUrl };
