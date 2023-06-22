const mongoose = require('mongoose');

const UserProfileViewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  views: [
    {
      _id: false,
      company: {
        type: String,
        required: true,
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model('UserProfileView', UserProfileViewSchema);
