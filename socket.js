const Chat = require('./models/Chat');
const Company = require('./models/Company');
const User = require('./models/User');
const { io } = require('./server');
const { generateRandomNumbers } = require('./utils/general');

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

  socket.on('joinChat', ({ chatId }) => {
    socket.join(chatId);
  });

  // Handle typing status
  socket.on('startedTyping', ({ chatId, userId }) => {
    socket.to(chatId).emit('userStartedTyping', userId);
  });

  // Handle stop typing status
  socket.on('stoppedTyping', ({ chatId, userId }) => {
    socket.to(chatId).emit('userStoppedTyping', userId);
  });

  // Handle message sending
  socket.on('messageSent', async ({ chatId, userId, message }) => {
    // Save message to the database
    const newMessage = message;
    const room = io.sockets.adapter.rooms.get(chatId);
    const numClients = room ? room.size : 0;

    const chat = await Chat.findById(chatId);

    newMessage.owner = userId;
    newMessage.id = generateRandomNumbers(10);
    chat.lastMessage = newMessage;
    chat.messages.push(newMessage);
    chat.updatedAt = new Date();
    if (numClients < 1) {
      userId.toString() === chat.company.toString() &&
        (chat.userUnreadMessages = chat.userUnreadMessages + 1);

      userId.toString() === chat.user.toString() &&
        (chat.companyUnreadMessages = chat.companyUnreadMessages + 1);
    }

    await chat.save();

    // Emit the message to all connected clients in the chat room
    io.to(chatId).emit('newMessage', message);
  });
});
