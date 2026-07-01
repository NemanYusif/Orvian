import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  HelpCircle, 
  Lock, 
  Plus,
  CalendarDays,
  Grid
} from 'lucide-react';
import { useAppStore } from '../context/useAppStore';
import { translations } from '../translations';
import Button from '../components/ui/Button';

export default function CalendarView() {
  const { tasks, lang, addTask, updateTaskStatus, updateTask, deleteTask } = useAppStore();
  const t = translations[lang];
  
  // Anchor year is 2026
  const YEAR = 2026;
  const TODAY_STR = '2026-07-01'; // Benchmark date

  const [viewMode, setViewMode] = React.useState<'month' | 'week'>('month');
  const [focusedMonth, setFocusedMonth] = React.useState<number>(6); // Default: July (0-indexed 6)
  const [selectedDate, setSelectedDate] = React.useState<string>(TODAY_STR);
  
  // For adding a new task
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [newTaskDesc, setNewTaskDesc] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [activeDragOverDay, setActiveDragOverDay] = React.useState<string | null>(null);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const formatDateString = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const handlePrevMonth = () => {
    setFocusedMonth((prev) => (prev === 0 ? 11 : prev - 1));
  };

  const handleNextMonth = () => {
    setFocusedMonth((prev) => (prev === 11 ? 0 : prev + 1));
  };

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter((t) => t.date === dateStr);
  };

  const getMonthStats = (monthIndex: number) => {
    const prefix = `${YEAR}-${String(monthIndex + 1).padStart(2, '0')}`;
    const monthTasks = tasks.filter((t) => t.date.startsWith(prefix));
    const total = monthTasks.length;
    const completed = monthTasks.filter((t) => t.status === 'completed').length;
    const missed = monthTasks.filter((t) => t.status === 'missed').length;
    const ratio = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, missed, ratio };
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDragOverDay(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (dateStr >= TODAY_STR) {
      setActiveDragOverDay(dateStr);
    }
  };

  const handleDragLeave = () => {
    setActiveDragOverDay(null);
  };

  const handleDrop = async (e: React.DragEvent, destDateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setActiveDragOverDay(null);
    setDraggedTaskId(null);
    
    if (!taskId) return;
    
    if (destDateStr < TODAY_STR) {
      setErrorMsg(t.pastReadOnly || "Past dates are read-only!");
      return;
    }

    try {
      await updateTask(taskId, { date: destDateStr });
    } catch (err: any) {
      console.error("Failed to move task:", err);
    }
  };

  // Weekly Date Calculations
  const getWeekDays = (baseDateStr: string) => {
    const [year, month, day] = baseDateStr.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + diffToMonday + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      weekDays.push(`${y}-${m}-${dd}`);
    }
    return weekDays;
  };

  const handlePrevWeek = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 7);
    const nextDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextDateStr);
    setFocusedMonth(date.getMonth());
  };

  const handleNextWeek = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 7);
    const nextDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextDateStr);
    setFocusedMonth(date.getMonth());
  };

  const formatWeekRange = (weekDates: string[]) => {
    if (weekDates.length === 0) return '';
    const firstDateStr = weekDates[0];
    const lastDateStr = weekDates[6];

    const [y1, m1, d1] = firstDateStr.split('-').map(Number);
    const [y2, m2, d2] = lastDateStr.split('-').map(Number);

    const monthNames = t.months;

    if (m1 === m2) {
      return `${monthNames[m1 - 1]} ${d1} - ${d2}, ${YEAR}`;
    } else {
      return `${monthNames[m1 - 1]} ${d1} - ${monthNames[m2 - 1]} ${d2}, ${YEAR}`;
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setErrorMsg('');

    if (selectedDate < TODAY_STR) {
      setErrorMsg(t.pastReadOnly);
      return;
    }

    setIsSubmitting(true);
    try {
      await addTask(newTaskTitle.trim(), newTaskDesc.trim(), selectedDate);
      setNewTaskTitle('');
      setNewTaskDesc('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeDaysCount = getDaysInMonth(YEAR, focusedMonth);
  const firstDayIndex = getFirstDayOfMonth(YEAR, focusedMonth);
  const selectedDateTasks = getTasksForDate(selectedDate);
  const isPastSelectedDate = selectedDate < TODAY_STR;

  const currentWeekDates = getWeekDays(selectedDate);

  return (
    <div className="space-y-6">
      {/* 1. 12-Month Annual Overview Grid */}
      <div id="annual-overview-container" className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 transition-colors">
        <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 mb-3 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-850 dark:text-slate-250" />
            {YEAR} {lang === 'az' ? 'Yıllık İcmal' : 'Annual Overview'}
          </div>
          
          {/* Calendar Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-zinc-800">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-3xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
              }`}
            >
              <Grid className="w-3 h-3" />
              {lang === 'az' ? 'Aylıq' : 'Month'}
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-3xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-300'
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              {lang === 'az' ? 'Həftəlik' : 'Week'}
            </button>
          </div>
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
          {t.months.map((monthName, idx) => {
            const stats = getMonthStats(idx);
            const isCurrent = focusedMonth === idx;
            return (
              <button
                id={`overview-month-${idx}`}
                key={idx}
                onClick={() => {
                  setFocusedMonth(idx);
                  // Set selected date to 1st of that month
                  const firstDayStr = `${YEAR}-${String(idx + 1).padStart(2, '0')}-01`;
                  setSelectedDate(firstDayStr);
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-between transition cursor-pointer ${
                  isCurrent
                    ? 'border-black bg-slate-100 dark:bg-zinc-800 text-slate-950 dark:text-zinc-100 font-bold'
                    : 'border-slate-200 dark:border-zinc-850 hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/60'
                }`}
              >
                <span className="text-xs font-semibold block truncate w-full text-center">{monthName.substring(0, 3)}</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-1 block">
                  {stats.total > 0 ? `${stats.ratio}%` : '—'}
                </span>
                {stats.total > 0 && (
                  <div className="w-full h-1 bg-slate-150 dark:bg-zinc-850 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-black dark:bg-white"
                      style={{ width: `${stats.ratio}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Focused Month / Week Calendar Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 transition-colors">
          {/* Calendar Header Control */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">
                {viewMode === 'month' 
                  ? `${t.months[focusedMonth]} ${YEAR}` 
                  : formatWeekRange(currentWeekDates)
                }
              </h2>
              <button
                id="reset-to-today"
                onClick={() => {
                  setFocusedMonth(6); // July
                  setSelectedDate(TODAY_STR);
                }}
                className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded-lg text-slate-700 dark:text-zinc-300 transition cursor-pointer"
              >
                {t.today}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                id="prev-month-button"
                onClick={viewMode === 'month' ? handlePrevMonth : handlePrevWeek}
                className="p-2 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                id="next-month-button"
                onClick={viewMode === 'month' ? handleNextMonth : handleNextWeek}
                className="p-2 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-600 dark:text-zinc-400 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'month' ? (
            <>
              {/* Weekdays Labels */}
              <div className="grid grid-cols-7 text-center border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-3">
                {t.weekDaysShort.map((day, idx) => (
                  <span key={idx} className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {day}
                  </span>
                ))}
              </div>

              {/* Monthly grid cell containers */}
              <div className="grid grid-cols-7 gap-1.5 min-h-[300px]">
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="bg-zinc-50/30 dark:bg-zinc-950/10 rounded-xl animate-fade-in" />
                ))}

                {Array.from({ length: activeDaysCount }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = formatDateString(YEAR, focusedMonth, dayNum);
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === TODAY_STR;
                  
                  const dayTasks = getTasksForDate(dateStr);
                  const totalTasksCount = dayTasks.length;
                  const completedTasksCount = dayTasks.filter((t) => t.status === 'completed').length;
                  const missedTasksCount = dayTasks.filter((t) => t.status === 'missed').length;

                  let ringClass = '';
                  if (isSelected) {
                    ringClass = 'ring-2 ring-black dark:ring-white ring-offset-2 dark:ring-offset-zinc-950';
                  } else if (isToday) {
                    ringClass = 'border-2 border-black/30 dark:border-white/30';
                  }

                  let bgClass = 'bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-850 dark:text-zinc-200';
                  if (totalTasksCount > 0) {
                    if (completedTasksCount === totalTasksCount) {
                      bgClass = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
                    } else if (missedTasksCount > 0) {
                      bgClass = 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
                    } else {
                      bgClass = 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
                    }
                  }

                  return (
                    <button
                      id={`day-cell-${dateStr}`}
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`relative p-2 rounded-xl flex flex-col justify-between items-center group cursor-pointer transition-all duration-150 aspect-square hover:scale-[1.02] active:scale-[0.98] ${bgClass} ${ringClass}`}
                    >
                      {dateStr < TODAY_STR && (
                        <span className="absolute top-1 left-1 opacity-40 text-[9px]">
                          <Lock className="w-2.5 h-2.5 animate-pulse-slow" />
                        </span>
                      )}

                      <span className={`text-xs font-semibold ${isToday ? 'bg-black dark:bg-white text-white dark:text-black w-5 h-5 rounded-full flex items-center justify-center font-bold' : ''}`}>
                        {dayNum}
                      </span>

                      {totalTasksCount > 0 && (
                        <div className="flex gap-0.5 justify-center mt-1">
                          {dayTasks.slice(0, 3).map((task) => {
                            let dotColor = 'bg-amber-400 dark:bg-amber-500';
                            if (task.status === 'completed') dotColor = 'bg-emerald-500';
                            if (task.status === 'missed') dotColor = 'bg-rose-500';
                            return (
                              <span
                                key={task.id}
                                className={`w-1 h-1 rounded-full ${dotColor}`}
                              />
                            );
                          })}
                          {totalTasksCount > 3 && (
                            <span className="text-[7px] leading-none text-zinc-400 font-bold font-mono">+</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* ----------------- WEEKLY DRAG & DROP VIEW ----------------- */
            <div className="space-y-4 animate-fade-in">
              {/* Informational Hint Banner */}
              <div className="bg-indigo-50/40 dark:bg-zinc-900/50 p-3 rounded-xl border border-indigo-150/40 dark:border-zinc-800/80 flex items-center gap-2.5 text-xs text-slate-600 dark:text-zinc-400 transition-colors">
                <span className="flex h-2 w-2 relative flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <p className="font-medium">
                  {lang === 'az' 
                    ? "Tapşırıqları günlər arasında sürüşdürüb buraxmaqla onların tarixini dərhal dəyişə bilərsiniz." 
                    : "Drag tasks and drop them onto any day of the week to reschedule them instantly."}
                </p>
              </div>

              {/* 7-Column Weekly Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 min-h-[360px]">
                {currentWeekDates.map((dateStr) => {
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === TODAY_STR;
                  const isPast = dateStr < TODAY_STR;
                  
                  const dayTasks = getTasksForDate(dateStr);
                  const [y, m, d] = dateStr.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  
                  const weekdayIdx = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
                  const dayName = t.weekDaysShort[weekdayIdx];
                  const monthNameShort = t.months[m - 1].substring(0, 3);

                  const isDragOver = activeDragOverDay === dateStr;

                  return (
                    <div
                      key={dateStr}
                      onDragOver={(e) => handleDragOver(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateStr)}
                      className={`flex flex-col rounded-2xl border transition-all duration-200 ${
                        isDragOver
                          ? 'border-indigo-500 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/20 scale-[1.01] ring-2 ring-indigo-500/20 shadow-sm'
                          : isSelected
                          ? 'border-black bg-slate-50/50 dark:border-white dark:bg-zinc-905'
                          : isToday
                          ? 'border-slate-300 dark:border-zinc-700 bg-slate-50/20 dark:bg-zinc-900/10'
                          : 'border-slate-200 dark:border-zinc-850 hover:border-slate-300 dark:hover:border-zinc-800'
                      }`}
                    >
                      {/* Column Header */}
                      <button
                        type="button"
                        onClick={() => setSelectedDate(dateStr)}
                        className="p-3 text-left w-full border-b border-slate-100 dark:border-zinc-900 flex items-center justify-between cursor-pointer focus:outline-none"
                      >
                        <div>
                          <span className="text-[9px] font-extrabold uppercase text-slate-450 dark:text-zinc-500 tracking-wider block leading-none">
                            {dayName}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-1 block">
                            {d} {monthNameShort}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {isToday && (
                            <span className="text-[8px] font-extrabold px-1 py-0.5 bg-black dark:bg-white text-white dark:text-black rounded uppercase tracking-wider">
                              {t.today}
                            </span>
                          )}
                          {isPast && (
                            <Lock className="w-2.5 h-2.5 text-slate-350 dark:text-zinc-600" />
                          )}
                          {dayTasks.length > 0 && (
                            <span className="text-[9px] font-black text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                              {dayTasks.length}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Dropzone Container */}
                      <div className="p-1.5 flex-1 flex flex-col gap-1.5 min-h-[160px]">
                        {dayTasks.length === 0 ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-2 text-center border border-dashed border-slate-150 dark:border-zinc-900 rounded-xl min-h-[130px]">
                            <HelpCircle className="w-4 h-4 text-slate-300 dark:text-zinc-850 mb-1 flex-shrink-0" />
                            <span className="text-[8px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                              {isDragOver 
                                ? (lang === 'az' ? 'BURAXIN!' : 'DROP HERE!') 
                                : (lang === 'az' ? 'Yoxdur' : 'Empty')}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1.5 flex-1">
                            {dayTasks.map((task) => {
                              const isCompleted = task.status === 'completed';
                              const isMissed = task.status === 'missed';

                              return (
                                <div
                                  key={task.id}
                                  draggable="true"
                                  onDragStart={(e) => handleDragStart(e, task.id)}
                                  onDragEnd={handleDragEnd}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(dateStr);
                                  }}
                                  className={`p-2 rounded-xl border transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-2xs group/item text-left relative ${
                                    isCompleted
                                      ? 'bg-emerald-50/40 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/10 text-emerald-900 dark:text-emerald-400'
                                      : isMissed
                                      ? 'bg-rose-50/40 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/10 text-rose-900 dark:text-rose-400'
                                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 hover:border-slate-350 dark:hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="min-w-0 pr-6">
                                    <p className={`text-[11px] font-bold leading-tight break-words line-clamp-2 ${
                                      isCompleted ? 'line-through opacity-60' : ''
                                    }`}>
                                      {task.title}
                                    </p>
                                  </div>

                                  {/* Quick Actions overlay on hover */}
                                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                    {!isPast ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateTaskStatus(task.id, isCompleted ? 'pending' : 'completed');
                                          }}
                                          className="p-0.5 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-zinc-300 transition cursor-pointer"
                                        >
                                          {isCompleted ? (
                                            <span className="w-2.5 h-2.5 rounded-full border border-slate-400 dark:border-zinc-500 block" />
                                          ) : (
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                          )}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteTask(task.id);
                                          }}
                                          className="p-0.5 bg-slate-50 dark:bg-zinc-850 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded transition cursor-pointer"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <Lock className="w-2.5 h-2.5 text-slate-400 dark:text-zinc-600" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. Selected Day Panel */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="border-b border-zinc-100 dark:border-zinc-850 pb-4 mb-4">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 block uppercase tracking-wider mb-1">
                {lang === 'az' ? 'Seçilmiş Gün' : 'Selected Day'}
              </span>
              <h3 className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 text-xs uppercase tracking-wider">
                <CalendarIcon className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                {selectedDate}
                {selectedDate === TODAY_STR && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold rounded-md">
                    {t.today}
                  </span>
                )}
              </h3>
            </div>

            {isPastSelectedDate && (
              <div className="mb-4 p-3 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-start gap-2">
                <Lock className="w-4 h-4 text-zinc-400 dark:text-zinc-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                  {t.pastReadOnly}
                </p>
              </div>
            )}

            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-2">
              {t.tasksFor} ({selectedDateTasks.length})
            </h4>

            {selectedDateTasks.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl mb-4">
                <HelpCircle className="w-7 h-7 text-zinc-300 dark:text-zinc-700 mx-auto mb-1.5" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.noTasksDay}</p>
              </div>
            ) : (
              <div className="space-y-2 mb-4 max-h-[190px] overflow-y-auto pr-1">
                {selectedDateTasks.map((task) => (
                  <div
                    id={`calendar-task-card-${task.id}`}
                    key={task.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-150 dark:border-zinc-850 flex items-start justify-between gap-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {task.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        {task.status === 'missed' && <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                        {task.status === 'pending' && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />}
                        <h5 className={`font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                          {task.title}
                        </h5>
                      </div>
                      {task.description && (
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {!isPastSelectedDate ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.status !== 'completed' ? (
                          <button
                            id={`complete-task-btn-${task.id}`}
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded transition cursor-pointer"
                            title="Complete"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            id={`uncomplete-task-btn-${task.id}`}
                            onClick={() => updateTaskStatus(task.id, 'pending')}
                            className="p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded transition cursor-pointer"
                            title="Pending"
                          >
                            <span className="w-3 h-3 rounded-full border border-zinc-400 dark:border-zinc-500 block" />
                          </button>
                        )}
                        <button
                          id={`delete-task-btn-${task.id}`}
                          onClick={() => deleteTask(task.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded transition cursor-pointer"
                          title="Delete"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-md capitalize font-bold">
                        {task.status === 'completed' ? t.completed : t.missed}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inline creation form */}
          {!isPastSelectedDate && (
            <form onSubmit={handleCreateTaskSubmit} className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
              <h4 className="text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
                {t.createTask}
              </h4>

              {errorMsg && (
                <div className="mb-3 p-2 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/40 text-[10px] text-red-700 dark:text-red-400 rounded-lg">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2.5">
                <input
                  id="new-task-title-input"
                  type="text"
                  required
                  placeholder={t.taskTitle}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all"
                />
                <textarea
                  id="new-task-desc-input"
                  placeholder={t.taskDesc}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all resize-none"
                />
                <Button
                  id="submit-new-task-btn"
                  type="submit"
                  disabled={isSubmitting || !newTaskTitle.trim()}
                  isLoading={isSubmitting}
                  className="w-full py-2 bg-black dark:bg-white hover:bg-slate-850 dark:hover:bg-slate-100 disabled:bg-slate-200 dark:disabled:bg-zinc-800 text-white dark:text-black rounded-lg text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {t.addTask}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
