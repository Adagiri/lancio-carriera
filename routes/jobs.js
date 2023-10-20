const express = require('express');

const {
  getJobPostings,
  postJob,
  editJob,
  getJobListings,
  getJobById,
  applyToJob,
  acceptApplicant,
  getUserJobs,
  getNewApplicantsList,
  getNewApplicantsCount,
  reportJob,
  unsaveAJob,
  saveAJob,
  getJobListingsPostedByCompany,
  closeAJob,
} = require('../controllers/jobs');
const { protectCompany, protectUser, protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/company', protectCompany, getJobPostings);
router.get('/company/jobs', protectCompany, getJobPostings);
router.get('/company/new-applicants', protectCompany, getNewApplicantsList);
router.get(
  '/company/new-applicants-count',
  protectCompany,
  getNewApplicantsCount
);

router.get('/', protect, getJobListings);
router.get('/user', protectUser, getUserJobs);
router.get('/by-a-company/:companyId', protect, getJobListingsPostedByCompany);
router.get('/:id', protect, getJobById);

router.post('/', protectCompany, postJob);
router.put('/', protectCompany, editJob);
router.put('/apply', protectUser, applyToJob);
router.put('/close-job', protectCompany, closeAJob);
router.put('/report', protectUser, reportJob);
router.post('/save', protectUser, saveAJob);
router.post('/unsave', protectUser, unsaveAJob);
router.put('/accept-applicant', protectCompany, acceptApplicant);

module.exports = router;
