const mongoose = require('mongoose');

const CompanyNotificationSchema = new mongoose.Schema({
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
      'Applicant Applied',
      'Company Reported',
      'Job Reported',
      'Job Posted',
      'Job Closed',
    ],
  },

  title: {
    type: String,
    required: true,
  },

  body: {
    type: String,
    required: true,
  },

  user: { type: mongoose.ObjectId, ref: 'User' },

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

module.exports = mongoose.model(
  'CompanyNotification',
  CompanyNotificationSchema
);
