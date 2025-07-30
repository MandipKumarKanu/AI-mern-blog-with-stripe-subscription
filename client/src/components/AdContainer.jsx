import React, { useState, useEffect } from 'react';
import AdCard from './AdCard';
import { useAuthStore } from '@/store/useAuthStore';
import { customAxios } from '@/components/config/axios';

const AdContainer = ({ placement = 'sidebar', limit = 1, className = '' }) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  
  // Don't show ads to premium/pro users or admin users
  if (user?.role === 'admin' || (user?.subscription?.plan && ['premium', 'pro'].includes(user.subscription.plan.toLowerCase()))) {
    return null;
  }

  useEffect(() => {
    const fetchAds = async () => {
      try {
        console.log(`Fetching ads for placement: ${placement}, limit: ${limit}`);
        const response = await customAxios.get(`/ads/active?placement=${placement}&limit=${limit}`);
        console.log('Ads response:', response.data);
        setAds(response.data.ads || []);
      } catch (error) {
        console.error('Failed to fetch ads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [placement, limit]);

  if (loading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="bg-muted rounded-lg h-32 w-full"></div>
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className={`${className} p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg`}>
        <p className="text-sm text-muted-foreground text-center">
          No ads available for {placement} placement
          {user?.subscription?.plan && ` (User has ${user.subscription.plan} plan)`}
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-4 flex`}>
      {ads.map((ad) => (
        <AdCard 
          key={ad._id} 
          ad={ad} 
          placement={placement}
        />
      ))}
    </div>
  );
};

export default AdContainer;
