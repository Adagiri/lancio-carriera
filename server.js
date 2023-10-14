const path = require('path');

const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const mongoose = require('mongoose');
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
const Chat = require('./models/Chat');
const Company = require('./models/Company');
const User = require('./models/User');
const { generateRandomNumbers } = require('./utils/general');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const { connectDB } = require('./config/db');
const UserNotification = require('./models/UserNotification');
const CompanyNotification = require('./models/CompanyNotification');

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

const httpServer = http.Server(app);
const io = socketIO(httpServer);

io.on('connection', (socket) => {
  console.log('A user connected');

  // Set user as online when connected
  socket.on('setOnline', ({ userId, accountType }) => {
    const model = accountType === 'personal' ? User : Company;
    model
      .findByIdAndUpdate(
        userId,
        { online: true, socketId: socket.id },
        { new: true }
      )
      .then((user) => {
        console.log(`${user.first_name || user.company_name} is online`);
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
      { online: false, socketId: undefined },
      { new: true }
    )
      .then((user) => {
        if (user) {
          console.log(`${user?.first_name} is offline`);
          io.emit('userStatus', user);
        }
      })
      .catch((error) => {
        console.error('Error setting user offline:', error);
      });

    Company.findOneAndUpdate(
      { socketId: socket.id },
      { online: false, socketId: undefined },
      { new: true }
    )
      .then((company) => {
        if (company) {
          console.log(`${company.company_name} is offline`);
          io.emit('userStatus', company);
        }
      })
      .catch((error) => {
        console.error('Error setting user offline:', error);
      });
  });

  socket.on('joinChat', async ({ chatId, userId }) => {
    console.log('A user joined chat');
    socket.join(chatId);

    const chat = await Chat.findById(chatId).select('company user');

    const companyId = chat.company;
    const jobSeekerId = chat.user;
    const isCompany = userId.toString() === companyId.toString();
    const isUser = userId.toString() === jobSeekerId.toString();

    if (isCompany) {
      chat.companyUnreadMessages = 0;
    }

    if (isUser) {
      chat.userUnreadMessages = 0;
    }

    await chat.save();
  });

  // Handle typing status
  socket.on('startedTyping', ({ chatId, userId }) => {
    console.log(chatId, userId);
    io.to(chatId).emit('userStartedTyping', userId);
    console.log('done');

    // socket.to(chatId).emit('userStartedTyping', userId);
  });

  // Handle stop typing status
  socket.on('stoppedTyping', ({ chatId, userId }) => {
    io.to(chatId).emit('userStoppedTyping', userId);
    // socket.to(chatId).emit('userStoppedTyping', userId);
  });

  // Handle message sending
  socket.on('messageSent', async ({ chatId, userId, message }) => {
    // Save message to the database
    console.log(chatId, userId, message, 'chatId , userId, message');
    const newMessage = message;
    const room = io.sockets.adapter.rooms.get(chatId);
    console.log(room, 'room');
    const numClients = room ? room.size : 0;
    console.log(numClients);

    const chat = await Chat.findById(chatId)
      .populate({
        path: 'company',
        select: 'company_name photo notificationSettings',
      })
      .populate({
        path: 'user',
        select: 'first_name photo notificationSettings',
      });

    newMessage.owner = userId;
    newMessage.id = generateRandomNumbers(10);
    chat.lastMessage = newMessage;
    chat.messages.push(newMessage);
    chat.updatedAt = new Date();

    const companyId = chat.company._id;
    const jobSeekerId = chat.user._id;
    const isCompany = userId.toString() === companyId.toString();
    const isUser = userId.toString() === jobSeekerId.toString();

    if (numClients === 1) {
      isCompany && (chat.userUnreadMessages = chat.userUnreadMessages + 1);

      isUser && (chat.companyUnreadMessages = chat.companyUnreadMessages + 1);
    }

    console.log(chat, 'chat detail from socket-io');
    await chat.save();

    await sendNotificationOnMessageReceived({
      chat,
      newMessage,
      isCompany,
      isUser,
    });

    // Emit the message to all connected clients in the chat room
    io.to(chatId).emit('newMessage', message);
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

const sendNotificationOnMessageReceived = async ({
  chat,
  newMessage,
  isCompany,
  isUser,
}) => {
  const { company, user } = chat;

  const fileName = newMessage.file?.name ? newMessage.file.name : '';
  const body =
    newMessage.type === 'text'
      ? `Message: ${newMessage.text}`
      : `Sent a file ${fileName}`;

  const bodyGe =
    newMessage.type === 'text'
      ? `Nachricht: ${newMessage.text}`
      : `Habe eine Datei gesendet ${fileName}`;

  if (isCompany) {
    // Save notification for User(Job seeker)
    if (user.notificationSettings.messages) {
      // Check if there is an unviewed existing notification for the current chat
      const existingNotification = await UserNotification.findOne({
        owner: user._id,
        case: 'Message Received',
        subjectType: 'Chat',
        subject: chat._id,
        hasBeenRead: false,
      });

      if (existingNotification) {
        return;
      } else {
        // Save notification
        const arguments = {
          owner: user._id,
          case: 'Message Received',
          title: company.company_name,
          titleGe: company.company_name,
          body: body,
          bodyGe: bodyGe,
          company: company._id,
          subject: chat._id,
          subjectType: 'Chat',
        };

        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
          await User.findByIdAndUpdate(
            user._id,
            {
              $inc: { unreadNotifications: 1 },
            },
            { session }
          );

          await UserNotification.create([arguments], {
            session,
          });
        });
        session.endSession();
      }
    }
  }

  if (isUser) {
    // Save notification for Company(Job poster)
    if (company.notificationSettings.messages) {
      // Check if there is an unviewed existing notification for the current chat
      const existingNotification = await CompanyNotification.findOne({
        owner: company._id,
        case: 'Message Received',
        subjectType: 'Chat',
        subject: chat._id,
        hasBeenRead: false,
      });

      if (existingNotification) {
        return;
      } else {
        const arguments = {
          owner: company._id,
          case: 'Message Received',
          title: user.first_name,
          titleGe: user.first_name,
          body: body,
          bodyGe: bodyGe,
          user: user._id,
          subject: chat._id,
          subjectType: 'Chat',
        };

        const session = await mongoose.startSession();
        await session.withTransaction(async () => {
          await Company.findByIdAndUpdate(
            company._id,
            {
              $inc: { unreadNotifications: 1 },
            },
            { session }
          );

          await CompanyNotification.create([arguments], {
            session,
          });
        });
        session.endSession();
      }
    }
  }
};

module.exports.io = io;
