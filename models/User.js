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
    required: true,
    unique: true,
    lowercase: true, // Store emails in lowercase to ensure uniqueness
    validate: {
      validator: function (value) {
        // Regular expression for basic email validation
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(value);
      },
      message: 'Invalid email format',
    },
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

  savedJobs: {
    type: [{ type: mongoose.ObjectId, ref: 'Job' }],
  },

  unreadNotifications: {
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

    onUserReported: {
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
