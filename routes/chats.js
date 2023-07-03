const express = require('express');

const {
  getChats,
  postChat,
  getChatById,
  getChatsByCompanyAndUserId,
} = require('../controllers/chats');
const { protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/', protect, getChats);
router.get('/cu', protect, getChatsByCompanyAndUserId);
router.get('/:id', protect, getChatById);
router.post('/', protect, postChat);

module.exports = router;
