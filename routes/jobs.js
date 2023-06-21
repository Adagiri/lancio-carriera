const express = require('express');

const {
  getCompanyJobs,
  postJob,
  getJobs,
  getJobById,
  applyToJob,
} = require('../controllers/jobs');
const { protectCompany, protectUser, protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/company', protectCompany, getCompanyJobs);
router.get('/', protectCompany, getJobs);
router.get('/:id', protect, getJobById);
router.post('/', protectCompany, postJob);
router.post('/apply', protect, applyToJob);

module.exports = router;
