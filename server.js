const path = require('path');

const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const colors = require('colors');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const errorHandler = require('./middlewares/error');
const http = require('http');
const jobs = require('./routes/jobs');
const chats = require('./routes/chats');
const auth = require('./routes/auth');
const users = require('./routes/users');
const companies = require('./routes/companies');
const fileUploads = require('./routes/fileUploads');
const socketIO = require('socket.io');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

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
const io = socketIO(httpServer);

io.on('connection', (socket) => {
  console.log('A user connected');

  // Set user as online when connected
  socket.on('setOnline', (id) => {
    User.findOneAndUpdate({ username }, { online: true }, { new: true })
      .then((user) => {
        console.log(`${user.username} is online`);
        io.emit('userStatus', user);
      })
      .catch((error) => {
        console.error('Error setting user online:', error);
      });
  });

  // Set user as offline when disconnected
  socket.on('disconnect', () => {
    User.findOneAndUpdate(
      { socketId: socket.id },
      { online: false },
      { new: true }
    )
      .then((user) => {
        console.log(`${user.username} is offline`);
        io.emit('userStatus', user);
      })
      .catch((error) => {
        console.error('Error setting user offline:', error);
      });
  });

  // Handle typing status
  socket.on('typing', (username) => {
    User.findOneAndUpdate({ username }, { typing: true }, { new: true })
      .then((user) => {
        console.log(`${user.username} is typing`);
        io.emit('userTyping', user);
      })
      .catch((error) => {
        console.error('Error setting user typing status:', error);
      });
  });

  // Handle stop typing status
  socket.on('stopTyping', (username) => {
    User.findOneAndUpdate({ username }, { typing: false }, { new: true })
      .then((user) => {
        console.log(`${user.username} stopped typing`);
        io.emit('userTyping', user);
      })
      .catch((error) => {
        console.error('Error setting user typing status:', error);
      });
  });
});

app.get('/', (req, res) => {
  return res.send('Hello there!');
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount routers
app.use('/api/v1/jobs', jobs);
app.use('/api/v1/chats', chats);
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

module.exports.io = io;
