import React from 'react';
import { User as UserIcon, Lock, Mail, ShieldAlert, Camera, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../context/useAppStore';
import { translations } from '../translations';

const PRESET_AVATARS = ['🎯', '🚀', '🦊', '🐼', '🦁', '🦉', '🐱', '🦄', '🐳', '🌟', '💻', '🧘'];

export default function ProfileView() {
  const { user, tasks, lang, updateProfile, deleteAccount } = useAppStore();
  const t = translations[lang];

  if (!user) {
    return null;
  }

  const [name, setName] = React.useState(user.name);
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [selectedAvatar, setSelectedAvatar] = React.useState(user.profileImage || '');

  const [showDeleteZone, setShowDeleteZone] = React.useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState({ text: '', type: 'success' });

  const calculateCompletion = () => {
    let score = 0;
    const checklist = {
      name: name.trim().length >= 2,
      avatar: !!selectedAvatar,
      tasks: tasks.length > 0,
      securePass: password.length >= 4 || user.id !== '',
    };

    if (checklist.name) score += 25;
    if (checklist.avatar) score += 25;
    if (checklist.tasks) score += 25;
    if (checklist.securePass) score += 25;

    return { score, checklist };
  };

  const { score, checklist } = calculateCompletion();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({
        text: lang === 'az' ? 'Şəkil ölçüsü çox böyükdür (Max 2MB)' : 'Image size is too large (Max 2MB)',
        type: 'error',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setSelectedAvatar(base64String);
      setMessage({ text: '', type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: 'success' });

    if (name.trim().length < 2) {
      setMessage({
        text: lang === 'az' ? 'İstifadəçi adı ən azı 2 simvol olmalıdır' : 'Username must be at least 2 characters',
        type: 'error',
      });
      return;
    }

    if (password && password !== confirmPassword) {
      setMessage({
        text: lang === 'az' ? 'Şifrələr eyni deyil!' : 'Passwords do not match!',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile(name.trim(), password || undefined, selectedAvatar || undefined);
      setMessage({ text: t.nameUpdated, type: 'success' });
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ text: err.message || t.errorUpdating, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteText) return;
    if (user.id === 'admin-id-123') {
      alert(t.cannotDeleteMainAdmin);
      return;
    }

    if (confirm(lang === 'az' ? 'Hesabınızı tamamilə silmək istədiyinizə əminsiniz?' : 'Are you sure you want to permanently delete your account?')) {
      try {
        await deleteAccount();
      } catch (err: any) {
        alert(err.message || 'Error deleting account');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - profile completion stats */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-6 transition-colors">
          <div className="text-center p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <h3 className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wide mb-3">{t.profileCompletion}</h3>
            
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center mb-3">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  className="stroke-slate-200 dark:stroke-zinc-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  className="stroke-black dark:stroke-white transition-all duration-500"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={301.6}
                  strokeDashoffset={301.6 - (301.6 * score) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xl font-extrabold text-slate-900 dark:text-zinc-100">{score}%</span>
            </div>

            <div className="space-y-1.5 text-left text-xs text-zinc-650 dark:text-zinc-400 max-w-[190px] mx-auto mt-4 font-semibold">
              <div className="flex items-center gap-2">
                {checklist.name ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 block" />}
                <span className={checklist.name ? 'line-through opacity-60' : ''}>{lang === 'az' ? 'Ad daxil edilib' : 'Name entered'}</span>
              </div>
              <div className="flex items-center gap-2">
                {checklist.avatar ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 block" />}
                <span className={checklist.avatar ? 'line-through opacity-60' : ''}>{lang === 'az' ? 'Profil şəkli seçilib' : 'Avatar selected'}</span>
              </div>
              <div className="flex items-center gap-2">
                {checklist.tasks ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700 block" />}
                <span className={checklist.tasks ? 'line-through opacity-60' : ''}>{lang === 'az' ? 'Tapşırıq yaradılıb' : 'Task created'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide">{t.changeAvatar}</h4>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-zinc-900 flex items-center justify-center text-3xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-inner">
                {selectedAvatar.startsWith('data:image') ? (
                  <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover animate-fade-in" />
                ) : selectedAvatar ? (
                  <span className="animate-fade-in">{selectedAvatar}</span>
                ) : (
                  <UserIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <label className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 transition cursor-pointer">
                <Camera className="w-4 h-4" />
                <span>{lang === 'az' ? 'Şəkil Yüklə' : 'Upload Image'}</span>
                <input
                  id="avatar-image-uploader"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-6 gap-2 pt-2">
              {PRESET_AVATARS.map((emoji) => (
                <button
                  id={`preset-avatar-${emoji}`}
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`p-2 rounded-xl text-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer border ${
                    selectedAvatar === emoji
                      ? 'border-black bg-slate-100 dark:border-white dark:bg-zinc-800'
                      : 'border-transparent'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-6 transition-colors">
          <div className="border-b border-zinc-100 dark:border-zinc-850 pb-3">
            <h3 className="font-bold text-base text-zinc-850 dark:text-zinc-50 uppercase tracking-wider">{t.profileTitle}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{lang === 'az' ? 'Şəxsi məlumatları və şifrinizi yeniləyin' : 'Manage your personal information and password'}</p>
          </div>

          {message.text && (
            <div className={`p-3.5 border rounded-xl text-xs flex items-center gap-2.5 ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-950/10 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400'
            }`}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide mb-1.5">{t.username}</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="profile-username-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-855 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="profile-email-dummy"
                    type="email"
                    disabled
                    value="nemansocial@gmail.com"
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-650 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-900/60 my-2" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide mb-1.5">{lang === 'az' ? 'Yeni Şifrə' : 'New Password'}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="profile-password-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-855 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide mb-1.5">{lang === 'az' ? 'Şifrənin təsdiqi' : 'Confirm Password'}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="profile-password-confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-zinc-855 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>
            </div>

            <button
              id="save-profile-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-black dark:bg-white hover:bg-slate-850 disabled:bg-slate-200 text-white dark:text-black font-semibold rounded-lg text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 font-bold"
            >
              {isSubmitting ? t.loadingFeedback : t.saveProfile}
            </button>
          </form>

          {/* Account deletion */}
          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900/60">
            <button
              id="toggle-danger-zone-btn"
              type="button"
              onClick={() => setShowDeleteZone(!showDeleteZone)}
              className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>{t.deleteAccount}</span>
            </button>

            {showDeleteZone && (
              <div className="mt-4 p-4 bg-red-50/50 dark:bg-red-950/10 border border-red-150 dark:border-red-900/30 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-red-900 dark:text-red-400">{t.deleteAccountWarning}</h4>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-1 leading-relaxed">
                      {lang === 'az' 
                        ? 'Hesabınızın silinməsi dərhal icra ediləcək və bütün tapşırıq planlarınız silinəcəkdir.' 
                        : 'Your data, annual planning analytics, and task tracking records will be permanently erased.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-red-800 dark:text-red-350">
                  <input
                    id="confirm-delete-checkbox"
                    type="checkbox"
                    checked={confirmDeleteText}
                    onChange={(e) => setConfirmDeleteText(e.target.checked)}
                    className="w-4 h-4 border-red-300 dark:border-red-800 rounded focus:ring-red-500"
                  />
                  <label htmlFor="confirm-delete-checkbox" className="cursor-pointer font-bold">
                    {t.confirmDelete}
                  </label>
                </div>

                <button
                  id="final-delete-account-btn"
                  onClick={handleDelete}
                  disabled={!confirmDeleteText}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-300/80 dark:disabled:bg-zinc-800 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  {lang === 'az' ? 'Bəli, Hesabımı Sil' : 'Yes, Delete My Account'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
