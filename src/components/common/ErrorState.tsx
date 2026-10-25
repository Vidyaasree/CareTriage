import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Data Retrieval Error',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-rose-800">{title}</h4>
          <p className="text-xs text-rose-700 mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-white text-rose-700 border border-rose-300 rounded-md hover:bg-rose-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
