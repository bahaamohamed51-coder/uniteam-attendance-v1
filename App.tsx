
import React, { useState, useEffect, useCallback } from 'react';
import { User, Branch, AttendanceRecord, AppConfig, Job } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import { LogOut, ShieldCheck, User as UserIcon, Cloud, CloudOff, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('attendance_config');
    return saved ? JSON.parse(saved) : { 
      googleSheetLink: '',
      syncUrl: '',
      adminUsername: 'admin',
      adminPassword: 'B522129'
    };
  });

  // دالة مزامنة البيانات من السحابة
  const syncWithCloud = useCallback(async (url: string) => {
    if (!url || !url.startsWith('http')) return;
    setIsSyncing(true);
    setSyncError(false);
    try {
      const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getData&t=${Date.now()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('فشل الاتصال بالسيرفر');
      const data = await response.json();
      
      if (data.branches && Array.isArray(data.branches)) {
        setBranches(data.branches);
        localStorage.setItem('attendance_branches', JSON.stringify(data.branches));
      }
      if (data.jobs && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        localStorage.setItem('attendance_jobs', JSON.stringify(data.jobs));
      }
      
      const updatedConfig = { 
        ...config, 
        lastUpdated: new Date().toISOString(), 
        syncUrl: url, 
        googleSheetLink: url 
      };
      setConfig(updatedConfig);
      localStorage.setItem('attendance_config', JSON.stringify(updatedConfig));
    } catch (err) {
      console.error("Cloud sync failed", err);
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [config]);

  // فحص الرابط (Deep Linking) عند التشغيل
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cloudUrlEncoded = params.get('c');
    if (cloudUrlEncoded) {
      try {
        const decodedUrl = atob(cloudUrlEncoded);
        if (decodedUrl.startsWith('http')) {
          syncWithCloud(decodedUrl);
          // تنظيف الرابط من المتصفح
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error("رابط الربط غير صالح");
      }
    } else if (config.syncUrl) {
      syncWithCloud(config.syncUrl);
    }
  }, [syncWithCloud]);

  // تحميل البيانات المحلية
  useEffect(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    const savedBranches = localStorage.getItem('attendance_branches');
    const savedJobs = localStorage.getItem('attendance_jobs');
    const savedRecords = localStorage.getItem('attendance_records');
    const savedAllUsers = localStorage.getItem('attendance_all_users');

    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedBranches) setBranches(JSON.parse(savedBranches));
    if (savedJobs) setJobs(JSON.parse(savedJobs));
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedAllUsers) setAllUsers(JSON.parse(savedAllUsers));
  }, []);

  // حفظ التغييرات محلياً
  useEffect(() => { localStorage.setItem('attendance_branches', JSON.stringify(branches)); }, [branches]);
  useEffect(() => { localStorage.setItem('attendance_jobs', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('attendance_records', JSON.stringify(records)); }, [records]);
  useEffect(() => { localStorage.setItem('attendance_all_users', JSON.stringify(allUsers)); }, [allUsers]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('attendance_current_user', JSON.stringify(user));
    if (user.role === 'employee' && !allUsers.find(u => u.nationalId === user.nationalId)) {
      setAllUsers(prev => [...prev, user]);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('attendance_current_user');
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 transition-all">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
              {currentUser?.role === 'admin' ? <ShieldCheck size={24} /> : <UserIcon size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-gray-800 text-lg leading-tight uppercase tracking-tighter">Uniteam</h1>
                <div className="flex items-center">
                  {isSyncing ? (
                    <RefreshCw size={14} className="text-blue-500 animate-spin" />
                  ) : syncError ? (
                    <CloudOff size={14} className="text-red-500" />
                  ) : config.syncUrl ? (
                    <Cloud size={14} className="text-green-500" />
                  ) : null}
                </div>
              </div>
              {currentUser && <p className="text-[10px] text-gray-500 font-black">{currentUser.fullName}</p>}
            </div>
          </div>
          {currentUser && (
            <button onClick={handleLogout} className="px-4 py-2 text-xs font-black text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all">
              خروج
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 pb-24">
        {!currentUser ? (
          <Login 
            onLogin={handleLogin} 
            allUsers={allUsers} 
            adminConfig={config} 
            availableJobs={jobs}
            setAdminConfig={(newCfg) => {
              const cfg = { ...config, ...newCfg };
              setConfig(cfg);
              localStorage.setItem('attendance_config', JSON.stringify(cfg));
              if (cfg.syncUrl) syncWithCloud(cfg.syncUrl);
            }}
          />
        ) : (
          currentUser.role === 'admin' ? (
            <AdminDashboard 
              branches={branches} setBranches={setBranches}
              jobs={jobs} setJobs={setJobs}
              records={records} config={config} setConfig={setConfig}
              allUsers={allUsers} setAllUsers={setAllUsers}
            />
          ) : (
            <UserDashboard 
              user={currentUser} 
              branches={branches} 
              records={records} 
              setRecords={setRecords}
              googleSheetLink={config.googleSheetLink}
              onRefresh={() => { if (config.syncUrl) syncWithCloud(config.syncUrl); }}
              isSyncing={isSyncing}
              lastUpdated={config.lastUpdated}
            />
          )
        )}
      </main>
      <footer className="py-4 text-center text-gray-400 text-[10px] font-bold border-t bg-white/50">
        Uniteam &copy; {new Date().getFullYear()} {config.lastUpdated && `| آخر مزامنة: ${new Date(config.lastUpdated).toLocaleTimeString('ar-EG')}`}
      </footer>
    </div>
  );
};

export default App;
