'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface Review {
  reviewId: string;
  authorName: string;
  starRating: number;
  text: string;
  device: string;
  androidOsVersion: string;
  appVersionName: string;
  lastModified: string;
  hasReply: boolean;
  replyText: string | null;
}

interface GPReviewsListProps {
  reviews: Review[];
  title?: string;
}

type FilterType = 'all' | 'positive' | 'critical' | 'recent';

export function GPReviewsList({ reviews, title = 'User Reviews' }: GPReviewsListProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredReviews = reviews.filter((review) => {
    switch (filter) {
      case 'positive':
        return review.starRating >= 4;
      case 'critical':
        return review.starRating <= 2;
      case 'recent':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(review.lastModified) >= weekAgo;
      default:
        return true;
    }
  });

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: reviews.length },
    { key: 'positive', label: 'Positive', count: reviews.filter((r) => r.starRating >= 4).length },
    { key: 'critical', label: 'Critical', count: reviews.filter((r) => r.starRating <= 2).length },
    { key: 'recent', label: 'Recent', count: reviews.filter((r) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(r.lastModified) >= weekAgo;
    }).length },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex items-center gap-1 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  filter === f.key
                    ? 'bg-blue-500 text-white'
                    : 'text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {filteredReviews.length === 0 ? (
            <p className="text-center text-white/40 [.light_&]:text-slate-400 py-8 text-sm">
              No reviews match this filter
            </p>
          ) : (
            filteredReviews.map((review) => (
              <div
                key={review.reviewId}
                className="p-3 bg-white/5 [.light_&]:bg-slate-50 rounded-lg border border-white/5 [.light_&]:border-slate-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-3 h-3 ${
                            star <= review.starRating ? 'text-yellow-400' : 'text-white/20 [.light_&]:text-slate-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs font-medium text-white/70 [.light_&]:text-slate-700">
                      {review.authorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.hasReply && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded">
                        Replied
                      </span>
                    )}
                    <span className="text-[10px] text-white/30 [.light_&]:text-slate-400">
                      {new Date(review.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-white/70 [.light_&]:text-slate-600 line-clamp-3">
                  {review.text}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {review.device && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/5 [.light_&]:bg-slate-100 text-white/40 [.light_&]:text-slate-500 rounded">
                      {review.device}
                    </span>
                  )}
                  {review.appVersionName && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/5 [.light_&]:bg-slate-100 text-white/40 [.light_&]:text-slate-500 rounded">
                      v{review.appVersionName}
                    </span>
                  )}
                </div>
                {review.hasReply && review.replyText && (
                  <div className="mt-2 pl-3 border-l-2 border-blue-500/30">
                    <p className="text-xs text-blue-400/70 [.light_&]:text-blue-600 italic">
                      {review.replyText}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
