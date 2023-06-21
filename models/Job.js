const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  company: { type: mongoose.ObjectId, ref: 'Company', required: true },
  position: { type: String, required: true },
  type: { type: String, required: true },
  about: { type: String, required: true },
  salary: { type: String, required: true },
  requirements: { type: [String], required: true },
  responsibilities: { type: [String], required: true },
  isHiringUrgently: { type: Boolean, required: true },
  allowMultipleCandidate: { type: Boolean, required: true },
  isClosed: { type: Boolean, default: false },
  isRemote: { type: Boolean, default: false },
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
      coverLetter: { type: String, required: true },
      resume: { type: [String], required: true },
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
