const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  company_name: {
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
    default: 'company',
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

  companyType: String,
  employeeCount: String,
  phone: String,
  country: String,
  state: String,
  city: String,

  photo: String,
  bio: String,

  businessDoc: [String],

  online: Boolean,
  typing: Boolean,
  socketId: String,

  accountActivationToken: String,
  accountActivationCode: String,
  accountActivationTokenExpiry: Date,

  resetPasswordToken: String,
  resetPasswordCode: String,
  resetPasswordTokenExpiry: Date,

  lastTimeNewApplicantsWasViewed: Date,

  unreadNotifications: {
    type: Number,
    default: 0,
  },

  notificationSettings: {
    onMessageReceived: {
      type: Boolean,
      default: true,
    },

    onApplicantApplied: {
      type: Boolean,
      default: true,
    },

    onJobReported: {
      type: Boolean,
      default: true,
    },

    onJobPosted: {
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

// Cascade delete jobs
CompanySchema.pre('remove', async function (next) {
  await this.model('Job').deleteMany({ company: this._id });
  next();
});

module.exports = mongoose.model('Company', CompanySchema);
