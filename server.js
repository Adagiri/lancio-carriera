const path = require('path');

const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./models/middlewares/error');
const http = require('http');
const jobs = require('./routes/jobs');
const auth = require('./routes/auth');
const users = require('./routes/users');
const companies = require('./routes/companies');
const fileUploads = require('./routes/fileUploads');

const { connectDB } = require('./config/db');

dotenv.config({ path: './config/config.env' });

connectDB();

const app = express();

if (process.env.TEST_ENV) {
  app.use(cors());
}

app.use(cookieParser());

app.use(express.json());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Set static folder
// app.use(express.static(path.join(__dirname, 'public')));

const httpServer = http.Server(app);

app.get('/', (req, res) => {
  return res.send('Hello there!');
});

// Mount routers
app.use('/api/v1/jobs', jobs);
app.use('/api/v1/auth', auth);
app.use('/api/v1/users', users);
app.use('/api/v1/companies', companies);
app.use('/api/v1/file-uploads', fileUploads);

app.use(errorHandler);

const PORT = process.env.PORT || 8000;

const server = httpServer.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  );
});

process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);

  server.close(() => process.exit(1));
});
