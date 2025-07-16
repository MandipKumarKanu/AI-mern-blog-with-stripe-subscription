import React from 'react';
import { Diamond, Trophy, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PremiumBadge = ({ plan, size = 'sm', className = '' }) => {
  if (!plan || plan === 'free') return null;

  const getIconAndColor = (planType) => {
    switch (planType?.toLowerCase()) {
      case 'premium':
        return {
          icon: Diamond,
          bgColor: 'bg-gradient-to-r from-purple-500 to-purple-600',
          textColor: 'text-white',
          label: '💎',
          glow: 'shadow-lg shadow-purple-500/25'
        };
      case 'pro':
        return {
          icon: Crown,
          bgColor: 'bg-gradient-to-r from-yellow-200 to-yellow-400',
          textColor: 'text-yellow-900',
          label: '🥇',
          glow: 'shadow-lg shadow-yellow-500/25'
        };
      default:
        return {
          icon: Trophy,
          bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
          textColor: 'text-white',
          label: planType,
          glow: 'shadow-lg shadow-blue-500/25'
        };
    }
  };

  const config = getIconAndColor(plan);
  const Icon = config.icon;

  const sizes = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  return (
    <Badge 
      className={`
        ${config.bgColor} 
        ${config.textColor} 
        ${config.glow}
        ${sizes[size]}
        border-0 
        font-semibold 
        inline-flex 
        items-center 
        gap-1 
        transition-all 
        duration-200 
        hover:scale-105
        ${className}
      `}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </Badge>
  );
};

export default PremiumBadge;
