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

router.get('/', protect, getJobs);
router.get('/:id', protect, getJobById);
router.get('/company', protectCompany, getCompanyJobs);
router.post('/', protectCompany, postJob);
router.post('/apply', protect, applyToJob);

module.exports = router;
