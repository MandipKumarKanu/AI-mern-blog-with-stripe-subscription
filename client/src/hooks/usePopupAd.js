import { useState, useEffect } from 'react';

const usePopupAd = (blogId, options = {}) => {
  const {
    showProbability = 0.3, // 30% chance to show popup
    minDelayMs = 3000, // Minimum 3 seconds delay
    maxDelayMs = 8000, // Maximum 8 seconds delay
    cooldownMs = 300000, // 5 minutes cooldown between popups
    ignoreCooldown = false, // Option to ignore cooldown
  } = options;

  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!blogId) return;

    // Check if popup was recently shown (unless ignoreCooldown is true)
    if (!ignoreCooldown) {
      const lastPopupTime = localStorage.getItem('lastPopupTime');
      const now = Date.now();
      
      if (lastPopupTime && (now - parseInt(lastPopupTime)) < cooldownMs) {
        return; // Still in cooldown period
      }
    }

    // Random chance to show popup
    if (Math.random() > showProbability) {
      return; // Don't show popup this time
    }

    // Random delay before showing popup
    const delay = Math.floor(Math.random() * (maxDelayMs - minDelayMs)) + minDelayMs;
    
    const timer = setTimeout(() => {
      setShowPopup(true);
      if (!ignoreCooldown) {
        localStorage.setItem('lastPopupTime', Date.now().toString());
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [blogId, showProbability, minDelayMs, maxDelayMs, cooldownMs, ignoreCooldown]);

  const closePopup = () => {
    setShowPopup(false);
  };

  return { showPopup, closePopup };
};

export default usePopupAd;
