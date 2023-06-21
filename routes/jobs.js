const express = require('express');

const {
  getCompanyJobs,
  postJob,
  editJob,
  getJobs,
  getJobById,
  applyToJob,
} = require('../controllers/jobs');
const { protectCompany, protectUser, protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/company', protectCompany, getCompanyJobs);
router.get('/', protect, getJobs);
router.get('/:id', protect, getJobById);

router.post('/', protectCompany, postJob);
router.put('/', protectCompany, editJob);
router.put('/apply', protect, applyToJob);

module.exports = router;
