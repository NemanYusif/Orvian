import React from 'react';
import { Calendar, CheckSquare, Edit2, Trash2, Check, X, Lock } from 'lucide-react';
import { Task, Language } from '../../types';
import { translations } from '../../translations';
import Button from '../ui/Button';

interface TaskItemProps {
  key?: string | number;
  task: Task;
  lang: Language;
  onUpdateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'date' | 'status'>>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export default function TaskItem({
  task,
  lang,
  onUpdateTask,
  onDeleteTask,
}: TaskItemProps) {
  const t = translations[lang];
  const TODAY_STR = '2026-07-01';
  const isPast = task.date < TODAY_STR;

  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(task.title);
  const [editDesc, setEditDesc] = React.useState(task.description || '');
  const [editDate, setEditDate] = React.useState(task.date);
  const [editStatus, setEditStatus] = React.useState(task.status);
  
  const [errorMsg, setErrorMsg] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const startEdit = () => {
    if (isPast) {
      alert(t.pastReadOnly);
      return;
    }
    setIsEditing(true);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditDate(task.date);
    setEditStatus(task.status);
    setErrorMsg('');
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setErrorMsg('');

    if (editDate < TODAY_STR) {
      setErrorMsg(t.pastReadOnly);
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateTask(task.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        date: editDate,
        status: editStatus,
      });
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async () => {
    if (isPast) return;
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await onUpdateTask(task.id, { status: nextStatus });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Status colors styling
  let statusPill = '';
  if (task.status === 'completed') {
    statusPill = 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
  } else if (task.status === 'missed') {
    statusPill = 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
  } else {
    statusPill = 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
  }

  return (
    <div
      id={`task-list-card-${task.id}`}
      className={`bg-white dark:bg-zinc-950 border rounded-2xl p-5 shadow-xs transition-all duration-200 relative ${
        isEditing 
          ? 'border-black ring-1 ring-black dark:border-white dark:ring-white' 
          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-350 dark:hover:border-zinc-700'
      }`}
    >
      {/* Past lock watermark */}
      {isPast && (
        <span className="absolute top-4 right-4 text-zinc-400 dark:text-zinc-600 flex items-center gap-1 text-[10px] bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <Lock className="w-3 h-3" />
          <span>{lang === 'az' ? 'Arxiv' : 'Archive'}</span>
        </span>
      )}

      {isEditing ? (
        /* Edit State UI */
        <div className="space-y-4">
          {errorMsg && (
            <div className="p-2 bg-red-50 dark:bg-red-950/20 text-[10px] text-red-700 dark:text-red-400 rounded-lg">
              {errorMsg}
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase mb-1">{t.taskTitle}</label>
            <input
              id={`edit-title-${task.id}`}
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase mb-1">{t.taskDesc}</label>
            <input
              id={`edit-desc-${task.id}`}
              type="text"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase mb-1">{t.taskDate}</label>
              <input
                id={`edit-date-${task.id}`}
                type="date"
                required
                min={TODAY_STR}
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase mb-1">{t.status}</label>
              <select
                id={`edit-status-${task.id}`}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as Task['status'])}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="pending">{t.pending}</option>
                <option value="completed">{t.completed}</option>
                <option value="missed">{t.missed}</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              id={`cancel-edit-btn-${task.id}`}
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg text-xs hover:bg-slate-50 dark:hover:bg-zinc-900 transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <Button
              id={`save-edit-btn-${task.id}`}
              onClick={handleSaveEdit}
              isLoading={isSubmitting}
              disabled={!editTitle.trim()}
              size="sm"
            >
              {t.save}
            </Button>
          </div>
        </div>
      ) : (
        /* Display State UI */
        <div className="flex flex-col justify-between h-full space-y-4">
          <div>
            <div className="flex items-start gap-3 justify-between">
              <div className="flex items-start gap-3 min-w-0">
                {/* Complete Checkbox */}
                <button
                  id={`task-check-button-${task.id}`}
                  onClick={handleToggleComplete}
                  disabled={isPast}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors mt-0.5 cursor-pointer ${
                    task.status === 'completed'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-zinc-700 hover:border-black dark:hover:border-white bg-slate-50 dark:bg-zinc-900/50 text-transparent'
                  } ${isPast ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                <div className="min-w-0">
                  <h4 className={`font-bold text-sm text-zinc-850 dark:text-zinc-150 leading-snug truncate ${task.status === 'completed' ? 'line-through opacity-50' : ''}`}>
                    {task.title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {task.description || <span className="italic opacity-60 text-[10px]">{lang === 'az' ? 'təsvir yoxdur' : 'no description'}</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Metadata Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-900/60">
            <div className="flex items-center gap-3">
              {/* Date badge */}
              <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{task.date}</span>
              </div>

              {/* Status pill */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusPill}`}>
                {t[task.status]}
              </span>
            </div>

            {/* Actions (Only active if not archived in past) */}
            {!isPast && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  id={`edit-task-btn-${task.id}`}
                  onClick={startEdit}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-500 dark:text-zinc-400 hover:text-black dark:hover:text-white rounded-lg transition cursor-pointer"
                  title={t.editTask}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  id={`delete-task-btn-${task.id}`}
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 dark:text-zinc-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                  title={t.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
