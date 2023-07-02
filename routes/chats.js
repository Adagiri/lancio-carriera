const express = require('express');

const { getChats, postChat, getChatById } = require('../controllers/chats');
const { protect } = require('../middlewares/auth');
const router = express.Router();

router.get('/', protect, getChats);
router.get('/:id', protect, getChatById);
router.post('/', protect, postChat);

module.exports = router;
