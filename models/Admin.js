const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },

  email: {
    type: String,
    required: true,
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

  accountType: {
    type: String,
    default: 'admin',
  },

  role: {
    type: String,
    required: true,
    default: 'moderator',
    enum: ['moderator', 'master'],
  },

  resetPasswordToken: String,
  resetPasswordTokenExpiry: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

AdminSchema.pre('remove', async function (next) {
  next();
});

module.exports = mongoose.model('Admin', AdminSchema);
