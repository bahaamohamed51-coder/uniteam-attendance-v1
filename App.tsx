
import React, { useState, useEffect, useCallback } from 'react';
import { User, Branch, AttendanceRecord, AppConfig, Job } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import { LogOut, ShieldCheck, User as UserIcon, Cloud, CloudOff, RefreshCw, Link as LinkIcon } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [config, setConfig] = useState<AppConfig>({ 
    googleSheetLink: '',
    syncUrl: '',
    adminUsername: 'admin',
    adminPassword: 'B522129'
  });

  // دالة لجلب البيانات من السحابة
  const syncWithCloud = useCallback(async (url: string) => {
    if (!url || !url.startsWith('http')) return;
    setIsSyncing(true);
    setSyncError(false);
    try {
      const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getData&t=${Date.now()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      if (data.branches && Array.isArray(data.branches)) {
        setBranches(data.branches);
        localStorage.setItem('attendance_branches', JSON.stringify(data.branches));
      }
      if (data.jobs && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        localStorage.setItem('attendance_jobs', JSON.stringify(data.jobs));
      }
      setConfig(prev => ({ ...prev, lastUpdated: new Date().toISOString() }));
    } catch (err) {
      console.error("Cloud sync failed", err);
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // فحص الرابط للإعدادات التلقائية (Deep Linking)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cloudUrl = params.get('c'); // 'c' for config/cloud url
    if (cloudUrl) {
      try {
        const decodedUrl = atob(cloudUrl);
        if (decodedUrl.startsWith('http')) {
          const newConfig = { ...config, syncUrl: decodedUrl, googleSheetLink: decodedUrl };
          setConfig(newConfig);
          localStorage.setItem('attendance_config', JSON.stringify(newConfig));
          syncWithCloud(decodedUrl);
          // تنظيف الرابط بعد السحب
          window.history.replaceState({}, document.title, window.location.pathname);
          alert("تم ربط التطبيق بنجاح بنظام الشركة");
        }
      } catch (e) {
        console.error("Invalid config in URL");
      }
    }
  }, [syncWithCloud]);

  // تحميل البيانات المحلية عند بدء التشغيل
  useEffect(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    const savedBranches = localStorage.getItem('attendance_branches');
    const savedJobs = localStorage.getItem('attendance_jobs');
    const savedRecords = localStorage.getItem('attendance_records');
    const savedConfig = localStorage.getItem('attendance_config');
    const savedAllUsers = localStorage.getItem('attendance_all_users');

    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedBranches) setBranches(JSON.parse(savedBranches));
    if (savedJobs) setJobs(JSON.parse(savedJobs));
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedAllUsers) setAllUsers(JSON.parse(savedAllUsers));
    
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig);
      // تأمين كلمة مرور الأدمن دائماً
      const updatedConfig = { ...parsedConfig, adminPassword: parsedConfig.adminPassword || 'B522129' };
      setConfig(updatedConfig);
      
      if (updatedConfig.syncUrl) {
        syncWithCloud(updatedConfig.syncUrl);
      }
    }
  }, [syncWithCloud]);

  // حفظ البيانات في LocalStorage عند تغيرها
  useEffect(() => {
    localStorage.setItem('attendance_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('attendance_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('attendance_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('attendance_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem('attendance_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('attendance_current_user', JSON.stringify(user));
    if (user.role === 'employee' && !allUsers.find(u => u.nationalId === user.nationalId)) {
      setAllUsers(prev => [...prev, user]);
    }
    if (config.syncUrl) syncWithCloud(config.syncUrl);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('attendance_current_user');
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              {currentUser?.role === 'admin' ? <ShieldCheck size={24} /> : <UserIcon size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-bold text-gray-800 text-lg leading-tight uppercase tracking-wider">Uniteam</h1>
                {config.syncUrl && (
                  <div className="flex items-center gap-1">
                    {isSyncing ? (
                      <RefreshCw size={12} className="text-blue-500 animate-spin" />
                    ) : syncError ? (
                      <span title="فشل الاتصال بالسحابة">
                        <CloudOff size={12} className="text-red-500" />
                      </span>
                    ) : (
                      <span title="متصل بالسحابة">
                        <Cloud size={12} className="text-green-500" />
                      </span>
                    )}
                  </div>
                )}
              </div>
              {currentUser && <p className="text-xs text-gray-500 font-medium">{currentUser.fullName}</p>}
            </div>
          </div>
          {currentUser && (
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
              <LogOut size={16} />
              <span>خروج</span>
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
              user={currentUser} branches={branches} records={records} setRecords={setRecords}
              googleSheetLink={config.googleSheetLink}
              onRefresh={() => config.syncUrl && syncWithCloud(config.syncUrl)}
              isSyncing={isSyncing}
            />
          )
        )}
      </main>
      <footer className="py-4 text-center text-gray-400 text-xs border-t bg-white/50 backdrop-blur-sm">
        Uniteam &copy; {new Date().getFullYear()} {config.lastUpdated && `| تحديث: ${new Date(config.lastUpdated).toLocaleTimeString('ar-EG')}`}
      </footer>
    </div>
  );
};

export default App;
