import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 4, className = '' }) => {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      <div className="h-6 bg-slate-200 rounded w-1/3"></div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-10 bg-slate-100 rounded w-full flex items-center gap-4 px-4">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/6 ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
