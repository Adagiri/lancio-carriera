const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const Chat = require('../models/Chat');
const { generateRandomNumbers } = require('../utils/general');

module.exports.getChats = asyncHandler(async (req, res, next) => {
  const query = req.query;
  const user = req.user;
  const accountType = user.accountType;

  const searchQuery = { lastMessage: { $ne: undefined } };
  if (accountType === 'company') {
    searchQuery.company = user.id;
  }

  if (accountType === 'user') {
    searchQuery.user = user.id;
  }

  console.log(searchQuery);

  let data = await Chat.find(searchQuery)
    .sort({ _id: -1 })
    .select('-messages')
    .populate({ path: 'company', select: 'company_name photo accountType' })
    .populate({
      path: 'user',
      select: 'first_name last_name photo accountType',
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

  return res.json({
    chats: data,
    count: data.length,
  });
});

module.exports.getChatById = asyncHandler(async (req, res, next) => {
  const chatId = req.params.id;

  let chat = await Chat.findById(chatId)
    .populate({ path: 'company', select: 'company_name photo accountType' })
    .populate({
      path: 'user',
      select: 'first_name last_name photo accountType',
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

  if (req.user.accountType === 'user') {
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
      .populate({ path: 'company', select: 'company_name photo accountType' })
      .populate({
        path: 'user',
        select: 'first_name last_name photo accountType',
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
