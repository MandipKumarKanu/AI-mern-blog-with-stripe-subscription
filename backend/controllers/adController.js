const Ad = require('../models/Ad');

// Create new ad
const createAd = async (req, res) => {
  try {
    const { title, description, link, image, placement = 'sidebar', priority = 1, startDate, endDate } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    const ad = await Ad.create({
      title,
      description,
      image,
      link,
      placement,
      priority: parseInt(priority),
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.user.id
    });

    await ad.populate('createdBy', 'name email');
    
    res.status(201).json({
      message: 'Ad created successfully',
      ad
    });
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all ads (admin only)
const getAllAds = async (req, res) => {
  try {
    const { page = 1, limit = 10, placement, isActive } = req.query;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (placement) filter.placement = placement;
    if (isActive !== undefined) {
      // Handle both string and boolean values
      filter.isActive = isActive === 'true' || isActive === true;
    }
    
    const ads = await Ad.find(filter)
      .populate('createdBy', 'name email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalAds = await Ad.countDocuments(filter);
    const totalPages = Math.ceil(totalAds / limit);
    
    res.status(200).json({
      ads,
      totalPages,
      currentPage: parseInt(page),
      totalAds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get active ads for display (public)
const getActiveAds = async (req, res) => {
  try {
    const { placement = 'sidebar', limit = 5 } = req.query;
    const currentDate = new Date();
    
    const filter = {
      isActive: true,
      startDate: { $lte: currentDate },
      $or: [
        { endDate: null },
        { endDate: { $gte: currentDate } }
      ]
    };
    
    if (placement) {
      filter.placement = placement;
    }
    
    const ads = await Ad.find(filter)
      .select('title description image link placement priority')
      .sort({ priority: -1 })
      .limit(parseInt(limit));
    
    res.status(200).json({ ads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update ad
const updateAd = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link, image, placement, priority, isActive, startDate, endDate } = req.body;
    
    const ad = await Ad.findById(id);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    const processedIsActive = isActive !== undefined ? Boolean(isActive) : ad.isActive;
    
    const updatedAd = await Ad.findByIdAndUpdate(
      id,
      {
        title,
        description,
        image: image || ad.image, // Use new image if provided, otherwise keep existing
        link,
        placement,
        priority: priority ? parseInt(priority) : ad.priority,
        isActive: processedIsActive,
        startDate: startDate ? new Date(startDate) : ad.startDate,
        endDate: endDate ? new Date(endDate) : ad.endDate
      },
      { new: true }
    ).populate('createdBy', 'name email');
    
    res.status(200).json({
      message: 'Ad updated successfully',
      ad: updatedAd
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete ad
const deleteAd = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ad = await Ad.findByIdAndDelete(id);
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    res.status(200).json({ message: 'Ad deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Track ad click
const trackAdClick = async (req, res) => {
  try {
    const { id } = req.params;
    
    await Ad.findByIdAndUpdate(id, { $inc: { clickCount: 1 } });
    
    res.status(200).json({ message: 'Click tracked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Track ad impression
const trackAdImpression = async (req, res) => {
  try {
    const { id } = req.params;
    
    await Ad.findByIdAndUpdate(id, { $inc: { impressionCount: 1 } });
    
    res.status(200).json({ message: 'Impression tracked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get ad analytics
const getAdAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    
    const ad = await Ad.findById(id).select('title clickCount impressionCount createdAt');
    if (!ad) {
      return res.status(404).json({ error: 'Ad not found' });
    }
    
    const ctr = ad.impressionCount > 0 ? (ad.clickCount / ad.impressionCount * 100).toFixed(2) : 0;
    
    res.status(200).json({
      ad,
      analytics: {
        clicks: ad.clickCount,
        impressions: ad.impressionCount,
        ctr: `${ctr}%`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createAd,
  getAllAds,
  getActiveAds,
  updateAd,
  deleteAd,
  trackAdClick,
  trackAdImpression,
  getAdAnalytics
};
