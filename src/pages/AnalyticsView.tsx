import React from 'react';
import { Award, Calendar, Flame, TrendingUp, AlertTriangle, CheckSquare, Sparkles, Star } from 'lucide-react';
import { useAppStore } from '../context/useAppStore';
import { translations } from '../translations';
import { AchievementBadge } from '../types';

export default function AnalyticsView() {
  const { tasks, lang } = useAppStore();
  const t = translations[lang];
  const TODAY_STR = '2026-07-01';
  const YEAR = 2026;

  // 1. Basic Stats Computations
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const missed = tasks.filter((t) => t.status === 'missed').length;

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const missedRate = total > 0 ? Math.round((missed / total) * 100) : 0;

  // 2. STREAK ALGORITHM
  const completedDates = Array.from(
    new Set(
      tasks
        .filter((task) => task.status === 'completed')
        .map((task) => task.date)
    )
  ).sort();

  const calculateStreaks = () => {
    if (completedDates.length === 0) return { current: 0, longest: 0 };

    let longest = 0;
    let current = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (let i = 0; i < completedDates.length; i++) {
      const currentDate = new Date(completedDates[i]);
      
      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          if (tempStreak > longest) longest = tempStreak;
          tempStreak = 1;
        }
      }
      prevDate = currentDate;
    }
    if (tempStreak > longest) longest = tempStreak;

    const today = new Date(TODAY_STR);
    const yesterday = new Date('2026-06-30');
    
    const hasCompletedToday = completedDates.includes(TODAY_STR);
    const hasCompletedYesterday = completedDates.includes('2026-06-30');

    if (hasCompletedToday || hasCompletedYesterday) {
      current = 0;
      let checkDate = hasCompletedToday ? today : yesterday;
      
      while (true) {
        const checkStr = checkDate.toISOString().split('T')[0];
        if (completedDates.includes(checkStr)) {
          current++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    return { current, longest: Math.max(longest, current) };
  };

  const { current: currentStreak, longest: longestStreak } = calculateStreaks();

  // 3. MILESTONE BADGES SYSTEM
  const badges: AchievementBadge[] = [
    {
      id: 'first-task',
      titleAz: 'İlk Addım',
      titleEn: 'First Step',
      descriptionAz: 'Sistemdə ilk tapşırığı tamamladınız.',
      descriptionEn: 'Completed your first task on the system.',
      icon: 'Star',
      unlocked: completed >= 1,
      color: 'from-slate-750 to-zinc-900 text-white',
    },
    {
      id: 'streak-3',
      titleAz: 'Məshuldar Başlanğıc',
      titleEn: 'Productive Start',
      descriptionAz: '3 günlük tapşırıq tamamlama seriyası (streak).',
      descriptionEn: 'Achieved a 3-day consecutive task completion streak.',
      icon: 'Flame',
      unlocked: longestStreak >= 3,
      color: 'from-slate-800 to-zinc-950 text-white',
    },
    {
      id: 'streak-7',
      titleAz: 'Dəmir İradə',
      titleEn: 'Iron Will',
      descriptionAz: '7 günlük tapşırıq tamamlama seriyası (streak).',
      descriptionEn: 'Achieved a 7-day consecutive task completion streak.',
      icon: 'Award',
      unlocked: longestStreak >= 7,
      color: 'from-zinc-900 to-black text-white',
    },
    {
      id: 'volume-10',
      titleAz: 'Çalışqan',
      titleEn: 'Busy Bee',
      descriptionAz: 'Ümumilikdə 10 tapşırığı uğurla tamamladınız.',
      descriptionEn: 'Successfully completed 10 total tasks.',
      icon: 'CheckSquare',
      unlocked: completed >= 10,
      color: 'from-slate-600 to-zinc-850 text-white',
    },
    {
      id: 'perfect-day',
      titleAz: 'Qüsursuz Gün',
      titleEn: 'Perfect Day',
      descriptionAz: 'Günün bütün tapşırıqlarını 100% tamamladınız.',
      descriptionEn: 'Finished 100% of tasks in a single day.',
      icon: 'Sparkles',
      unlocked: tasks.some((t) => t.status === 'completed') && !tasks.some((t) => t.status === 'missed'),
      color: 'from-slate-900 to-zinc-900 text-white',
    }
  ];

  // 4. Heatmap data alignment
  const buildHeatmapGrid = () => {
    const startDate = new Date(`${YEAR}-01-01`);
    const gridDays: { dateStr: string; count: number; level: number }[] = [];

    const d = new Date(startDate);
    while (d.getFullYear() === YEAR) {
      const dateStr = d.toISOString().split('T')[0];
      const dayTasks = tasks.filter((t) => t.date === dateStr && t.status === 'completed');
      const count = dayTasks.length;
      
      let level = 0;
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count >= 3) level = 3;

      gridDays.push({ dateStr, count, level });
      d.setDate(d.getDate() + 1);
    }
    return gridDays;
  };

  const heatmapDays = buildHeatmapGrid();
  const heatmapWeeks: typeof heatmapDays[] = [];
  let currentWeek: typeof heatmapDays = [];

  const firstDayOfWeek = new Date(`${YEAR}-01-01`).getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ dateStr: '', count: -1, level: -1 });
  }

  heatmapDays.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      heatmapWeeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ dateStr: '', count: -1, level: -1 });
    }
    heatmapWeeks.push(currentWeek);
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4 transition-colors">
          <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-900/30 text-slate-850 dark:text-zinc-350 border border-slate-100 dark:border-zinc-800">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase block leading-none mb-1">{t.completionRate}</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50">{completionRate}%</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">{completed} / {total} {lang === 'az' ? 'tapşırıq' : 'tasks'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4 transition-colors">
          <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-900/30 text-slate-850 dark:text-zinc-355 border border-slate-100 dark:border-zinc-800">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase block leading-none mb-1">{t.missedRate}</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50">{missedRate}%</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">{missed} / {total} {lang === 'az' ? 'tapşırıq' : 'tasks'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4 transition-colors">
          <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-900/30 text-slate-850 dark:text-zinc-355 border border-slate-100 dark:border-zinc-800">
            <Flame className="w-7 h-7 animate-pulse-slow" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase block leading-none mb-1">{t.currentStreak}</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50">{currentStreak} {t.daysUnit}</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">{lang === 'az' ? 'Ardıcıl tamamlanan gün' : 'Consecutive completed days'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4 transition-colors">
          <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-900/30 text-slate-850 dark:text-zinc-355 border border-slate-100 dark:border-zinc-800">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase block leading-none mb-1">{t.longestStreak}</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50">{longestStreak} {t.daysUnit}</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">{lang === 'az' ? 'Sistem üzrə rekord' : 'All-time tracking record'}</span>
          </div>
        </div>
      </div>

      {/* Activity Heatmap Grid */}
      <div id="github-heatmap-container" className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-zinc-850 dark:text-zinc-50 text-xs uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-slate-850 dark:text-slate-200" />
            {t.activityHeatmap} ({YEAR})
          </h3>
          <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 dark:text-zinc-505 font-bold">
            <span>{t.heatmapLegendLow}</span>
            <span className="w-2.5 h-2.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40" />
            <span className="w-2.5 h-2.5 rounded bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-200/30" />
            <span className="w-2.5 h-2.5 rounded bg-emerald-300 dark:bg-emerald-700/50" />
            <span className="w-2.5 h-2.5 rounded bg-emerald-600" />
            <span>{t.heatmapLegendHigh}</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1 max-w-full">
          <div className="inline-grid grid-flow-col gap-1 min-w-[720px] p-1">
            {/* Weekdays Labels */}
            <div className="grid grid-rows-7 gap-1 pr-2 text-[9px] text-zinc-400 dark:text-zinc-500 font-bold self-center leading-none text-right">
              <span>{lang === 'az' ? 'B.e.' : 'Mon'}</span>
              <span className="opacity-0">T</span>
              <span>{lang === 'az' ? 'Çər.' : 'Wed'}</span>
              <span className="opacity-0">T</span>
              <span>{lang === 'az' ? 'Cüm.' : 'Fri'}</span>
              <span className="opacity-0">S</span>
              <span>{lang === 'az' ? 'Baz.' : 'Sun'}</span>
            </div>

            {/* Contribution Cells */}
            {heatmapWeeks.map((week, weekIdx) => (
              <div key={`week-${weekIdx}`} className="grid grid-rows-7 gap-1">
                {week.map((day, dayIdx) => {
                  if (day.level === -1) {
                    return <div key={`empty-day-${dayIdx}`} className="w-2.5 h-2.5 bg-transparent" />;
                  }

                  let colorClass = 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40';
                  if (day.level === 1) {
                    colorClass = 'bg-emerald-100 dark:bg-emerald-950/20 border border-emerald-200/30';
                  } else if (day.level === 2) {
                    colorClass = 'bg-emerald-300 dark:bg-emerald-700/55 border border-emerald-400/20';
                  } else if (day.level >= 3) {
                    colorClass = 'bg-emerald-600 border border-emerald-700';
                  }

                  return (
                    <div
                      id={`heatmap-cell-${day.dateStr}`}
                      key={`day-${dayIdx}`}
                      className={`w-2.5 h-2.5 rounded-[2px] transition ${colorClass} cursor-pointer`}
                      title={`${day.dateStr}: ${day.count} ${lang === 'az' ? 'tamamlanan tapşırıq' : 'completed tasks'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Badges system */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 transition-colors">
        <h3 className="font-bold text-zinc-850 dark:text-zinc-50 text-xs uppercase tracking-wider flex items-center gap-2 mb-4">
          <Award className="w-4.5 h-4.5 text-slate-850 dark:text-slate-200" />
          {t.achievements} ({badges.filter((b) => b.unlocked).length} / {badges.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {badges.map((badge) => (
            <div
              id={`badge-card-${badge.id}`}
              key={badge.id}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-between transition-all duration-200 ${
                badge.unlocked
                  ? 'bg-slate-50/50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800'
                  : 'bg-slate-50/10 dark:bg-zinc-950/10 border-dashed border-slate-200 dark:border-zinc-900 opacity-40 select-none'
              }`}
            >
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${badge.unlocked ? badge.color : 'from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 text-zinc-400'} flex items-center justify-center text-xl font-bold shadow-xs`}>
                {badge.id === 'first-task' && <Star className="w-6 h-6" />}
                {badge.id === 'streak-3' && <Flame className="w-6 h-6 animate-pulse-slow" />}
                {badge.id === 'streak-7' && <Award className="w-6 h-6" />}
                {badge.id === 'volume-10' && <CheckSquare className="w-6 h-6" />}
                {badge.id === 'perfect-day' && <Sparkles className="w-6 h-6" />}
              </div>

              <div className="mt-3">
                <h4 className="text-xs font-extrabold text-zinc-850 dark:text-zinc-150 leading-tight">
                  {lang === 'az' ? badge.titleAz : badge.titleEn}
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {lang === 'az' ? badge.descriptionAz : badge.descriptionEn}
                </p>
              </div>

              <div className="mt-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${badge.unlocked ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-200' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
                  {badge.unlocked ? (lang === 'az' ? 'Açıldı' : 'Unlocked') : (lang === 'az' ? 'Kilidli' : 'Locked')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
