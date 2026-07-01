import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 rounded',
    md: 'w-8 h-8 rounded-lg',
    lg: 'w-12 h-12 rounded-xl',
  };

  const innerClasses = {
    sm: 'w-3 h-3 rounded-sm',
    md: 'w-4 h-4 rounded-sm',
    lg: 'w-6 h-6 rounded-sm',
  };

  return (
    <div className={`${sizeClasses[size]} bg-black dark:bg-white text-white dark:text-black flex items-center justify-center flex-shrink-0 shadow-2xs`}>
      <div className={`${innerClasses[size]} bg-white dark:bg-black transition-colors duration-150`} />
    </div>
  );
}
