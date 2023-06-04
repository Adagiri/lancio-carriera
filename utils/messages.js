const { generateEmailArguments, sendEmail } = require('./aws');

module.exports.sendAccountActivationEmailForUser = async ({
  email,
  first_name,
  code,
}) => {
  const message = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moniedrop</title>
</head>
<body>
    <p>Hi ${first_name}, please use the code below to activate your account.</p>
    <p>${code}</p>
</body>
</html>`;

  try {
    const emailArgs = generateEmailArguments(
      null,
      email,
      'Activate your account',
      message
    );
    await sendEmail(emailArgs);
  } catch (error) {
    console.log(error);
  }
};

module.exports.sendAccountActivationEmailForCompany = async ({
  email,
  code,
}) => {
  const message = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moniedrop</title>
</head>
<body>
    <p>Hi, please use the code below to activate your account.</p>
    <p>${code}</p>
</body>
</html>`;

  try {
    const emailArgs = generateEmailArguments(
      null,
      email,
      'Activate your account',
      message
    );
    await sendEmail(emailArgs);
  } catch (error) {
    console.log(error);
  }
};

module.exports.sendResetPasswordEmailForUser = async (email, token) => {
  const USER_WEBSITE_HOSTNAME = process.env.USER_WEBSITE_HOSTNAME;
  const message = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moniedrop</title>
</head>
<body>
    <p>Hi, please click the link below to reset your password. However, if you did not initiate a reset password request, please ignore this mail</p>
    <p><a href='${USER_WEBSITE_HOSTNAME}/reset-password/${token}'>Reset Password</a></p>
    <p>Please note that link expires in 10 minutes</p>
</body>
</html>`;

  try {
    const emailArgs = generateEmailArguments(
      null,
      email,
      'Reset your Password',
      message
    );
    await sendEmail(emailArgs);
  } catch (error) {
    console.log(error, 'error from activation email');
  }
};

module.exports.sendWelcomeEmailForUser = async ({ first_name, email }) => {
  const message = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moniedrop</title>
</head>
<body>
    <p>Hi ${first_name}, welcome to Lancio Carriera</p>
</body>
</html>`;

  try {
    const emailArgs = generateEmailArguments(null, email, 'Welcome', message);
    await sendEmail(emailArgs);
  } catch (error) {
    console.log(error, 'error whilst sending welcome message to user');
  }
};

module.exports.sendWelcomeEmailForCompany = async ({ email }) => {
  const message = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moniedrop</title>
</head>
<body>
    <p>Hi, welcome to Lancio Carriera</p>
</body>
</html>`;

  try {
    const emailArgs = generateEmailArguments(null, email, 'Welcome', message);
    await sendEmail(emailArgs);
  } catch (error) {
    console.log(error, 'error whilst sending welcome message to user');
  }
};
