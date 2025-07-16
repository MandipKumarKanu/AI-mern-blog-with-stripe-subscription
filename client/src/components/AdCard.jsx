import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { customAxios } from '@/components/config/axios';

const AdCard = ({ ad, placement = 'sidebar', className = '' }) => {
  const { user } = useAuthStore();
  
  // Don't show ads to premium or pro users
  if (user?.subscription?.plan && ['premium', 'pro'].includes(user.subscription.plan.toLowerCase())) {
    return null;
  }

  // Track impression when ad is displayed
  useEffect(() => {
    if (ad?._id) {
      customAxios.post(`/ads/${ad._id}/impression`)
        .catch(err => console.error('Failed to track impression:', err));
    }
  }, [ad?._id]);

  const handleAdClick = async () => {
    if (ad?._id) {
      try {
        await customAxios.post(`/ads/${ad._id}/click`);
        window.open(ad.link, '_blank', 'noopener,noreferrer');
      } catch (err) {
        console.error('Failed to track click:', err);
        window.open(ad.link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (!ad) return null;

  const getAdStyles = () => {
    switch (placement) {
      case 'banner':
        return 'w-full h-32 sm:h-40';
      case 'sidebar':
        return 'w-full max-w-sm';
      case 'inline':
        return 'w-full max-w-md mx-auto';
      case 'popup':
        return 'w-full max-w-lg';
      default:
        return 'w-full max-w-sm';
    }
  };

  return (
    <Card className={`${getAdStyles()} ${className} border hover:shadow-md transition-shadow cursor-pointer group`}>
      <CardContent className="p-0">
        <div onClick={handleAdClick} className="relative">
          <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
            <span className="text-xs text-muted-foreground font-medium">Sponsored</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          
          {placement === 'banner' ? (
            <div className="flex h-24 sm:h-32">
              <div className="flex-1 p-3 flex flex-col justify-center">
                <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {ad.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {ad.description}
                </p>
              </div>
              <div className="w-24 sm:w-32 flex-shrink-0">
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="aspect-video w-full">
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <h4 className="font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {ad.title}
                </h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {ad.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdCard;
