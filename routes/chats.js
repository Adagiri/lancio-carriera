const express = require('express');

const {
  getChats,
  postChat,
  getChatById,
  getChatsByCompanyAndUserId,
  reportChat,
} = require('../controllers/chats');
const { protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/', protect, getChats);
router.get('/cu', protect, getChatsByCompanyAndUserId);
router.get('/:id', protect, getChatById);
router.post('/', protect, postChat);
router.put('/report', protect, reportChat);

module.exports = router;
