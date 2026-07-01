import React from 'react';
import { 
  Calendar, 
  CheckSquare, 
  ShieldAlert, 
  BarChart3, 
  Sparkles, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Timer
} from 'lucide-react';
import { ViewTab, Language } from '../../types';
import { translations } from '../../translations';
import Logo from '../common/Logo';

interface SidebarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  isAdmin: boolean;
  lang: Language;
  onLangChange: (lang: Language) => void;
  isDark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentTab,
  onTabChange,
  isAdmin,
  lang,
  onLangChange,
  isDark,
  onToggleDark,
  onLogout,
}: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const t = translations[lang];

  // We remove the profile option as requested
  const menuItems = [
    { id: 'calendar' as ViewTab, label: t.calendar, icon: Calendar },
    { id: 'tasks' as ViewTab, label: t.tasks, icon: CheckSquare },
    { id: 'analytics' as ViewTab, label: t.analytics, icon: BarChart3 },
    { id: 'coach' as ViewTab, label: t.aiCoach, icon: Sparkles },
    { id: 'timer' as ViewTab, label: t.timer, icon: Timer },
  ];

  if (isAdmin) {
    menuItems.push({ id: 'admin' as ViewTab, label: t.adminPanel, icon: ShieldAlert });
  }

  const toggleMobile = () => setIsOpen(!isOpen);

  const handleNav = (tab: ViewTab) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div id="mobile-header" className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 md:hidden sticky top-0 z-50 transition-colors">
        <button
          onClick={() => handleNav('calendar')}
          className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 hover:opacity-80 active:scale-95 transition-all text-left"
        >
          <Logo size="sm" />
          <span className="font-bold text-base text-slate-900 dark:text-zinc-100">{t.appName}</span>
        </button>
        <button
          id="toggle-mobile-sidebar"
          onClick={toggleMobile}
          className="p-2 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          onClick={toggleMobile}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-45 w-64 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Header */}
          <button
            onClick={() => onTabChange('calendar')}
            className="w-full text-left p-6 border-b border-slate-100 dark:border-zinc-900 flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer bg-transparent border-none"
          >
            <Logo size="md" />
            <div>
              <h1 className="font-bold text-base text-slate-900 dark:text-zinc-50 leading-tight tracking-tight">{t.appName}</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">{lang === 'az' ? '1 illik plan' : '1-year tracker'}</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="px-3 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              
              const activeClass = item.id === 'coach' 
                ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-950/20 dark:text-blue-400'
                : item.id === 'timer'
                ? 'bg-indigo-50 text-indigo-600 font-semibold dark:bg-indigo-950/20 dark:text-indigo-400'
                : 'bg-slate-100 text-black font-semibold dark:bg-zinc-800 dark:text-white';
              const inactiveClass = 'text-slate-500 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-900/60 hover:text-black dark:hover:text-white';

              return (
                <button
                  id={`nav-tab-${item.id}`}
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition duration-200 ${
                    isActive ? activeClass : inactiveClass
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div>
          {/* Controls: Theme & Language Config Box */}
          <div className="p-4 bg-slate-50 dark:bg-zinc-900/40 mx-4 mb-4 rounded-xl border border-slate-200 dark:border-zinc-800/60">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-bold">Config</p>
              {/* Theme Toggle */}
              <button
                id="toggle-dark-mode"
                onClick={onToggleDark}
                className="p-1 text-slate-400 hover:text-slate-650 dark:text-zinc-500 dark:hover:text-zinc-350 transition cursor-pointer"
                title={isDark ? 'Açıq rejim / Light mode' : 'Qaranlıq rejim / Dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                id="switch-lang-az"
                onClick={() => onLangChange('az')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  lang === 'az'
                    ? 'bg-white dark:bg-zinc-850 border border-slate-300 dark:border-zinc-700 text-black dark:text-white shadow-xs'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'
                }`}
              >
                AZ
              </button>
              <button
                id="switch-lang-en"
                onClick={() => onLangChange('en')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  lang === 'en'
                    ? 'bg-white dark:bg-zinc-850 border border-slate-300 dark:border-zinc-700 text-black dark:text-white shadow-xs'
                    : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-zinc-900">
            {/* Log Out */}
            <button
              id="logout-button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-500 hover:bg-slate-50 dark:text-zinc-400 dark:hover:bg-zinc-900/40 transition cursor-pointer"
            >
              <LogOut className="w-5 h-5 text-slate-450 dark:text-zinc-500" />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
