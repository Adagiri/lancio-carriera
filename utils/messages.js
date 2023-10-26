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
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
            text-align: center;
        }
        .container {
            background-color: #fff;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
        }
        p {
            font-size: 16px;
            color: #555;
        }
    </style>
    <title>Account Aktivierung</title>
</head>
<body>
    <div class="container">
        <h1>Willkommen, ${first_name}!</h1>
        <p>Um Ihr Konto zu aktivieren, verwenden Sie bitte den folgenden Code:</p>
        <p style="font-size: 24px; color: #007BFF;">${code}</p>
    </div>
</body>
</html>
`
  try {
    const emailArgs = generateEmailArguments(
      null,
      email,
      'aktiviere deinen Account',
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
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f7f7f7;
            margin: 0;
            padding: 0;
            text-align: center;
        }
        .container {
            background-color: #fff;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
        }
        p {
            font-size: 16px;
            color: #555;
        }
    </style>
    <title>Account Aktivierung</title>
</head>
<body>
    <div class="container">
    <h1>Willkommen!</h1>
        <p>Um Ihr Konto zu aktivieren, verwenden Sie bitte den folgenden Code:</p>
        <p style="font-size: 24px; color: #007BFF;">${code}</p>
    </div>
</body>
</html>
`
  try {
    const emailArgs = generateEmailArguments(
      null,
      email,
      'aktiviere deinen Account',
      message
    );
    await sendEmail(emailArgs);
  } catch (error) {
    console.log(error);
  }
};

module.exports.sendResetPasswordEmailForUser = async (email, code) => {
  const message = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moniedrop</title>
</head>
<body>
    <p>Hi, please use the code below to reset your password. However, if you did not initiate a reset password request, please ignore this mail</p>
    <p>>${code}</a></p>
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

module.exports.sendResetPasswordEmailForCompany = async (email, code) => {
  const message = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moniedrop</title>
</head>
<body>
    <p>Hi, please use the code below to reset your password. However, if you did not initiate a reset password request, please ignore this mail</p>
    <p>>${code}</a></p>
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

module.exports.sendPersonalizedEmailToUser = async ({
  subject,
  body,
  email,
}) => {
  const message = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lancio Carriera</title>
</head>
<body>
    <p>${body}</p>
</body>
</html>`;

  try {
    const emailArgs = generateEmailArguments(null, email, subject, message);
    await sendEmail(emailArgs);
  } catch (error) {
    console.log(error, "error whilst sending message to a user's email");
  }
};
