const express = require('express');

const { getCompanyJobs, postJob } = require('../controllers/jobs');
const { protectCompany } = require('../models/middlewares/auth');
const router = express.Router();

router.get('/company', protectCompany, getCompanyJobs);
router.post('/', protectCompany, postJob);

module.exports = router;
