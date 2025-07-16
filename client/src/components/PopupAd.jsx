import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { customAxios } from '@/components/config/axios';

const PopupAd = ({ isOpen, onClose, blogId }) => {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  // Don't show popup ads to premium or pro users
  if (user?.subscription?.plan && ['premium', 'pro'].includes(user.subscription.plan.toLowerCase())) {
    return null;
  }

  useEffect(() => {
    if (isOpen) {
      fetchPopupAd();
    }
  }, [isOpen]);

  const fetchPopupAd = async () => {
    try {
      const response = await customAxios.get('/ads/active?placement=popup&limit=1');
      if (response.data.ads && response.data.ads.length > 0) {
        const randomAd = response.data.ads[Math.floor(Math.random() * response.data.ads.length)];
        setAd(randomAd);
        
        // Track impression
        if (randomAd._id) {
          customAxios.post(`/ads/${randomAd._id}/impression`)
            .catch(err => console.error('Failed to track popup impression:', err));
        }
      }
    } catch (error) {
      console.error('Failed to fetch popup ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdClick = async () => {
    if (ad?._id) {
      try {
        await customAxios.post(`/ads/${ad._id}/click`);
        window.open(ad.link, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Failed to track popup click:', err);
        window.open(ad.link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleClose = () => {
    setAd(null);
    setLoading(true);
    onClose();
  };

  if (!isOpen || loading || !ad) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
        <div className="relative bg-card rounded-lg overflow-hidden">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background rounded-full h-8 w-8"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Ad Content */}
          <div 
            className="cursor-pointer group"
            onClick={handleAdClick}
          >
            {/* Image */}
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={ad.image}
                alt={ad.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              
              {/* Sponsored label */}
              <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                Sponsored
              </div>
              
              {/* External link icon */}
              <div className="absolute top-3 right-12 bg-background/80 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-foreground" />
              </div>
            </div>

            {/* Text Content */}
            <div className="p-6">
              <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors">
                {ad.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {ad.description}
              </p>
              
              {/* CTA Button */}
              <div className="mt-4 flex justify-center">
                <Button 
                  className="w-full group-hover:scale-105 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAdClick();
                  }}
                >
                  Learn More
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom disclaimer */}
          <div className="px-6 pb-4">
            <p className="text-xs text-muted-foreground text-center">
              This is a sponsored advertisement
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupAd;
