const express = require('express');
const router = express.Router();
const {
  submitContactForm,
  getContactMessages,
  getContactMessage,
  replyToContactMessage,
  updateContactMessageStatus,
  deleteContactMessage,
  getContactStats
} = require('../controllers/contactController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post('/', submitContactForm);
router.use('/admin', authMiddleware, roleMiddleware(['admin', 'moderator']));
router.get('/admin/stats', getContactStats);
router.get('/admin', getContactMessages);
router.get('/admin/:id', getContactMessage);
router.post('/admin/:id/reply', replyToContactMessage);
router.patch('/admin/:id/status', updateContactMessageStatus);
router.delete('/admin/:id', deleteContactMessage);

module.exports = router;
