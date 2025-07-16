const express = require('express');
const router = express.Router();
const {
  createAd,
  getAllAds,
  getActiveAds,
  updateAd,
  deleteAd,
  trackAdClick,
  trackAdImpression,
  getAdAnalytics
} = require('../controllers/adController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public routes
router.get('/active', getActiveAds);
router.post('/:id/click', trackAdClick);
router.post('/:id/impression', trackAdImpression);

// Admin only routes
router.post('/', authMiddleware, roleMiddleware(['admin']), createAd);
router.get('/', authMiddleware, roleMiddleware(['admin']), getAllAds);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateAd);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteAd);
router.get('/:id/analytics', authMiddleware, roleMiddleware(['admin']), getAdAnalytics);

module.exports = router;
