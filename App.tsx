
import React, { useState, useEffect, useCallback } from 'react';
import { User, Branch, AttendanceRecord, AppConfig, Job, ReportAccount } from './types';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import ReportsView from './components/ReportsView';
import { ShieldCheck, User as UserIcon, Cloud, CloudOff, RefreshCw, FileSpreadsheet, Home } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reportAccounts, setReportAccounts] = useState<ReportAccount[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'reports'>('main');

  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('attendance_config');
    return saved ? JSON.parse(saved) : { 
      googleSheetLink: '',
      syncUrl: '',
      adminUsername: 'admin',
      adminPassword: 'B522129'
    };
  });

  const syncWithCloud = useCallback(async (url: string, force: boolean = false) => {
    if (!url || !url.startsWith('http')) return;
    setIsSyncing(true);
    setSyncError(false);
    try {
      const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getData&t=${Date.now()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error('فشل الاتصال');
      const data = await response.json();
      
      if (data.branches) setBranches(data.branches);
      if (data.jobs) setJobs(data.jobs);
      if (data.reportAccounts) setReportAccounts(data.reportAccounts);
      if (data.users && Array.isArray(data.users)) setAllUsers(data.users);
      
      const updatedConfig = { ...config, lastUpdated: new Date().toISOString(), syncUrl: url, googleSheetLink: url };
      setConfig(updatedConfig);
      localStorage.setItem('attendance_config', JSON.stringify(updatedConfig));
    } catch (err) {
      setSyncError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [config]);

  useEffect(() => {
    const savedUser = localStorage.getItem('attendance_current_user');
    const savedBranches = localStorage.getItem('attendance_branches');
    const savedJobs = localStorage.getItem('attendance_jobs');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    if (savedBranches) setBranches(JSON.parse(savedBranches));
    if (savedJobs) setJobs(JSON.parse(savedJobs));
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'admin') return;
    const params = new URLSearchParams(window.location.search);
    const cloudUrlEncoded = params.get('c');
    if (cloudUrlEncoded) {
      try {
        const decodedUrl = atob(cloudUrlEncoded);
        if (decodedUrl.startsWith('http')) {
          syncWithCloud(decodedUrl);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {}
    } else if (config.syncUrl) {
      syncWithCloud(config.syncUrl);
    }
  }, [syncWithCloud, currentUser?.role, config.syncUrl]);

  useEffect(() => { localStorage.setItem('attendance_branches', JSON.stringify(branches)); }, [branches]);
  useEffect(() => { localStorage.setItem('attendance_jobs', JSON.stringify(jobs)); }, [jobs]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('attendance_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('attendance_current_user');
  };

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 h-16">
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              {currentUser?.role === 'admin' ? <ShieldCheck size={24} /> : <UserIcon size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-gray-800 text-lg uppercase tracking-tighter">Uniteam</h1>
                {isSyncing ? <RefreshCw size={14} className="text-blue-500 animate-spin" /> : config.syncUrl ? <Cloud size={14} className="text-green-500" /> : <CloudOff size={14} className="text-red-500" />}
              </div>
              {currentUser && <p className="text-[10px] text-gray-500 font-black">{currentUser.fullName}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             {!currentUser && (
               <div className="flex bg-slate-100 p-1 rounded-xl">
                 <button 
                   onClick={() => setActiveView('main')} 
                   className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${activeView === 'main' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                 >
                   <Home size={14} /> الرئيسية
                 </button>
                 <button 
                   onClick={() => setActiveView('reports')} 
                   className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${activeView === 'reports' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                 >
                   <FileSpreadsheet size={14} /> Reports
                 </button>
               </div>
             )}
             {currentUser && <button onClick={handleLogout} className="px-4 py-2 text-xs font-black text-red-600 bg-red-50 rounded-xl">خروج</button>}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 pb-24">
        {activeView === 'reports' && !currentUser ? (
          <ReportsView syncUrl={config.syncUrl} />
        ) : (
          !currentUser ? (
            <Login 
              onLogin={handleLogin} allUsers={allUsers} adminConfig={config} availableJobs={jobs}
              setAdminConfig={(newCfg) => {
                const cfg = { ...config, ...newCfg };
                setConfig(cfg);
                localStorage.setItem('attendance_config', JSON.stringify(cfg));
              }}
            />
          ) : (
            currentUser.role === 'admin' ? (
              <AdminDashboard 
                branches={branches} setBranches={setBranches} jobs={jobs} setJobs={setJobs}
                records={records} config={config} setConfig={setConfig} allUsers={allUsers} setAllUsers={setAllUsers}
                reportAccounts={reportAccounts} setReportAccounts={setReportAccounts}
                onRefresh={() => syncWithCloud(config.syncUrl)} isSyncing={isSyncing}
              />
            ) : (
              <UserDashboard 
                user={currentUser} branches={branches} records={records} setRecords={setRecords}
                googleSheetLink={config.googleSheetLink} onRefresh={() => syncWithCloud(config.syncUrl)}
                isSyncing={isSyncing} lastUpdated={config.lastUpdated}
              />
            )
          )
        )}
      </main>
      <footer className="py-4 text-center text-gray-400 text-[10px] font-bold border-t uppercase tracking-widest">
        Uniteam &copy; {new Date().getFullYear()} {config.lastUpdated && `| Cloud Sync Active | Last Update: ${new Date(config.lastUpdated).toLocaleTimeString('ar-EG')}`}
      </footer>
    </div>
  );
};

export default App;
