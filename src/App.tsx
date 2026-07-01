import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useAppStore } from './context/useAppStore';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import CalendarView from './pages/CalendarView';
import TasksView from './pages/TasksView';
import ProfileView from './pages/ProfileView';
import AnalyticsView from './pages/AnalyticsView';
import AICoachView from './pages/AICoachView';
import AdminView from './pages/AdminView';
import TimerView from './pages/TimerView';
import Logo from './components/common/Logo';
import { translations } from './translations';
import { Language } from './types';

export default function App() {
  const {
    token,
    user,
    tasks,
    lang,
    isDark,
    currentTab,
    isAppLoading,
    setLang,
    setIsDark,
    setCurrentTab,
    initializeSession,
    login,
    register,
    logout,
  } = useAppStore();

  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = React.useState('');
  const [passwordInput, setPasswordInput] = React.useState('');
  const [authError, setAuthError] = React.useState('');
  const [isAuthLoading, setIsAuthLoading] = React.useState(false);

  const t = translations[lang];

  // Restore and Validate Session on Mount
  React.useEffect(() => {
    initializeSession();
  }, []);

  // Sync Theme Class with Document Element
  React.useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const handleToggleDark = () => {
    setIsDark(!isDark);
  };

  const handleLangChange = (nextLang: Language) => {
    setLang(nextLang);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput.trim() || passwordInput.length < 4) {
      setAuthError(lang === 'az' ? 'Şifrə ən azı 4 simvoldan ibarət olmalıdır!' : 'Password must be at least 4 characters long!');
      return;
    }

    setIsAuthLoading(true);
    try {
      if (authMode === 'login') {
        await login(usernameInput.trim(), passwordInput);
      } else {
        await register(usernameInput.trim(), passwordInput);
      }
      setAuthError('');
      setUsernameInput('');
      setPasswordInput('');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Error occurred');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Loading indicator for restoring active session
  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-slate-200 dark:border-zinc-800 rounded-full border-t-black dark:border-t-white animate-spin" />
        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 tracking-widest uppercase">
          {lang === 'az' ? 'Sistem yüklənir...' : 'Restoring workspace...'}
        </span>
      </div>
    );
  }

  // UNAUTHENTICATED GATE (Registration / Login)
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-955 flex flex-col justify-center items-center p-4 transition-colors duration-350">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            id="login-lang-switch"
            onClick={() => handleLangChange(lang === 'az' ? 'en' : 'az')}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-xs font-bold text-slate-700 dark:text-zinc-300 shadow-xs cursor-pointer"
          >
            {lang === 'az' ? 'ENGLISH' : 'AZƏRBAYCAN'}
          </button>
          <button
            id="login-theme-toggle"
            onClick={handleToggleDark}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-slate-750 dark:text-zinc-350 cursor-pointer shadow-xs"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs p-8 space-y-6 transition-all duration-300">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Logo size="lg" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight">{t.appName}</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">{t.subtitle}</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/10 border border-red-150 dark:border-red-900/30 text-xs text-red-700 dark:text-red-400 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide mb-1">{t.username}</label>
                <input
                  id="auth-username-input"
                  type="text"
                  required
                  placeholder={lang === 'az' ? 'Məs. neman' : 'e.g. user'}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-855 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide mb-1">{t.password}</label>
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-855 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black transition-all"
                />
              </div>
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-2.5 bg-black dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 disabled:bg-slate-200 dark:disabled:bg-zinc-800 text-white dark:text-black font-semibold rounded-lg text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isAuthLoading ? (
                <div className="w-4 h-4 border-2 border-white/40 rounded-full border-t-white animate-spin" />
              ) : (
                <span>{authMode === 'login' ? t.login : t.signup}</span>
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <button
              id="auth-mode-toggle"
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              className="text-xs font-semibold text-slate-900 underline dark:text-zinc-300 hover:text-black cursor-pointer"
            >
              {authMode === 'login' ? t.noAccount : t.hasAccount}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED WORKSPACE
  const todayTasks = tasks.filter((t) => t.date === '2026-07-01');
  const todayCompleted = todayTasks.filter((t) => t.status === 'completed').length;
  const todayTotal = todayTasks.length;
  
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const overallRatio = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const todayPerformanceRatio = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : overallRatio;

  const formattedToday = lang === 'az' ? `01 İyul, 2026` : `July 1, 2026`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col md:flex-row transition-colors duration-250">
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        isAdmin={user.role === 'admin' || user.role === 'superadmin'}
        lang={lang}
        onLangChange={handleLangChange}
        isDark={isDark}
        onToggleDark={handleToggleDark}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full bg-slate-50 dark:bg-zinc-900/10">
        <Navbar
          user={user}
          todayPerformanceRatio={todayPerformanceRatio}
          formattedToday={formattedToday}
          lang={lang}
          onOpenProfile={() => setCurrentTab('profile')}
        />

        <div className={`flex-1 ${(currentTab === 'coach' || currentTab === 'timer') ? 'overflow-hidden' : 'p-4 md:p-8 overflow-y-auto'}`}>
          <div className={(currentTab === 'coach' || currentTab === 'timer') ? 'h-full w-full' : 'max-w-7xl mx-auto space-y-6'}>
            {currentTab === 'calendar' && <CalendarView />}
            {currentTab === 'tasks' && <TasksView />}
            {currentTab === 'analytics' && <AnalyticsView />}
            {currentTab === 'coach' && <AICoachView />}
            {currentTab === 'timer' && <TimerView />}
            {currentTab === 'profile' && <ProfileView />}
            {currentTab === 'admin' && (user.role === 'admin' || user.role === 'superadmin') && <AdminView />}
          </div>
        </div>
      </main>
    </div>
  );
}
