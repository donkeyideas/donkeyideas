'use client';

import { useState } from 'react';

interface VentureCardProps {
  venture: {
    status?: string;
    statusColor?: string;
    category?: string;
    title?: string;
    description?: string;
    tags?: string[];
    gradient?: string;
    imageUrl?: string;
  };
  index: number;
}

export default function VentureCard({ venture, index }: VentureCardProps) {
  const [imageError, setImageError] = useState(false);

  const statusColors: Record<string, string> = {
    teal: 'bg-cyan-400',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-400',
    green: 'bg-green-500',
  };
  
  const statusTextColors: Record<string, string> = {
    teal: 'text-white',
    purple: 'text-white',
    yellow: 'text-black',
    green: 'text-white',
  };
  
  const gradients: Record<string, string> = {
    'from-blue-600 to-blue-400': 'from-blue-600 to-blue-400',
    'from-purple-600 to-pink-500': 'from-purple-600 to-pink-500',
    'from-teal-600 to-cyan-400': 'from-teal-600 to-cyan-400',
    'from-blue-600 to-purple-500': 'from-blue-600 to-purple-500',
  };

  const statusColor = venture.statusColor || 'teal';
  const gradient = venture.gradient || 'from-blue-600 to-blue-400';
  const status = venture.status || 'PRODUCTION';
  const category = venture.category || 'VENTURE';
  const title = venture.title || `Venture ${index + 1}`;
  const description = venture.description || '';
  const tags = venture.tags || [];
  const hasImage = venture.imageUrl && !imageError;

  return (
    <div
      className={`relative rounded-lg p-8 min-h-[450px] flex flex-col justify-between overflow-hidden ${
        !hasImage ? `bg-gradient-to-b ${gradient}` : ''
      }`}
    >
      {/* Background Image with Gradient Overlay */}
      {venture.imageUrl && !imageError ? (
        <>
          <div className="absolute inset-0 z-0">
            <img
              src={venture.imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
          <div className={`absolute inset-0 z-[1] bg-gradient-to-b ${gradient} opacity-75`} />
        </>
      ) : null}
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="mb-4">
          <span className={`inline-block px-3 py-1 ${statusColors[statusColor] || 'bg-cyan-400'} rounded ${statusTextColors[statusColor] || 'text-white'} text-xs font-semibold uppercase`}>
            {status}
          </span>
        </div>
        
        <div className="text-white text-xs uppercase tracking-widest mb-3">
          {category}
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
        
        <p className="text-white leading-relaxed mb-6 flex-grow">
          {description}
        </p>
        
        <div className="flex flex-wrap gap-2 mt-auto">
          {tags.map((tag: string, tagIndex: number) => (
            <span
              key={tagIndex}
              className="px-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md text-white text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
