import React from 'react';
import { Search, Plus, X, CheckSquare } from 'lucide-react';
import { useAppStore } from '../context/useAppStore';
import { translations } from '../translations';
import TaskList from '../components/common/TaskList';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function TasksView() {
  const { tasks, lang, token, addTask, updateTask, deleteTask } = useAppStore();
  const t = translations[lang];
  const TODAY_STR = '2026-07-01';

  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'completed' | 'missed'>('all');
  const [isCreating, setIsCreating] = React.useState(false);

  const [newTitle, setNewTitle] = React.useState('');
  const [newDesc, setNewDesc] = React.useState('');
  const [newDate, setNewDate] = React.useState(TODAY_STR);

  const [errorMsg, setErrorMsg] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Quick Suggest State
  const [suggestion, setSuggestion] = React.useState<{ hasSuggestion: boolean; taskTitle: string; reason: string } | null>(null);
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [suggestError, setSuggestError] = React.useState('');

  const handleGenerateSuggestion = async () => {
    setIsSuggesting(true);
    setSuggestError('');
    try {
      const response = await fetch('/api/ai-mentor/quick-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ language: lang })
      });
      if (!response.ok) {
        throw new Error('Failed to fetch priority task.');
      }
      const data = await response.json();
      setSuggestion(data);
    } catch (err: any) {
      console.error(err);
      setSuggestError(lang === 'az' ? 'Təklif alınarkən xəta baş verdi.' : 'Failed to retrieve priority task suggestion.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setErrorMsg('');

    if (newDate < TODAY_STR) {
      setErrorMsg(t.pastReadOnly);
      return;
    }

    setIsSubmitting(true);
    try {
      await addTask(newTitle.trim(), newDesc.trim(), newDate);
      setNewTitle('');
      setNewDesc('');
      setNewDate(TODAY_STR);
      setIsCreating(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

    return matchesSearch && matchesStatus;
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between transition-colors">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="task-search-input"
            type="text"
            placeholder={t.searchTasks}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all"
          />
        </div>

        {/* Filters and Add Button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl gap-1">
            {(['all', 'pending', 'completed', 'missed'] as const).map((status) => (
              <button
                id={`filter-btn-${status}`}
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700 shadow-xs font-bold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {status === 'all' ? t.filterAll : t[status]}
              </button>
            ))}
          </div>

          <Button
            id="add-task-view-toggle"
            onClick={() => setIsCreating(!isCreating)}
            size="sm"
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createTask}</span>
          </Button>
        </div>
      </div>

      {/* Quick Suggest Card */}
      <div className="bg-slate-50/75 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
        <div className="space-y-1 max-w-xl">
          <h3 className="font-black text-slate-900 dark:text-zinc-50 text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5">
            <span className="animate-pulse">✨</span> {lang === 'az' ? 'Sürətli Təklif (AI)' : 'Quick Suggest (AI)'}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
            {lang === 'az' 
              ? 'Gözləmədə olan tapşırıqlarınızı analiz edin və süni intellektin bu gün üçün seçdiyi ən vacib hədəfi müəyyənləşdirin.' 
              : 'Analyze unfinished tasks and let AI pinpoint the single highest-priority target to focus on today.'}
          </p>
          
          {suggestion && (
            <div className="mt-4 p-4 bg-white dark:bg-zinc-950 border border-slate-250 dark:border-zinc-850 rounded-xl space-y-2 shadow-xs animate-fade-in text-xs">
              {suggestion.hasSuggestion ? (
                <>
                  <div className="font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-1">
                    <span>🔥</span> {lang === 'az' ? 'Bugün üçün ən vacib tapşırıq:' : 'Top Priority Task for Today:'}
                  </div>
                  <div className="font-black text-sm text-indigo-650 dark:text-indigo-400 border-l-2 border-indigo-500 pl-2.5 py-0.5">
                    {suggestion.taskTitle}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2 space-y-1">
                    <div className="font-bold text-slate-700 dark:text-zinc-300">{lang === 'az' ? 'Səbəb:' : 'Reason:'}</div>
                    {suggestion.reason.split('\n').map((line, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-500">•</span>
                        <span>{line.replace(/^-\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-slate-600 dark:text-zinc-400 font-medium py-1">
                  ✨ {suggestion.reason}
                </div>
              )}
            </div>
          )}

          {suggestError && (
            <div className="mt-3 text-[11px] text-rose-500 font-semibold">
              ⚠️ {suggestError}
            </div>
          )}
        </div>

        <button
          id="generate-priority-task-btn"
          onClick={handleGenerateSuggestion}
          disabled={isSuggesting}
          className="px-4 py-2.5 bg-black hover:bg-slate-900 dark:bg-zinc-100 dark:hover:bg-slate-200 disabled:bg-slate-200 dark:disabled:bg-zinc-800 text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 self-start md:self-center"
        >
          {isSuggesting ? (
            <>
              <div className="w-3.5 h-3.5 border border-white/20 dark:border-black/20 border-t-white dark:border-t-black rounded-full animate-spin" />
              <span>{lang === 'az' ? 'Təhlil edilir...' : 'Analyzing...'}</span>
            </>
          ) : (
            <span>{lang === 'az' ? 'Ən Vacib Tapşırığı Tap' : 'Generate Priority Task'}</span>
          )}
        </button>
      </div>

      {/* Create Task Form Panel */}
      {isCreating && (
        <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs transition-all duration-200">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-150 dark:border-zinc-850 mb-4">
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2 text-xs uppercase tracking-wider">
              <CheckSquare className="w-5 h-5 text-slate-800 dark:text-zinc-200" />
              {t.createTask}
            </h3>
            <button
              id="cancel-create-task"
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-slate-650 dark:hover:text-zinc-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/40 text-xs text-red-700 dark:text-red-400 rounded-xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input
              id="create-task-title"
              label={t.taskTitle}
              required
              placeholder={t.taskTitle}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Input
              id="create-task-desc"
              label={t.taskDesc}
              placeholder={t.taskDesc}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide mb-1">
                  {t.taskDate}
                </label>
                <input
                  id="create-task-date"
                  type="date"
                  required
                  min={TODAY_STR}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-850 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all h-[38px]"
                />
              </div>
              <Button
                id="submit-create-task-btn"
                type="submit"
                disabled={!newTitle.trim()}
                isLoading={isSubmitting}
                className="w-full h-[38px]"
              >
                {t.save}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Task List Component */}
      <TaskList
        tasks={filteredTasks}
        lang={lang}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
      />
    </div>
  );
}
