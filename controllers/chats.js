const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const Chat = require('../models/Chat');
const { generateRandomNumbers } = require('../utils/general');

module.exports.getChats = asyncHandler(async (req, res, next) => {
  const query = req.query;
  const user = req.user;
  const accountType = user.accountType;

  // Define search query to filter chats
  const searchQuery = {
    lastMessage: { $ne: undefined }, // Chats must have an existing last message
  };

  if (accountType === 'company') {
    searchQuery.company = user.id;
  }

  if (accountType === 'personal') {
    searchQuery.user = user.id;
  }

  console.log(searchQuery);

  let data = await Chat.find(searchQuery)
    .sort({ _id: -1 })
    .select('-messages')
    .populate({
      path: 'company',
      select: 'company_name photo accountType online city state country photo email',
    })
    .populate({
      path: 'user',
      select:
        'first_name last_name photo accountType online age resume email softSkills city state country photo bio',
    });

  data = data.map((chat) => {
    chat = chat.toObject();

    chat.unreadMessageCount =
      accountType === 'company'
        ? chat.companyUnreadMessages
        : chat.userUnreadMessages;

    delete chat.companyUnreadMessages;
    delete chat.userUnreadMessages;
    return chat;
  });

  // Filter the chats based on the hasBeenRead field
  const hasBeenRead = String(query.hasBeenRead);
  // If hasBeenRead is true, filter chats that have been read (unreadMessageCount <= 0)
  if (hasBeenRead === 'true') {
    data = data.filter((chat) => chat.unreadMessageCount <= 0);
  }

  // If hasBeenRead is false, filter chats that are unread (unreadMessageCount > 0)
  if (hasBeenRead === 'false') {
    data = data.filter((chat) => chat.unreadMessageCount > 0);
  }

  // Filter the chats based on the search term
  const searchTerm = query.searchTerm || '';

  // Check if a search term is provided
  if (searchTerm) {
    // Filter chats based on account type and search term
    data = data.filter((chat) => {
      if (accountType === 'personal') {
        // If account type is personal, check if company name starts with the search term
        return chat.company.company_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      } else {
        // If account type is not personal, check if user's first name starts with the search term
        return (
          chat.user.first_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          chat.user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    });
  }

  return res.json({
    chats: data,
    count: data.length,
  });
});

module.exports.getChatById = asyncHandler(async (req, res, next) => {
  const chatId = req.params.id;

  let chat = await Chat.findById(chatId)
    .populate({
      path: 'company',
      select: 'company_name photo accountType online city state country photo email',
    })
    .populate({
      path: 'user',
      select:
        'first_name last_name photo accountType online age resume email softSkills city state country photo bio',
    });

  if (!chat) {
    return next(
      new ErrorResponse(404, {
        messageEn: `chat with the ID: ${chatId} was not found`,
        messageGe: `chat mit der ID: ${chatId} wurde nicht gefunden`,
      })
    );
  }

  if (req.user.accountType === 'company') {
    chat.companyUnreadMessages = 0;
  }

  if (req.user.accountType === 'personal') {
    chat.userUnreadMessages = 0;
  }

  await chat.save();

  return res.json({
    success: true,
    chat: chat,
  });
});

module.exports.getChatsByCompanyAndUserId = asyncHandler(
  async (req, res, next) => {
    const company = req.query.companyId;
    const user = req.query.userId;

    let chat = await Chat.findOne({ company: company, user: user });

    if (!chat) {
      const newChat = {
        user: user,
        company: company,
      };
      chat = await Chat.create(newChat);
    }

    chat = await Chat.findById(chat._id)
      .populate({
        path: 'company',
        select:
          'company_name photo accountType online city state country photo email',
      })
      .populate({
        path: 'user',
        select:
          'first_name last_name photo accountType online age resume email softSkills city state country photo bio',
      });

    return res.json({
      success: true,
      chat: chat,
    });
  }
);

module.exports.postChat = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments
  const message = args.message;
  message.owner = req.user.id;
  message.id = generateRandomNumbers(10);
  args.company = args.companyId;
  args.user = args.userId;
  req.user.accountType === 'company' && (args.userUnreadMessages = 1);
  req.user.accountType === 'personal' && (args.companyUnreadMessages = 1);
  args.lastMessage = message;
  args.messages = [message];

  let chat = await Chat.create(args);

  return res.status(201).json({ success: true, chat: chat });
});

module.exports.reportChat = asyncHandler(async (req, res, next) => {
  const args = req.body;

  args.reportedBy = req.user.id;
  args.isChatClosed = true;
  let chat = await Chat.findByIdAndUpdate(args.chatId, args, { new: true });

  return res.status(200).json({ success: true, chat: chat });
});
