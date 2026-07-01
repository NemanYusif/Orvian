import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, AlertCircle, Send, Trash2, Check, Plus, Calendar, Zap, User } from 'lucide-react';
import { useAppStore } from '../context/useAppStore';
import { translations } from '../translations';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  suggestedTasks?: Array<{ title: string; description: string; date: string }>;
  createdAt: string;
}

const QUICK_STARTERS = {
  az: [
    { label: "React öyrənmək istəyirəm", query: "Mən React öyrənmək istəyirəm. Mənə qısa addımlı plan və bu gün üçün kiçik bir tapşırıq ver." },
    { label: "Məhsuldarlığımı analiz et", query: "Mənim tapşırıq statistikalarımı və performansımı analiz et, mənə məsləhətlər ver." },
    { label: "Yeni dil öyrənmək", query: "Yeni bir xarici dil (məsələn İngilis dili) öyrənmək üçün mənə 1 aylıq strategiya və bugünkü ilk tapşırığı təklif et." },
    { label: "İdman və Sağlamlıq planı", query: "Mənim üçün hər gün edə biləcəyim sadə idman və sağlam qidalanma planı tərtib et." }
  ],
  en: [
    { label: "I want to learn React", query: "I want to learn React. Provide a step-by-step plan and a bite-sized task for today." },
    { label: "Analyze my productivity", query: "Analyze my task completion statistics and give me customized tips to improve." },
    { label: "Learn a new language", query: "Propose a simple weekly routine for learning a foreign language with a clear task for today." },
    { label: "Fitness & Health routine", query: "Design a simple, sustainable daily fitness and wellness routine." }
  ]
};

export default function AICoachView() {
  const { lang, token, user, addTask } = useAppStore();
  const t = translations[lang];

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  const [isClearing, setIsClearing] = React.useState(false);
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  
  // Track which suggested tasks have been added to calendar
  const [addedTasks, setAddedTasks] = React.useState<Record<string, boolean>>({});

  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  // Format timestamp nicely (e.g. 10:45 AM)
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Fetch conversation history on mount
  const fetchHistory = async () => {
    if (!token) return;
    setErrorMsg('');
    try {
      const response = await fetch('/api/ai-mentor/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, [token]);

  // Smooth scroll to latest message
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');
    const userMsgText = textToSend.trim();
    setInputValue('');

    // Optimistically add user's message to the UI
    const tempUserMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      text: userMsgText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await fetch('/api/ai-mentor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMsgText,
          language: lang
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to communicate with Mentor AI.');
      }

      const data = await response.json();
      
      // Add the model's message with suggested tasks to UI
      const tempModelMsg: ChatMessage = {
        id: 'model_' + Date.now(),
        role: 'model',
        text: data.text || '',
        suggestedTasks: data.suggestedTasks || [],
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempModelMsg]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error communicating with Mentor AI.');
    } finally {
      setIsLoading(false);
    }
  };

  // Perform a clean state clear both locally (frontend) and remotely (backend API)
  const executeClearChat = async () => {
    if (isClearing || !token) return;
    
    setIsClearing(true);
    setErrorMsg('');
    
    // 1. Instantly clear frontend state & loadings for maximum responsiveness
    setMessages([]);
    setAddedTasks({});
    setIsLoading(false);
    setInputValue('');

    // 2. Clear backend database records
    try {
      const response = await fetch('/api/ai-mentor/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to delete chat logs on server');
      }
    } catch (err: any) {
      console.error('Error in clearing server chat logs:', err);
      // Soft feedback instead of breaking the flow
      setErrorMsg(lang === 'az' ? 'Söhbət tarixçəsi serverdə silinə bilmədi.' : 'Server failed to delete chat history completely.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleAddSuggestedTask = async (task: { title: string; description: string; date: string }, key: string) => {
    try {
      await addTask(task.title, task.description, task.date);
      setAddedTasks(prev => ({ ...prev, [key]: true }));
    } catch (err) {
      console.error('Failed to add suggested task:', err);
    }
  };

  const renderMarkdown = (md: string) => {
    if (!md) return null;
    
    const lines = md.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      
      const lowerTrimmed = trimmed.toLowerCase();
      if (lowerTrimmed.startsWith('**steps / plan**:') || lowerTrimmed.startsWith('**addımlar / plan**:')) {
        return (
          <div key={idx} className="mt-4 mb-2 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-855 pb-1">
            <span className="w-1.5 h-3.5 bg-blue-500 rounded-full" />
            <h4 className="text-xs font-black text-slate-900 dark:text-zinc-300 uppercase tracking-wider">
              {lang === 'az' ? 'Addımlar / Plan' : 'Steps / Plan'}
            </h4>
          </div>
        );
      }
      if (lowerTrimmed.startsWith('**today task**:') || lowerTrimmed.startsWith('**bugünkü tapşırıq**:')) {
        return (
          <div key={idx} className="mt-4 mb-2 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-855 pb-1">
            <span className="w-1.5 h-3.5 bg-emerald-500 rounded-full" />
            <h4 className="text-xs font-black text-slate-900 dark:text-zinc-300 uppercase tracking-wider">
              {lang === 'az' ? 'Bugünkü Tapşırıq' : 'Today Task'}
            </h4>
          </div>
        );
      }
      if (lowerTrimmed.startsWith('**recommendation**:') || lowerTrimmed.startsWith('**tövsiyə**:')) {
        return (
          <div key={idx} className="mt-4 mb-2 flex items-center gap-2 border-b border-slate-100 dark:border-zinc-855 pb-1">
            <span className="w-1.5 h-3.5 bg-amber-500 rounded-full" />
            <h4 className="text-xs font-black text-slate-900 dark:text-zinc-300 uppercase tracking-wider">
              {lang === 'az' ? 'Tövsiyə' : 'Recommendation'}
            </h4>
          </div>
        );
      }

      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-extrabold text-slate-900 dark:text-zinc-200 mt-4 mb-1.5 flex items-center gap-1.5">{trimmed.replace('### ', '')}</h4>;
      }
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="text-base font-extrabold text-slate-900 dark:text-zinc-100 mt-5 mb-1.5">{trimmed.replace('## ', '')}</h3>;
      }
      if (trimmed.startsWith('# ')) {
        return <h2 key={idx} className="text-lg font-black text-slate-900 dark:text-zinc-50 mt-6 mb-2">{trimmed.replace('# ', '')}</h2>;
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        const boldMatch = content.match(/^\*\*(.*?)\*\*:(.*)/);
        if (boldMatch) {
          return (
            <li key={idx} className="ml-4 list-disc text-xs md:text-sm text-slate-700 dark:text-zinc-350 mb-1 leading-relaxed">
              <strong className="text-slate-900 dark:text-zinc-200 font-bold">{boldMatch[1]}:</strong>
              <span>{boldMatch[2]}</span>
            </li>
          );
        }
        return <li key={idx} className="ml-4 list-disc text-xs md:text-sm text-slate-700 dark:text-zinc-350 mb-1 leading-relaxed">{content}</li>;
      }

      if (trimmed.startsWith('> ')) {
        return <blockquote key={idx} className="border-l-4 border-slate-400 dark:border-zinc-650 pl-3.5 py-1 my-2 italic text-xs md:text-sm text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900/40 rounded-r-xl">{trimmed.replace('> ', '')}</blockquote>;
      }

      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-slate-900 dark:text-zinc-100 font-extrabold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return <p key={idx} className="text-xs md:text-sm text-slate-700 dark:text-zinc-300 mb-1.5 leading-relaxed">{parts}</p>;
    });
  };

  const renderStructuredAIResponse = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (typeof data === 'object' && data !== null) {
        const { title, planSteps, todayTask, recommendation } = data;
        return (
          <div className="space-y-4">
            {/* Title */}
            {title && (
              <h3 className="text-sm md:text-base font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2 border-b border-slate-100 dark:border-zinc-850/60 pb-2">
                <Sparkles className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0 animate-pulse" />
                <span>{title}</span>
              </h3>
            )}

            {/* Plan / Steps */}
            {planSteps && Array.isArray(planSteps) && planSteps.length > 0 && (
              <div className="space-y-3 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 p-4 rounded-xl">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-500 rounded-full" />
                  {lang === 'az' ? 'Plan və Addımlar' : 'Plan / Steps'}
                </h4>
                <ul className="space-y-2.5">
                  {planSteps.map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs md:text-sm text-slate-700 dark:text-zinc-300">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-150 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Today Task */}
            {todayTask && (
              <div className="space-y-2 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/20 p-4 rounded-xl">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-full" />
                  {lang === 'az' ? 'Bugünkü Tapşırıq' : 'Today Task'}
                </h4>
                <p className="text-xs md:text-sm text-slate-800 dark:text-zinc-250 font-semibold leading-relaxed">
                  {todayTask}
                </p>
              </div>
            )}

            {/* Short Recommendation */}
            {recommendation && (
              <div className="space-y-2 bg-amber-50/10 dark:bg-amber-950/5 border border-amber-100/30 dark:border-amber-900/10 p-4 rounded-xl">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-amber-500 rounded-full" />
                  {lang === 'az' ? 'Qısa Tövsiyə' : 'Short Recommendation'}
                </h4>
                <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed italic">
                  {recommendation}
                </p>
              </div>
            )}
          </div>
        );
      }
    } catch {
      // fallback to markdown parsing
    }

    return renderMarkdown(text);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 overflow-hidden transition-colors duration-250 relative">
      
      {/* ChatGPT Style Premium Header */}
      <div className="px-6 py-4 bg-white dark:bg-zinc-950 border-b border-slate-150 dark:border-zinc-900 flex items-center justify-between flex-shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-zinc-900 text-white flex items-center justify-center shadow-xs border border-slate-200 dark:border-zinc-800">
            <Sparkles className="w-5 h-5 text-indigo-400 dark:text-indigo-300" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Mentor AI</span>
              <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-black uppercase tracking-wider">Premium</span>
            </h2>
            
            {/* Status Indicator: Online / Thinking / Idle */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                isLoading 
                  ? 'bg-amber-500 animate-pulse' 
                  : (messages.length === 0 ? 'bg-slate-400 dark:bg-zinc-600' : 'bg-emerald-500')
              }`} />
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                {isLoading 
                  ? (lang === 'az' ? 'Düşünür...' : 'Thinking...') 
                  : (messages.length === 0 
                      ? (lang === 'az' ? 'Gözləmədə' : 'Idle') 
                      : (lang === 'az' ? 'Onlayn' : 'Online'))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 bg-slate-50/10 dark:bg-zinc-955/20 scrollbar-none"
      >
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-10 space-y-6"
            >
              <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center border border-slate-150 dark:border-zinc-850 shadow-3xs">
                <MessageSquare className="w-6 h-6 text-slate-800 dark:text-zinc-200 animate-pulse" />
              </div>
              <div className="space-y-2 px-4">
                <h3 className="font-extrabold text-slate-900 dark:text-zinc-100 text-base md:text-lg tracking-tight">
                  {lang === 'az' ? 'Mentor AI ilə Başlayın' : 'Start with Mentor AI'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium max-w-sm mx-auto">
                  {lang === 'az' 
                    ? `Salam ${user?.name || 'İstifadəçi'}! Mən sizin premium inkişaf mentorunuzam. Tapşırıqlarınızı analiz edərək sizə fərdi məhsuldarlıq və inkişaf planları tərtib edə bilərəm.` 
                    : `Hello ${user?.name || 'User'}! I am your premium productivity mentor. Together, we can analyze your habits, design clear plans, and schedule actionable daily tasks.`}
                </p>
              </div>

              {/* Quick Starters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full px-4 pt-2 text-left max-w-lg mx-auto">
                {QUICK_STARTERS[lang].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(item.query)}
                    className="p-3.5 bg-white dark:bg-zinc-900 hover:bg-slate-50/50 dark:hover:bg-zinc-850/60 border border-slate-150 dark:border-zinc-850 rounded-2xl text-left transition duration-150 cursor-pointer group flex items-start gap-3 shadow-3xs hover:shadow-2xs"
                  >
                    <Zap className="w-4 h-4 text-indigo-500 mt-0.5 group-hover:scale-110 transition-transform shrink-0" />
                    <div>
                      <div className="text-[11px] font-bold text-slate-900 dark:text-zinc-150 leading-normal">{item.label}</div>
                      <div className="text-[9px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider mt-0.5">{lang === 'az' ? 'Məsləhət al' : 'Get advice'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Cards Stream */}
        <div className="space-y-6 max-w-3xl md:max-w-4xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`flex gap-3.5 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* User bubble on right, AI bubble on left */}
                  <div className={`flex gap-3.5 max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {/* Visual Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs select-none shadow-3xs border ${
                      isUser 
                        ? 'bg-blue-600 dark:bg-blue-600 text-white border-blue-500' 
                        : 'bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 border-zinc-700'
                    }`}>
                      {isUser ? <User className="w-3.5 h-3.5" /> : 'AI'}
                    </div>

                    {/* Bubble Content */}
                    <div className={`space-y-2 flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      <div className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed transition-all shadow-3xs ${
                        isUser 
                          ? 'bg-blue-600 dark:bg-blue-600 text-white rounded-tr-none text-left' 
                          : 'bg-zinc-100/85 dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 border border-slate-200/50 dark:border-zinc-850/60 rounded-tl-none text-left'
                      }`}>
                        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                          {isUser ? renderMarkdown(msg.text) : renderStructuredAIResponse(msg.text)}
                        </div>
                      </div>
                      
                      {/* Timestamp (Optional but elegant) */}
                      <div className={`text-[9px] font-bold uppercase tracking-wider select-none px-1 ${
                        isUser ? 'text-blue-400 dark:text-blue-300 text-right' : 'text-slate-400 dark:text-zinc-500 text-left'
                      }`}>
                        {formatTime(msg.createdAt)}
                      </div>

                      {/* Inline Suggested Tasks for AI Mentor */}
                      {!isUser && msg.suggestedTasks && msg.suggestedTasks.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850/75 rounded-2xl p-4 mt-3 space-y-3 shadow-3xs animate-slide-up text-left">
                          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-zinc-850 pb-2">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            <span className="text-[10px] font-bold text-slate-900 dark:text-zinc-200 uppercase tracking-wider">
                              {lang === 'az' ? 'Məsləhət Görülən Tapşırıqlar' : 'Suggested Tasks'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {msg.suggestedTasks.map((task, idx) => {
                              const taskKey = `${msg.id}_${idx}`;
                              const isAdded = addedTasks[taskKey];
                              return (
                                <div
                                  key={idx}
                                  className="bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-850/60 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors duration-150 hover:bg-slate-50/80 dark:hover:bg-zinc-900/60"
                                >
                                  <div className="space-y-1 pr-2">
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-zinc-200 leading-tight">{task.title}</h5>
                                    <p className="text-[10px] text-slate-500 dark:text-zinc-450 font-medium leading-relaxed">{task.description}</p>
                                    <span className="inline-block text-[8px] font-extrabold uppercase tracking-widest text-indigo-500 dark:text-indigo-455 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 px-1.5 py-0.5 rounded mt-1">
                                      {task.date === '2026-07-01' ? (lang === 'az' ? 'Bugün' : 'Today') : task.date}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleAddSuggestedTask(task, taskKey)}
                                    disabled={isAdded}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 border ${
                                      isAdded 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 disabled:opacity-90' 
                                        : 'bg-slate-900 hover:bg-slate-850 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-black border-slate-800 dark:border-zinc-200 shadow-3xs'
                                    }`}
                                  >
                                    {isAdded ? (
                                      <>
                                        <Check className="w-2.5 h-2.5 stroke-[3px]" />
                                        <span>{lang === 'az' ? 'Əlavə edildi' : 'Added'}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-2.5 h-2.5 stroke-[3px]" />
                                        <span>{lang === 'az' ? 'Əlavə et' : 'Add'}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator bubble */}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3.5 mr-auto justify-start w-full"
            >
              <div className="flex gap-3.5 max-w-[75%]">
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 flex items-center justify-center font-bold text-xs select-none shadow-3xs border border-zinc-700">
                  AI
                </div>
                <div className="bg-zinc-100/80 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-850/60 p-4 rounded-2xl rounded-tl-none text-xs flex flex-col gap-1.5 min-w-[120px] shadow-3xs">
                  <div className="flex space-x-1.5 py-1">
                    <div className="w-2 h-2 bg-slate-400 dark:bg-zinc-650 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 dark:bg-zinc-650 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 dark:bg-zinc-650 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-widest">{lang === 'az' ? 'Düşünür...' : 'AI is thinking...'}</span>
                </div>
              </div>
            </motion.div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 text-xs text-rose-700 dark:text-rose-450 rounded-xl flex items-start gap-2 max-w-md mx-auto animate-slide-up shadow-3xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* ChatGPT style bottom fixed Input Form Area */}
      <div className="p-4 bg-white dark:bg-zinc-950 border-t border-slate-150 dark:border-zinc-900 flex-shrink-0 transition-colors">
        <div className="max-w-3xl md:max-w-4xl mx-auto flex items-center gap-3">
          
          {/* Trash Button - Clear Chat History */}
          {messages.length > 0 && (
            <button
              id="clear-chat-history-btn"
              type="button"
              disabled={isClearing}
              onClick={() => setShowClearConfirm(true)}
              className="flex-shrink-0 p-3 bg-slate-50 hover:bg-rose-50 dark:bg-zinc-900 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 dark:text-zinc-450 dark:hover:text-rose-400 border border-slate-200 dark:border-zinc-850 rounded-2xl transition duration-150 cursor-pointer shadow-3xs disabled:opacity-50"
              title={lang === 'az' ? 'Söhbəti təmizlə' : 'Clear Chat'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex-1 relative flex items-center"
          >
            <input
              id="ai-mentor-chat-input"
              type="text"
              required
              disabled={isLoading}
              placeholder={lang === 'az' ? 'Məsələn, "React öyrənmək istəyirəm"...' : 'Type e.g., "I want to learn React"...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full pl-4 pr-12 py-3.5 text-xs md:text-sm border border-slate-200 dark:border-zinc-850 bg-slate-50/50 dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 rounded-2xl focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-zinc-650 transition-all disabled:opacity-60 shadow-inner"
            />
            <button
              id="ai-mentor-send-btn"
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 p-2 bg-slate-900 hover:bg-slate-850 dark:bg-zinc-100 dark:hover:bg-zinc-250 disabled:bg-slate-100/50 dark:disabled:bg-zinc-850 text-white dark:text-black disabled:text-slate-400 dark:disabled:text-zinc-600 rounded-xl transition cursor-pointer flex-shrink-0 flex items-center justify-center disabled:opacity-50 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Non-Blocking Premium Confirm Modal Overlay */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-xl border border-slate-150 dark:border-zinc-800"
            >
              <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 mb-2">
                {lang === 'az' ? 'Söhbəti təmizlə?' : 'Clear conversation?'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 leading-relaxed font-medium">
                {lang === 'az'
                  ? 'Söhbətin bütün tarixçəsi tamamilə silinəcək və sıfırlanacaq. Bu əməliyyat geri qaytarıla bilməz.'
                  : 'This will permanently delete your entire conversation history. This action cannot be undone.'}
              </p>
              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850 rounded-xl transition cursor-pointer"
                >
                  {lang === 'az' ? 'Ləğv et' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowClearConfirm(false);
                    executeClearChat();
                  }}
                  className="px-4 py-2 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer shadow-sm"
                >
                  {lang === 'az' ? 'Təmizlə' : 'Clear Chat'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
