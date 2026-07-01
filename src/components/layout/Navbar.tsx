import React from 'react';
import { User as UserType, Language } from '../../types';
import { translations } from '../../translations';
import ProfileAvatar from '../common/ProfileAvatar';

interface NavbarProps {
  user: UserType;
  todayPerformanceRatio: number;
  formattedToday: string;
  lang: Language;
  onOpenProfile: () => void;
}

export default function Navbar({
  user,
  todayPerformanceRatio,
  formattedToday,
  lang,
  onOpenProfile,
}: NavbarProps) {
  const t = translations[lang];

  return (
    <header className="h-20 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-900/80 px-6 md:px-8 flex items-center justify-between flex-shrink-0 transition-colors">
      {/* Welcome Info */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-sm md:text-base font-black text-slate-900 dark:text-zinc-100 tracking-tight">
            {lang === 'az' ? `Xoş gəldin, ${user.name}` : `Welcome, ${user.name}`}
          </h1>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
            {lang === 'az' ? 'Bu gün' : 'Today'}: {formattedToday}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {/* Daily Performance Gauge */}
        <div className="text-right">
          <div className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-extrabold">
            {lang === 'az' ? 'Gündəlik Performans' : 'Daily Performance'}
          </div>
          <div className="text-sm md:text-base font-mono font-black text-green-500 dark:text-green-400 underline decoration-2 underline-offset-2">
            {todayPerformanceRatio}%
          </div>
        </div>

        {/* Circular Avatar Direct Navigation Trigger */}
        <button
          id="navbar-avatar-btn"
          onClick={onOpenProfile}
          className="hover:scale-110 active:scale-95 transition-transform duration-150 relative bg-transparent border-none p-0 cursor-pointer"
          title={t.profile}
        >
          <ProfileAvatar avatar={user.profileImage} size="md" />
        </button>
      </div>
    </header>
  );
}

