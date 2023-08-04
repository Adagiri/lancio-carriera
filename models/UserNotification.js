const mongoose = require('mongoose');

const UserNotificationSchema = new mongoose.Schema({
  owner: {
    type: mongoose.ObjectId,
    required: true,
  },

  hasBeenRead: {
    type: Boolean,
    default: false,
  },

  case: {
    type: String,
    enum: [
      'Message Received',
      'Application Accepted',
      'Job Closed',
      'User Reported',
    ],
    required: true,
  },

  title: {
    type: String,
    required: true,
  },

  body: {
    type: String,
    required: true,
  },

  company: { type: mongoose.ObjectId, ref: 'Company' },

  subject: mongoose.ObjectId,

  subjectType: {
    type: String,
    enum: ['Company', 'Chat', 'User', 'Job'],
  },

  createdAt: {
    type: Date,
    expires: 60 * 60 * 24 * 30 * 6, // Expiry time in seconds (6 months)
    default: Date.now,
  },
});

module.exports = mongoose.model('UserNotification', UserNotificationSchema);
