const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  company: { type: mongoose.ObjectId, ref: 'Company', required: true },
  position: { type: String, required: true },
  type: { type: String, required: true },
  category: { type: String },
  images: { type: [String] },
  location: { type: String },
  about: { type: String, required: true },
  salary: { type: String },
  requirements: { type: [String], required: true },
  responsibilities: { type: [String], required: true },
  isClosed: { type: Boolean, default: false },
  reportedBy: { type: [mongoose.ObjectId], ref: 'User' },
  applicantsCount: {
    type: Number,
    default: 0,
  },
  applicants: [
    {
      profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      coverLetter: { type: String },
      resume: { type: [String] },
      createdAt: { type: Date, default: Date.now },
      status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'Accepted'],
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', JobSchema);
