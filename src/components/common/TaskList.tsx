import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Task, Language } from '../../types';
import { translations } from '../../translations';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  lang: Language;
  onUpdateTask: (id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'date' | 'status'>>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export default function TaskList({
  tasks,
  lang,
  onUpdateTask,
  onDeleteTask,
}: TaskListProps) {
  const t = translations[lang];

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center transition-colors">
        <HelpCircle className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
        <h3 className="font-bold text-lg text-slate-700 dark:text-zinc-350 mb-1">{t.noTasksFound}</h3>
        <p className="text-sm text-slate-400 dark:text-zinc-500">{t.noTasksDay}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          lang={lang}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
