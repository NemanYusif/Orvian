import React from 'react';
import { ShieldAlert, Users, CheckSquare, BarChart3, Search, Ban, Trash2, Eye, User as UserIcon, X, Lock } from 'lucide-react';
import { useAppStore } from '../context/useAppStore';
import { translations } from '../translations';
import { AdminUserSummary, GlobalAnalytics, Task } from '../types';

export default function AdminView() {
  const { token, lang, user: currentUser } = useAppStore();
  const t = translations[lang];

  // State
  const [users, setUsers] = React.useState<AdminUserSummary[]>([]);
  const [globalStats, setGlobalStats] = React.useState<GlobalAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState('');

  // Detailed user inspection state
  const [inspectedUserId, setInspectedUserId] = React.useState<string | null>(null);
  const [inspectedUserData, setInspectedUserData] = React.useState<{
    user: any;
    tasks: Task[];
    stats: any;
  } | null>(null);
  const [isInspectingLoading, setIsInspectingLoading] = React.useState(false);

  // Load Admin Data (Users + Global Stats)
  const loadAdminData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const uRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!uRes.ok) throw new Error(lang === 'az' ? 'Admin məlumatları yüklənmədi' : 'Failed to fetch admin users');
      const uData = await uRes.json();
      setUsers(uData);

      const aRes = await fetch('/api/admin/analytics', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!aRes.ok) throw new Error(lang === 'az' ? 'Qlobal analitika yüklənmədi' : 'Failed to fetch global stats');
      const aData = await aRes.json();
      setGlobalStats(aData);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error loading admin resources.');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token]);

  // Block/Unblock User
  const handleToggleBlock = async (userId: string, currentBlockedState: boolean) => {
    if (userId === 'admin-id-123' || userId === 'superadmin-id-789') {
      alert(t.cannotBlockMainAdmin || (lang === 'az' ? 'Siz ana idarəçi hesablarını blok edə bilməzsiniz!' : 'You cannot block main admin accounts!'));
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isBlocked: !currentBlockedState }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update user status');
      }

      await loadAdminData();
      
      if (inspectedUserId === userId) {
        handleInspectUser(userId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string) => {
    if (userId === 'admin-id-123' || userId === 'superadmin-id-789') {
      alert(t.cannotDeleteMainAdmin || (lang === 'az' ? 'Siz ana idarəçi hesabını silə bilməzsiniz!' : 'You cannot delete main admin accounts!'));
      return;
    }

    const confirmMsg = lang === 'az' 
      ? 'Bu istifadəçini və ona məxsus bütün tapşırıqları tamamilə silmək istədiyinizə əminsiniz? Bu əməliyyat geri qaytarıla bilməz.'
      : 'Are you sure you want to permanently delete this user and all their tasks? This action is irreversible.';

    if (confirm(confirmMsg)) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to delete user');
        }

        if (inspectedUserId === userId) {
          setInspectedUserId(null);
          setInspectedUserData(null);
        }

        await loadAdminData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Inspect User details
  const handleInspectUser = async (userId: string) => {
    setInspectedUserId(userId);
    setIsInspectingLoading(true);
    setInspectedUserData(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch user inspection data');
      const data = await response.json();
      setInspectedUserData(data);
    } catch (err: any) {
      console.error(err);
      alert('Error fetching user inspection details');
    } finally {
      setIsInspectingLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Global Analytics cards */}
      {globalStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 transition-colors">
            <div className="p-3 bg-slate-50 dark:bg-zinc-900 text-slate-850 dark:text-zinc-305 border border-slate-100 dark:border-zinc-800 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">{t.totalUsersCount}</span>
              <span className="text-xl font-black text-slate-900 dark:text-zinc-100">{globalStats.totalUsers}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 transition-colors">
            <div className="p-3 bg-slate-50 dark:bg-zinc-900 text-slate-850 dark:text-zinc-305 border border-slate-100 dark:border-zinc-800 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">{t.activeUsersCount}</span>
              <span className="text-xl font-black text-slate-900 dark:text-zinc-100">{globalStats.activeUsers}</span>
            </div>
          </div>

          {globalStats.scope === 'full' ? (
            <>
              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 transition-colors">
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 text-slate-850 dark:text-zinc-305 border border-slate-100 dark:border-zinc-800 rounded-xl">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">{lang === 'az' ? 'Sistem üzrə Ümumi Task' : 'Total System Tasks'}</span>
                  <span className="text-xl font-black text-slate-900 dark:text-zinc-100">{globalStats.totalTasks}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3 transition-colors">
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 text-slate-850 dark:text-zinc-355 border border-slate-100 dark:border-zinc-800 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-bold tracking-wider block">{t.systemCompletionRate}</span>
                  <span className="text-xl font-black text-slate-900 dark:text-zinc-100">{globalStats.completionRate}%</span>
                </div>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 bg-slate-50 dark:bg-zinc-900/35 border border-slate-150 dark:border-zinc-850/70 rounded-2xl p-4 flex items-center justify-between gap-3 transition-colors">
              <div>
                <span className="text-[9px] text-indigo-500 dark:text-indigo-400 uppercase font-extrabold tracking-widest block flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {lang === 'az' ? 'Məhdudlaşdırılmış Analitika (Admin)' : 'Restricted Analytics (Admin)'}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                  {lang === 'az' 
                    ? 'Təhlükəsizlik səbəbi ilə bütün istifadəçilərin ümumi task statistika analitikası yalnız Superadmin tərəfindən izlənilə bilər.' 
                    : 'For security compliance, consolidated task-level analytics are restricted to Superadmin roles.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Directory + Inspection details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Directory section */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-zinc-150 dark:border-zinc-850 gap-4 mb-4">
            <div>
              <h3 className="font-extrabold text-zinc-855 dark:text-zinc-50 text-sm uppercase tracking-wider">{t.usersList}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{lang === 'az' ? 'Sistem istifadəçilərini izləyin və tənzimləyin' : 'Monitor and manage system users'}</p>
            </div>

            {/* User Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                id="admin-search-user"
                type="text"
                placeholder={t.searchUser}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 text-xs border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-855 dark:text-zinc-155 rounded-lg focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-xs text-zinc-400 font-bold">{t.loadingFeedback}</div>
          ) : errorMsg ? (
            <div className="text-center py-12 text-xs text-red-500 font-bold">{errorMsg}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-400 font-bold">{lang === 'az' ? 'İstifadəçi tapılmadı' : 'No users found'}</div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredUsers.map((user) => {
                const isSelected = inspectedUserId === user.id;
                return (
                  <div
                    id={`admin-user-card-${user.id}`}
                    key={user.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-150 ${
                      isSelected 
                        ? 'border-black bg-slate-50 dark:border-white dark:bg-zinc-900'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-350 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-xl overflow-hidden">
                        {user.profileImage ? (
                          user.profileImage.startsWith('data:image') ? (
                            <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{user.profileImage}</span>
                          )
                        ) : (
                          <UserIcon className="w-5 h-5 text-slate-450" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-zinc-855 dark:text-zinc-100 truncate">{user.name}</h4>
                          {user.isBlocked && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-red-100 dark:bg-red-955/40 text-red-700 dark:text-red-400 font-extrabold rounded">
                              BLOCKED
                            </span>
                          )}
                          {user.role === 'superadmin' && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold rounded border border-indigo-200 dark:border-indigo-900/30">
                              SUPERADMIN
                            </span>
                          )}
                          {user.role === 'admin' && (
                            <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-200 font-extrabold rounded border border-slate-200 dark:border-zinc-700">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {t.userSince}: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto justify-end">
                      <div className="w-full sm:w-28 text-left sm:text-right">
                        <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 block">
                          Ratio: <strong className="text-zinc-755 dark:text-zinc-300">{user.stats.ratio}%</strong> ({user.stats.completed}/{user.stats.total})
                        </span>
                        <div className="h-1 bg-slate-100 dark:bg-zinc-855 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-black dark:bg-white" style={{ width: `${user.stats.ratio}%` }} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          id={`admin-inspect-user-${user.id}`}
                          onClick={() => handleInspectUser(user.id)}
                          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-lg transition cursor-pointer"
                          title={t.inspectionTitle}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          id={`admin-block-user-${user.id}`}
                          onClick={() => handleToggleBlock(user.id, user.isBlocked)}
                          disabled={user.id === 'admin-id-123' || user.id === 'superadmin-id-789' || (user.role === 'superadmin' && currentUser?.role !== 'superadmin')}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            user.isBlocked
                              ? 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                              : 'hover:bg-red-50 dark:hover:bg-red-955/20 text-zinc-400 hover:text-red-500'
                          } disabled:opacity-30`}
                          title={user.isBlocked ? t.unblockUser : t.blockUser}
                        >
                          <Ban className="w-4 h-4" />
                        </button>

                        <button
                          id={`admin-delete-user-${user.id}`}
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === 'admin-id-123' || user.id === 'superadmin-id-789' || (user.role === 'superadmin' && currentUser?.role !== 'superadmin')}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-955/20 text-zinc-400 hover:text-red-650 rounded-lg transition disabled:opacity-30 cursor-pointer"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User inspection side panel */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-3 mb-4">
              <h3 className="font-extrabold text-sm text-zinc-855 dark:text-zinc-50 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-indigo-500" />
                {t.inspectionTitle}
              </h3>
              {inspectedUserId && (
                <button
                  id="close-inspection-btn"
                  onClick={() => {
                    setInspectedUserId(null);
                    setInspectedUserData(null);
                  }}
                  className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isInspectingLoading ? (
              <div className="text-center py-16 text-xs text-zinc-400">{t.loadingFeedback}</div>
            ) : !inspectedUserData ? (
              <div className="text-center py-16 border border-dashed border-zinc-200 dark:border-zinc-900 rounded-xl">
                <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-2 animate-pulse-slow" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed font-semibold">
                  {lang === 'az' ? 'Təhlil etmək üçün bir istifadəçiyə klikləyin.' : 'Select a user to inspect detail analysis.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-150 dark:border-zinc-855 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
                      {inspectedUserData.user.profileImage ? (
                        inspectedUserData.user.profileImage.startsWith('data:image') ? (
                          <img src={inspectedUserData.user.profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{inspectedUserData.user.profileImage}</span>
                        )
                      ) : (
                        <UserIcon className="w-5 h-5 text-slate-800 dark:text-zinc-200" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-855 dark:text-zinc-50">{inspectedUserData.user.name}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold rounded-md uppercase tracking-wider">
                        {inspectedUserData.user.role.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* RBAC Role Selector Dropdown */}
                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-zinc-800 space-y-1.5">
                    <label className="text-[9px] text-slate-400 dark:text-zinc-500 font-extrabold uppercase tracking-wider block">
                      {lang === 'az' ? 'Səlahiyyət Rolu:' : 'Access Role:'}
                    </label>
                    <select
                      id="admin-change-user-role-select"
                      value={inspectedUserData.user.role}
                      disabled={inspectedUserData.user.id === currentUser?.id || (inspectedUserData.user.role === 'superadmin' && currentUser?.role !== 'superadmin')}
                      onChange={async (e) => {
                        const newRole = e.target.value;
                        try {
                          const res = await fetch(`/api/admin/users/${inspectedUserData.user.id}/role`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ role: newRole })
                          });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || 'Failed to update user role');
                          }
                          alert(lang === 'az' ? 'İstifadəçi rolu uğurla dəyişdirildi!' : 'User role successfully updated!');
                          await loadAdminData();
                          await handleInspectUser(inspectedUserData.user.id);
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition"
                    >
                      <option value="user">{lang === 'az' ? 'İstifadəçi (User)' : 'User'}</option>
                      <option value="admin">{lang === 'az' ? 'İdarəçi (Admin)' : 'Admin'}</option>
                      {currentUser?.role === 'superadmin' && (
                        <option value="superadmin">{lang === 'az' ? 'Super Admin' : 'Superadmin'}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/60 dark:border-zinc-800/40">
                    <span className="text-[8px] text-zinc-400 dark:text-zinc-500 block font-bold">TOTAL</span>
                    <strong className="text-xs text-zinc-800 dark:text-zinc-200">{inspectedUserData.stats.total}</strong>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-955/10 rounded-xl border border-emerald-100/30">
                    <span className="text-[8px] text-emerald-600 dark:text-emerald-400 block font-bold">COMP</span>
                    <strong className="text-xs text-emerald-800 dark:text-emerald-400">{inspectedUserData.stats.completed}</strong>
                  </div>
                  <div className="p-2 bg-rose-50 dark:bg-rose-955/10 rounded-xl border border-rose-100/30">
                    <span className="text-[8px] text-rose-600 dark:text-rose-400 block font-bold">MISSED</span>
                    <strong className="text-xs text-rose-800 dark:text-rose-400">{inspectedUserData.stats.missed}</strong>
                  </div>
                </div>

                <h4 className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  {lang === 'az' ? 'İstifadəçi Tapşırıqları' : 'User Tasks'}
                </h4>

                {currentUser?.role !== 'superadmin' ? (
                  <div className="p-4 border border-slate-200/80 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 rounded-xl text-center space-y-1 shadow-3xs animate-fade-in">
                    <div className="text-[11px] font-black text-indigo-650 dark:text-indigo-400 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{lang === 'az' ? 'Məlumat Qorunur' : 'Data Protected'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                      {lang === 'az' 
                        ? 'Təhlükəsizlik qaydalarına əsasən, digər istifadəçilərin fərdi tapşırıq siyahılarına baxmaq yalnız Superadmin səlahiyyətindədir.' 
                        : 'Under system-wide security policies, viewing other users\' detail task data is restricted exclusively to Superadmin.'}
                    </p>
                  </div>
                ) : inspectedUserData.tasks.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center italic py-4">{lang === 'az' ? 'Tapşırıq planlaşdırılmayıb' : 'No tasks planned yet'}</p>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-thin">
                    {inspectedUserData.tasks.map((task) => {
                      let tagColor = 'bg-amber-400';
                      if (task.status === 'completed') tagColor = 'bg-emerald-500';
                      if (task.status === 'missed') tagColor = 'bg-rose-500';

                      return (
                        <div
                          key={task.id}
                          className="p-2.5 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-150 dark:border-zinc-850 rounded-xl flex items-center justify-between gap-2 text-xs animate-fade-in"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${tagColor} flex-shrink-0`} />
                              <span className="font-semibold text-zinc-855 dark:text-zinc-200 truncate">{task.title}</span>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-400 block mt-0.5">{task.date}</span>
                          </div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            task.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                              : task.status === 'missed'
                              ? 'bg-rose-100 dark:bg-rose-955 text-rose-700 dark:text-rose-400'
                              : 'bg-amber-100 dark:bg-amber-955 text-amber-700 dark:text-amber-400'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {inspectedUserData && (
            <button
              id="admin-close-inspection-bottom"
              onClick={() => {
                setInspectedUserId(null);
                setInspectedUserData(null);
              }}
              className="w-full mt-4 py-2 text-xs font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl transition cursor-pointer font-bold"
            >
              {t.closeInspection}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
