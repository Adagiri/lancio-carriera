const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  first_name: {
    type: String,
    trim: true,
  },

  last_name: {
    type: String,
    trim: true,
  },

  email: {
    type: String,
    required: [true, 'Please add an email'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },

  password: {
    type: String,
    select: false,
  },

  googleAuthToken: { type: String, select: false },

  accountType: {
    type: String,
    default: 'personal',
    enum: ['personal', 'company'],
  },

  registeredWith: {
    type: String,
    required: true,
    enum: ['email', 'google'],
  },

  isAccountActivated: {
    type: Boolean,
    default: false,
  },

  isProfileSetupComplete: {
    type: Boolean,
    default: false,
  },

  sex: String,
  age: Number,
  phone: String,
  country: String,
  state: String,
  city: String,

  photo: String,
  bio: String,

  resume: [String],

  softSkills: [String],

  online: Boolean,
  typing: Boolean,
  socketId: String,

  accountActivationToken: String,
  accountActivationCode: String,
  accountActivationTokenExpiry: Date,

  resetPasswordToken: String,
  resetPasswordCode: String,
  resetPasswordTokenExpiry: Date,

  unviewedNotifications: {
    type: Number,
    default: 0,
  },

  notificationSettings: {
    onMessageReceived: {
      type: Boolean,
      default: true,
    },

    onApplicationAccepted: {
      type: Boolean,
      default: true,
    },

    onJobClosed: {
      type: Boolean,
      default: true,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('remove', async function (next) {
  next();
});

module.exports = mongoose.model('User', UserSchema);
