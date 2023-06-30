const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const Chat = require('../models/Chat');

module.exports.getChats = asyncHandler(async (req, res, next) => {
  const query = req.query;
  const user = req.user;
  const accountType = user.accountType;

  const searchQuery = {};
  if (accountType === 'company') {
    searchQuery.company = user.id;
  }

  if (accountType === 'user') {
    searchQuery.user = user.id;
  }

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

module.exports.postChat = asyncHandler(async (req, res, next) => {
  const args = req.body;
  // validate arguments
  args.company = req.user.id;
  let chat = await chat.create(args);

  chat = await chat
    .findById(chat._id)
    .populate('company')
    .populate('applicants.profile');
  return res.status(201).json({ success: true, chat: chat });
});