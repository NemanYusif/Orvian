import React from 'react';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function ProfileAvatar({ avatar, size = 'md', className = '' }: ProfileAvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  // Reset error state if avatar changes
  React.useEffect(() => {
    setHasError(false);
  }, [avatar]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-16 h-16 text-3xl',
    xl: 'w-24 h-24 text-5xl',
  };

  const isImage = avatar && (avatar.startsWith('data:image') || avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/'));

  return (
    <div
      className={`rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xs flex items-center justify-center overflow-hidden flex-shrink-0 transition-all ${sizeClasses[size]} ${className}`}
    >
      {isImage && !hasError ? (
        <img
          src={avatar!}
          alt="Avatar"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover select-none"
          referrerPolicy="no-referrer"
        />
      ) : avatar && !hasError ? (
        // Emoji or character fallback
        <span className="leading-none select-none select-all-none font-sans">{avatar}</span>
      ) : (
        // SVG Icon fallback
        <User className="w-1/2 h-1/2 text-slate-400 dark:text-zinc-500" />
      )}
    </div>
  );
}
