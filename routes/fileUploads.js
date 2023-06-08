const express = require('express');

const { requestFileUploadUrl } = require('../controllers/fileUploads');
const { protect } = require('../models/middlewares/auth');
const router = express.Router();

router.get('/request-upload-url', protect, requestFileUploadUrl);

module.exports = router;
