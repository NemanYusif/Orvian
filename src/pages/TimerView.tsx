import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Timer, Sliders, Hourglass, Award, Bell, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../context/useAppStore';
import { translations } from '../translations';

type TimerMode = 'countdown' | 'stopwatch' | 'pomodoro';
type PomodoroPhase = 'work' | 'break' | 'long_break';

export default function TimerView() {
  const { lang } = useAppStore();
  const t = translations[lang];

  // Global mode selection
  const [activeMode, setActiveMode] = useState<TimerMode>('countdown');

  // Audio completion sound
  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration - 0.02);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      // Beautiful double-bell chime
      playTone(659.25, now, 0.15); // E5
      playTone(880.00, now + 0.15, 0.4); // A5
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by user interaction', e);
    }
  };

  // -------------------------------------------------------------
  // 1. COUNTDOWN TIMER STATE
  // -------------------------------------------------------------
  const [cdHoursInput, setCdHoursInput] = useState<number>(0);
  const [cdMinutesInput, setCdMinutesInput] = useState<number>(10);
  const [cdSecondsInput, setCdSecondsInput] = useState<number>(0);
  
  const [cdTotalSeconds, setCdTotalSeconds] = useState<number>(10 * 60); // 10 minutes default
  const [cdRemaining, setCdRemaining] = useState<number>(10 * 60);
  const [cdIsRunning, setCdIsRunning] = useState<boolean>(false);
  const [showCdSettings, setShowCdSettings] = useState<boolean>(false);
  
  const cdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cdLastTickRef = useRef<number | null>(null);

  // Countdown controller
  useEffect(() => {
    if (cdIsRunning) {
      cdLastTickRef.current = Date.now();
      cdIntervalRef.current = setInterval(() => {
        if (cdLastTickRef.current !== null) {
          const now = Date.now();
          const delta = Math.round((now - cdLastTickRef.current) / 1000);
          if (delta >= 1) {
            setCdRemaining((prev) => {
              const next = prev - delta;
              if (next <= 0) {
                setCdIsRunning(false);
                playAlarmSound();
                return 0;
              }
              return next;
            });
            cdLastTickRef.current = now;
          }
        }
      }, 200);
    } else {
      if (cdIntervalRef.current) clearInterval(cdIntervalRef.current);
      cdLastTickRef.current = null;
    }

    return () => {
      if (cdIntervalRef.current) clearInterval(cdIntervalRef.current);
    };
  }, [cdIsRunning]);

  const handleCdStartPause = () => {
    if (cdRemaining <= 0) {
      // automatically reset to total if completed
      setCdRemaining(cdTotalSeconds);
    }
    setCdIsRunning(!cdIsRunning);
  };

  const handleCdReset = () => {
    setCdIsRunning(false);
    setCdRemaining(cdTotalSeconds);
  };

  const handleApplyCdDuration = () => {
    const total = (cdHoursInput * 3600) + (cdMinutesInput * 60) + cdSecondsInput;
    if (total <= 0) return;
    setCdTotalSeconds(total);
    setCdRemaining(total);
    setCdIsRunning(false);
    setShowCdSettings(false);
  };

  // -------------------------------------------------------------
  // 2. STOPWATCH STATE
  // -------------------------------------------------------------
  const [swTime, setSwTime] = useState<number>(0); // in milliseconds
  const [swIsRunning, setSwIsRunning] = useState<boolean>(false);
  const swAnimationFrameRef = useRef<number | null>(null);
  const swStartTimeRef = useRef<number | null>(null);
  const swAccumulatedRef = useRef<number>(0);

  const updateStopwatch = () => {
    if (swStartTimeRef.current !== null) {
      const now = Date.now();
      const elapsed = now - swStartTimeRef.current + swAccumulatedRef.current;
      setSwTime(elapsed);
      swAnimationFrameRef.current = requestAnimationFrame(updateStopwatch);
    }
  };

  useEffect(() => {
    if (swIsRunning) {
      swStartTimeRef.current = Date.now();
      swAnimationFrameRef.current = requestAnimationFrame(updateStopwatch);
    } else {
      if (swAnimationFrameRef.current !== null) {
        cancelAnimationFrame(swAnimationFrameRef.current);
      }
      if (swStartTimeRef.current !== null) {
        swAccumulatedRef.current += Date.now() - swStartTimeRef.current;
      }
      swStartTimeRef.current = null;
    }

    return () => {
      if (swAnimationFrameRef.current !== null) {
        cancelAnimationFrame(swAnimationFrameRef.current);
      }
    };
  }, [swIsRunning]);

  const handleSwStartPause = () => {
    setSwIsRunning(!swIsRunning);
  };

  const handleSwReset = () => {
    setSwIsRunning(false);
    swStartTimeRef.current = null;
    swAccumulatedRef.current = 0;
    setSwTime(0);
  };

  // -------------------------------------------------------------
  // 3. POMODORO STATE
  // -------------------------------------------------------------
  const POMODORO_DURATIONS: Record<PomodoroPhase, number> = {
    work: 25 * 60,       // 25 mins
    break: 5 * 60,       // 5 mins
    long_break: 15 * 60, // 15 mins
  };

  const [pomoPhase, setPomoPhase] = useState<PomodoroPhase>('work');
  const [pomoRemaining, setPomoRemaining] = useState<number>(POMODORO_DURATIONS.work);
  const [pomoIsRunning, setPomoIsRunning] = useState<boolean>(false);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [autoStartNext, setAutoStartNext] = useState<boolean>(true);

  const pomoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pomoLastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (pomoIsRunning) {
      pomoLastTickRef.current = Date.now();
      pomoIntervalRef.current = setInterval(() => {
        if (pomoLastTickRef.current !== null) {
          const now = Date.now();
          const delta = Math.round((now - pomoLastTickRef.current) / 1000);
          if (delta >= 1) {
            setPomoRemaining((prev) => {
              const next = prev - delta;
              if (next <= 0) {
                // Phase completed!
                playAlarmSound();
                let nextPhase: PomodoroPhase = 'work';
                let nextCycles = completedCycles;

                if (pomoPhase === 'work') {
                  nextCycles += 1;
                  setCompletedCycles(nextCycles);
                  if (nextCycles > 0 && nextCycles % 4 === 0) {
                    nextPhase = 'long_break';
                  } else {
                    nextPhase = 'break';
                  }
                } else {
                  nextPhase = 'work';
                }

                setPomoPhase(nextPhase);
                const nextDuration = POMODORO_DURATIONS[nextPhase];
                
                if (!autoStartNext) {
                  setPomoIsRunning(false);
                }
                
                return nextDuration;
              }
              return next;
            });
            pomoLastTickRef.current = now;
          }
        }
      }, 200);
    } else {
      if (pomoIntervalRef.current) clearInterval(pomoIntervalRef.current);
      pomoLastTickRef.current = null;
    }

    return () => {
      if (pomoIntervalRef.current) clearInterval(pomoIntervalRef.current);
    };
  }, [pomoIsRunning, pomoPhase, completedCycles, autoStartNext]);

  const handlePomoStartPause = () => {
    setPomoIsRunning(!pomoIsRunning);
  };

  const handlePomoReset = () => {
    setPomoIsRunning(false);
    setPomoRemaining(POMODORO_DURATIONS[pomoPhase]);
  };

  const handlePomoSkip = () => {
    setPomoIsRunning(false);
    let nextPhase: PomodoroPhase = 'work';
    if (pomoPhase === 'work') {
      const nextCycles = completedCycles + 1;
      setCompletedCycles(nextCycles);
      nextPhase = nextCycles % 4 === 0 ? 'long_break' : 'break';
    } else {
      nextPhase = 'work';
    }
    setPomoPhase(nextPhase);
    setPomoRemaining(POMODORO_DURATIONS[nextPhase]);
  };

  // Helper formatting functions
  const formatTimeHHMMSS = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatStopwatch = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const centis = Math.floor((ms % 1000) / 10);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${pad(centis)}`;
    }
    return `${pad(mins)}:${pad(secs)}.${pad(centis)}`;
  };

  // Circular progress calculations
  const calculateProgressPercent = () => {
    if (activeMode === 'countdown') {
      return cdTotalSeconds > 0 ? (cdRemaining / cdTotalSeconds) * 100 : 100;
    }
    if (activeMode === 'stopwatch') {
      // stopwatch infinite cycle mapped to 60 seconds
      const cycleMs = 60 * 1000;
      return ((swTime % cycleMs) / cycleMs) * 100;
    }
    // Pomodoro Mode
    const totalPhaseDuration = POMODORO_DURATIONS[pomoPhase];
    return totalPhaseDuration > 0 ? (pomoRemaining / totalPhaseDuration) * 100 : 100;
  };

  const progressPercent = calculateProgressPercent();
  const radius = 100;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex flex-col h-full bg-slate-50/20 dark:bg-zinc-950/20 overflow-hidden animate-fade-in">
      {/* Top Header */}
      <div className="px-6 py-4 bg-white dark:bg-zinc-950 border-b border-slate-150 dark:border-zinc-900 flex items-center justify-between flex-shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-zinc-50 tracking-tight">
              {t.timerTitle}
            </h1>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
              {t.timerDesc}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector & Main Body */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col items-center">
        <div className="w-full max-w-xl space-y-6">
          
          {/* Mode Selector Pill Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200/50 dark:border-zinc-800/80">
            <button
              onClick={() => { setActiveMode('countdown'); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                activeMode === 'countdown'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {t.countdownMode}
            </button>
            <button
              onClick={() => { setActiveMode('stopwatch'); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                activeMode === 'stopwatch'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {t.stopwatchMode}
            </button>
            <button
              onClick={() => { setActiveMode('pomodoro'); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                activeMode === 'pomodoro'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {t.pomodoroMode}
            </button>
          </div>

          {/* Central Circular Display Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800/80 shadow-md p-8 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300">
            
            {/* Ambient Background decoration for visual punch */}
            <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent pointer-events-none" />

            {/* Title / Phase Badge */}
            <div className="mb-6 z-10">
              {activeMode === 'countdown' && (
                <span className="text-[10px] px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-extrabold tracking-wider uppercase rounded-full border border-slate-200/50 dark:border-zinc-700/50">
                  {t.countdownMode}
                </span>
              )}
              {activeMode === 'stopwatch' && (
                <span className="text-[10px] px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-extrabold tracking-wider uppercase rounded-full border border-slate-200/50 dark:border-zinc-700/50">
                  {t.stopwatchMode}
                </span>
              )}
              {activeMode === 'pomodoro' && (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-2.5 py-1 font-extrabold tracking-wider uppercase rounded-full border ${
                    pomoPhase === 'work'
                      ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30'
                      : pomoPhase === 'break'
                      ? 'bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30'
                      : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30'
                  }`}>
                    {pomoPhase === 'work' ? t.workPeriod : pomoPhase === 'break' ? t.breakPeriod : t.longBreakPeriod}
                  </span>
                </div>
              )}
            </div>

            {/* Circular Timer Ring */}
            <div className="relative w-64 h-64 flex items-center justify-center z-10">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  className="stroke-slate-100 dark:stroke-zinc-800 transition-colors"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="128"
                  cy="128"
                  r={radius}
                  className={`transition-all duration-150 ease-out ${
                    activeMode === 'countdown'
                      ? 'stroke-indigo-600 dark:stroke-indigo-400'
                      : activeMode === 'stopwatch'
                      ? 'stroke-cyan-500 dark:stroke-cyan-400'
                      : pomoPhase === 'work'
                      ? 'stroke-red-500 dark:stroke-red-400'
                      : pomoPhase === 'break'
                      ? 'stroke-green-500 dark:stroke-green-400'
                      : 'stroke-blue-500 dark:stroke-blue-400'
                  }`}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>

              {/* Central Time Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono font-black tracking-tight transition-colors duration-200 ${
                  activeMode === 'stopwatch'
                    ? 'text-3xl md:text-4xl text-slate-850 dark:text-zinc-50'
                    : 'text-4xl md:text-5xl text-slate-900 dark:text-zinc-50'
                }`}>
                  {activeMode === 'countdown' && formatTimeHHMMSS(cdRemaining)}
                  {activeMode === 'stopwatch' && formatStopwatch(swTime)}
                  {activeMode === 'pomodoro' && formatTimeHHMMSS(pomoRemaining)}
                </span>
                
                {/* Under-time auxiliary label */}
                {activeMode === 'countdown' && cdRemaining === 0 && (
                  <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest mt-1 flex items-center gap-1 animate-pulse">
                    <Bell className="w-3.5 h-3.5" />
                    {t.timerCompleted}
                  </span>
                )}
                {activeMode === 'pomodoro' && (
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    {t.sessionsCompleted}: {completedCycles}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions & Setup Triggers */}
            <div className="mt-6 flex flex-col items-center gap-4 w-full z-10">
              
              {/* Countdown Set Duration Drawer Toggle */}
              {activeMode === 'countdown' && (
                <div className="w-full flex justify-center">
                  {!showCdSettings ? (
                    <button
                      onClick={() => setShowCdSettings(true)}
                      disabled={cdIsRunning}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 rounded-lg text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                      {t.setDuration}
                    </button>
                  ) : (
                    <div className="w-full max-w-sm p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col gap-3 animate-slide-up">
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="text-center">
                          <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{t.hours}</label>
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={cdHoursInput}
                            onChange={(e) => setCdHoursInput(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-lg px-2 py-1 text-center text-xs font-bold"
                          />
                        </div>
                        <div className="text-center">
                          <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{t.minutes}</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={cdMinutesInput}
                            onChange={(e) => setCdMinutesInput(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-lg px-2 py-1 text-center text-xs font-bold"
                          />
                        </div>
                        <div className="text-center">
                          <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">{t.seconds}</label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={cdSecondsInput}
                            onChange={(e) => setCdSecondsInput(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-50 rounded-lg px-2 py-1 text-center text-xs font-bold"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end text-[10px]">
                        <button
                          onClick={() => setShowCdSettings(false)}
                          className="px-3 py-1.5 text-slate-500 dark:text-zinc-400 font-bold uppercase hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
                        >
                          {t.cancel}
                        </button>
                        <button
                          onClick={handleApplyCdDuration}
                          className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black rounded-lg font-bold uppercase hover:opacity-90 cursor-pointer"
                        >
                          {t.apply}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Central Controls Buttons */}
              <div className="flex items-center gap-4 mt-2">
                {/* Reset button */}
                <button
                  onClick={
                    activeMode === 'countdown'
                      ? handleCdReset
                      : activeMode === 'stopwatch'
                      ? handleSwReset
                      : handlePomoReset
                  }
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-slate-250/60 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-300 rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-3xs"
                  title={t.reset}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                {/* Main Play/Pause Button */}
                <button
                  onClick={
                    activeMode === 'countdown'
                      ? handleCdStartPause
                      : activeMode === 'stopwatch'
                      ? handleSwStartPause
                      : handlePomoStartPause
                  }
                  className={`p-5 text-white rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md ${
                    activeMode === 'countdown'
                      ? cdIsRunning
                        ? 'bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-650'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                      : activeMode === 'stopwatch'
                      ? swIsRunning
                        ? 'bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-650'
                        : 'bg-cyan-500 hover:bg-cyan-600'
                      : pomoIsRunning
                      ? 'bg-slate-800 hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-650'
                      : pomoPhase === 'work'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {((activeMode === 'countdown' && cdIsRunning) ||
                    (activeMode === 'stopwatch' && swIsRunning) ||
                    (activeMode === 'pomodoro' && pomoIsRunning)) ? (
                    <Pause className="w-7 h-7 fill-white" />
                  ) : (
                    <Play className="w-7 h-7 fill-white ml-0.5" />
                  )}
                </button>

                {/* Skip option (only in Pomodoro mode) */}
                {activeMode === 'pomodoro' && (
                  <button
                    onClick={handlePomoSkip}
                    className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-slate-250/60 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-300 rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-3xs"
                    title={lang === 'az' ? 'Mərhələni Keç' : 'Skip Phase'}
                  >
                    <Hourglass className="w-5 h-5 text-amber-500" />
                  </button>
                )}
              </div>

              {/* Pomodoro Autostart toggles & Cycle indicators */}
              {activeMode === 'pomodoro' && (
                <div className="w-full border-t border-slate-100 dark:border-zinc-800/80 pt-5 mt-2 space-y-4 text-center">
                  
                  {/* Cycles Dots visualizer */}
                  <div className="flex justify-center items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mr-2">{t.cycleTracker}:</span>
                    {[1, 2, 3, 4].map((num) => {
                      const completedCount = completedCycles % 4 || (completedCycles > 0 ? 4 : 0);
                      const isDone = completedCycles >= num || (Math.floor(completedCycles / 4) * 4 + num <= completedCycles);
                      return (
                        <div
                          key={num}
                          className={`w-3.5 h-3.5 rounded-full border transition-all duration-300 flex items-center justify-center ${
                            isDone
                              ? 'bg-red-500 border-red-500 text-white shadow-2xs'
                              : 'bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700'
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[9px] text-slate-400 dark:text-zinc-500 leading-normal max-w-xs mx-auto">
                    {t.longBreakHint}
                  </p>

                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="checkbox"
                      id="autostart-pomo"
                      checked={autoStartNext}
                      onChange={(e) => setAutoStartNext(e.target.checked)}
                      className="w-3.5 h-3.5 accent-red-500 cursor-pointer"
                    />
                    <label htmlFor="autostart-pomo" className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 cursor-pointer uppercase tracking-wider">
                      {lang === 'az' ? 'Növbəti seansa avtomatik keç' : 'Auto-start next phase'}
                    </label>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Productivity Tip Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-cyan-50 dark:from-zinc-900/50 dark:to-zinc-900/30 p-5 rounded-2xl border border-indigo-100/50 dark:border-zinc-800/80 flex items-start gap-3.5 transition-colors duration-300">
            <div className="p-2 bg-white dark:bg-zinc-800 text-indigo-500 dark:text-indigo-400 rounded-xl shadow-3xs flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-slate-800 dark:text-zinc-100 tracking-tight uppercase">
                {lang === 'az' ? 'Məhsuldarlıq Koç Məsləhəti' : 'Productivity Coach Tip'}
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                {activeMode === 'pomodoro'
                  ? (lang === 'az'
                      ? 'Pomodoro metodu beyni fokuslanmış iş və qısa fasilələr arasında tarazlıqda saxlayır. Seans ərzində telefon bildirişlərini söndürün.'
                      : 'The Pomodoro technique keeps the brain balanced between focused execution and restorative pauses. Mute notifications during sessions.')
                  : activeMode === 'countdown'
                  ? (lang === 'az'
                      ? 'Tapşırıqların icrasına vaxt limiti (timeboxing) qoymaq ertələmə vərdişini azaldır və sürətli tamamlamağa kömək edir.'
                      : 'Setting a strict timebox for tasks is proven to beat procrastination. Challenge yourself to finish before the bell rings!')
                  : (lang === 'az'
                      ? 'Saniyəölçəni fəaliyyətlərinizin real olaraq nə qədər vaxt apardığını ölçmək üçün istifadə edin. Zaman xərclərinizi dəqiq analiz edin.'
                      : 'Use the stopwatch to benchmark how long recurring activities actually take. Perfect for precise productivity auditing.')}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
