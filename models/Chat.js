const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  _id: false,

  id: {
    type: String,
    required: true,
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  type: {
    type: String,
    enum: ['file', 'text'],
  },

  text: {
    type: String,
  },

  file: {
    name: String,

    type: {
      type: String,
      enum: ['image', 'video', 'others'],
    },
    src: {
      type: String,
      // required: true,
    },
    contentType: {
      type: String,
      // required: true,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ChatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },

  userUnreadMessages: {
    type: Number,
    default: 0,
  },

  companyUnreadMessages: {
    type: Number,
    default: 0,
  },

  lastMessage: MessageSchema,

  messages: [MessageSchema],

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model('Chat', ChatSchema);
