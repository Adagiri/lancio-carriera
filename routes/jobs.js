const express = require('express');

const {
  getCompanyJobs,
  postJob,
  editJob,
  getJobs,
  getJobById,
  applyToJob,
  acceptApplicant,
  getUserJobs,
  getNewApplicantsList,
  getNewApplicantsCount,
  reportJob,
  unsaveAJob,
  saveAJob,
  getJobsPostedByCompany,
} = require('../controllers/jobs');
const { protectCompany, protectUser, protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/company', protectCompany, getCompanyJobs);
router.get('/company/jobs', protectCompany, getCompanyJobs);
router.get('/company/new-applicants', protectCompany, getNewApplicantsList);
router.get(
  '/company/new-applicants-count',
  protectCompany,
  getNewApplicantsCount
);

router.get('/user', protectUser, getUserJobs);
router.get('/', protect, getJobs);
router.get('/:id', protect, getJobById);

router.post('/', protectCompany, postJob);
router.put('/', protectCompany, editJob);
router.put('/apply', protectUser, applyToJob);
router.post('/report', protectUser, reportJob);
router.post('/save', protectUser, saveAJob);
router.put('/unsave', protectUser, unsaveAJob);
router.put('/accept-applicant', protectCompany, acceptApplicant);

module.exports = router;
