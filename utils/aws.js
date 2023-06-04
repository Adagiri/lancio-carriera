const { ses } = require('../services/AwsService');
const AWS = require('aws-sdk');

const generateEmailArguments = (from, to, subject, message) => {
  if (!from) {
    from = `Lancio Carriera <${process.env.MAIN_EMAIL}>`;
  }

  return {
    Destination: {
      ToAddresses: typeof to === 'string' ? [to] : to,
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: message,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: from,
    ReplyToAddresses: ['no-reply@lanciocarriera.com'],
  };
};

const sendEmail = (params) => {
  const ses = new AWS.SES({
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY,
    },
  });
  return ses.sendEmail(params).promise();
};

module.exports = {
  sendEmail,
  generateEmailArguments,
};
