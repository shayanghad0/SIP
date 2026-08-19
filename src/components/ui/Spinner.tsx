import React from 'react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={cn(
        'border-2 border-dark-600 border-t-primary-500 rounded-full animate-spin',
        sizes[size],
        className
      )}
    />
  );
};

export const LoadingScreen: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-dark-950 flex flex-col items-center justify-center">
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-dark-400 text-sm">{message}</p>
      )}
    </div>
  );
};
