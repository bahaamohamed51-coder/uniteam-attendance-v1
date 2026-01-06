
import React, { useState, useRef } from 'react';
import { Branch, AttendanceRecord, AppConfig, User, Job } from '../types';
import { MapPin, Table, Trash2, Shield, CloudUpload, Briefcase, RotateCcw, Globe, Users, Plus, FileSpreadsheet, Download, Share2, AlertTriangle, Smartphone, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AdminDashboardProps {
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  jobs: Job[];
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  records: AttendanceRecord[];
  config: AppConfig;
  setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  branches, setBranches, jobs, setJobs, records, config, setConfig, allUsers, setAllUsers 
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'jobs' | 'reports' | 'users' | 'settings'>('branches');
  const [newBranch, setNewBranch] = useState<Partial<Branch>>({ name: '', latitude: 0, longitude: 0, radius: 100 });
  const [newJobTitle, setNewJobTitle] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  
  const [adminUser, setAdminUser] = useState(config.adminUsername);
  const [adminPass, setAdminPass] = useState(config.adminPassword || '');
  const [syncUrl, setSyncUrl] = useState(config.syncUrl || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobFileInputRef = useRef<HTMLInputElement>(null);

  const pushToCloud = async () => {
    if (!config.syncUrl) {
      alert("يرجى ضبط رابط المزامنة في الإعدادات أولاً");
      return;
    }
    setIsPushing(true);
    try {
      await fetch(config.syncUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateSystem',
          branches: branches,
          jobs: jobs,
          users: allUsers // إضافة الموظفين للمزامنة لضمان حفظ حالة الأجهزة
        })
      });
      alert("تم إرسال البيانات للسحابة بنجاح!");
    } catch (err) {
      alert("حدث خطأ أثناء الاتصال بالسحابة");
    } finally {
      setIsPushing(false);
    }
  };

  const resetDevice = (userId: string) => {
    if (confirm("هل أنت متأكد من حذف ارتباط الجهاز؟ سيتمكن الموظف من التسجيل من هاتف جديد عند أول دخول.")) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, deviceId: undefined } : u));
    }
  };

  const copyInviteLink = () => {
    if (!config.syncUrl) {
      alert("يرجى ضبط رابط المزامنة أولاً");
      return;
    }
    const baseUrl = window.location.origin + window.location.pathname;
    const encodedUrl = btoa(config.syncUrl);
    const inviteLink = `${baseUrl}?c=${encodedUrl}`;
    
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert("تم نسخ رابط الربط!");
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>, type: 'branches' | 'jobs') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      if (type === 'branches') {
        const importedBranches = data.map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: item.الاسم || item.name || 'فرع جديد',
          latitude: parseFloat(item.latitude || item.خط_العرض || 0),
          longitude: parseFloat(item.longitude || item.خط_الطول || 0),
          radius: parseInt(item.radius || item.المسافة || 100)
        }));
        setBranches(prev => [...prev, ...importedBranches]);
      } else {
        const importedJobs = data.map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          title: item.الوظيفة || item.job || item.title || 'موظف'
        }));
        setJobs(prev => [...prev, ...importedJobs]);
      }
      alert("تم الاستيراد محلياً. لا تنسى الضغط على 'مزامنة للسحابة'.");
      if(e.target) e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = (type: 'branches' | 'jobs') => {
    let data = [];
    if (type === 'branches') {
      data = [{ "الاسم": "فرع القاهرة", "latitude": 30.0444, "longitude": 31.2357, "المسافة": 100 }];
    } else {
      data = [{ "الوظيفة": "محاسب" }];
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Template_${type}.xlsx`);
  };

  const handleSaveSettings = () => {
    const newConfig = { ...config, adminUsername: adminUser, adminPassword: adminPass, syncUrl: syncUrl, googleSheetLink: syncUrl };
    setConfig(newConfig);
    localStorage.setItem('attendance_config', JSON.stringify(newConfig));
    alert("تم حفظ الإعدادات محلياً.");
  };

  const inputClasses = "px-4 py-3 rounded-xl border border-slate-600 bg-slate-900 text-white font-bold outline-none focus:border-blue-500 w-full transition-all";

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleExcelImport(e, 'branches')} />
      <input type="file" ref={jobFileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={(e) => handleExcelImport(e, 'jobs')} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div className="text-white">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400">Uniteam Admin</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase">لوحة التحكم السحابية</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={copyInviteLink} className="flex items-center gap-2 px-6 py-4 rounded-2xl font-black bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xl text-sm">
             <Share2 size={18} /> رابط الموظفين
           </button>
           <button 
             onClick={pushToCloud}
             disabled={isPushing}
             className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all shadow-xl text-sm ${isPushing ? 'bg-slate-700 text-slate-500' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
           >
             {isPushing ? <RotateCcw size={18} className="animate-spin" /> : <CloudUpload size={18} />}
             مزامنة للسحابة
           </button>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'branches', label: 'الفروع', icon: MapPin },
          { id: 'jobs', label: 'الوظائف', icon: Briefcase },
          { id: 'users', label: 'الموظفين', icon: Users },
          { id: 'reports', label: 'التقارير', icon: Table },
          { id: 'settings', label: 'الإعدادات', icon: Shield }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all border ${
              activeTab === tab.id ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden p-6 text-white min-h-[400px]">
        {activeTab === 'branches' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">الفروع والمسافات</h4>
               <div className="flex gap-2">
                 <button onClick={() => downloadTemplate('branches')} className="flex items-center gap-2 bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-black border border-slate-600"><Download size={14} /> نموذج Excel</button>
                 <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-green-600/20 text-green-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-green-900/50"><FileSpreadsheet size={14} /> استيراد Excel</button>
               </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 grid grid-cols-1 md:grid-cols-5 gap-4">
               <input type="text" placeholder="اسم الفرع" className={inputClasses} value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} />
               <input type="number" placeholder="Lat" className={inputClasses} value={newBranch.latitude || ''} onChange={e => setNewBranch({...newBranch, latitude: parseFloat(e.target.value)})} />
               <input type="number" placeholder="Lng" className={inputClasses} value={newBranch.longitude || ''} onChange={e => setNewBranch({...newBranch, longitude: parseFloat(e.target.value)})} />
               <input type="number" placeholder="المسافة" className={inputClasses} value={newBranch.radius || ''} onChange={e => setNewBranch({...newBranch, radius: parseInt(e.target.value)})} />
               <button onClick={() => {
                 if (newBranch.name && newBranch.latitude) {
                   setBranches([...branches, { ...newBranch, id: Math.random().toString(36).substr(2, 9), radius: newBranch.radius || 100 } as Branch]);
                   setNewBranch({ name: '', latitude: 0, longitude: 0, radius: 100 });
                 }
               }} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black py-3 px-2 flex items-center justify-center gap-2 transition-all active:scale-95">
                 <Plus size={18}/> إضافة
               </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[600px]">
                <thead><tr className="border-b border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-4 px-2">اسم الفرع</th>
                  <th className="py-4 px-2">الإحداثيات</th>
                  <th className="py-4 px-2">النطاق</th>
                  <th className="py-4 px-2 text-center">إجراءات</th>
                </tr></thead>
                <tbody>{branches.map(b => (
                  <tr key={b.id} className="border-b border-slate-700/50 hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-2 font-bold">{b.name}</td>
                    <td className="py-4 px-2 text-[10px] text-slate-400 font-mono">{b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}</td>
                    <td className="py-4 px-2 text-blue-400 font-black">{b.radius}م</td>
                    <td className="py-4 px-2 text-center flex justify-center gap-2">
                      <button onClick={() => setBranches(branches.filter(x => x.id !== b.id))} className="text-slate-400 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest">الوظائف المتاحة</h4>
               <button onClick={() => jobFileInputRef.current?.click()} className="flex items-center gap-2 bg-green-600/20 text-green-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-green-900/50"><FileSpreadsheet size={14} /> استيراد وظائف</button>
            </div>
            <div className="flex gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-700">
               <input type="text" placeholder="اسم الوظيفة الجديد" className={inputClasses} value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} />
               <button onClick={() => {
                 if(newJobTitle.trim()) { setJobs([...jobs, { id: Math.random().toString(36).substr(2, 9), title: newJobTitle }]); setNewJobTitle(''); }
               }} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-8 font-black flex items-center gap-2 transition-all active:scale-95">
                 <Plus size={20}/> إضافة
               </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map(job => (
                <div key={job.id} className="flex justify-between items-center p-4 bg-slate-900 rounded-2xl border border-slate-700 group hover:border-blue-500 transition-all">
                  <span className="font-bold text-slate-200">{job.title}</span>
                  <button onClick={() => setJobs(jobs.filter(j => j.id !== job.id))} className="text-slate-600 group-hover:text-red-500 p-2"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h3 className="text-lg font-black text-blue-400 uppercase tracking-tighter">الموظفين المسجلين</h3>
               <span className="bg-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black border border-slate-700">{allUsers.length} موظف</span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-right min-w-[600px]">
                 <thead><tr className="border-b border-slate-700 text-xs font-black text-slate-500"><th className="py-4 px-2">الاسم</th><th className="py-4 px-2 text-center">الرقم القومي</th><th className="py-4 px-2">الوظيفة</th><th className="py-4 px-2 text-center">الجهاز</th><th className="py-4 px-2 text-center">إجراءات</th></tr></thead>
                 <tbody>{allUsers.map(user => (
                   <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-900/30">
                     <td className="py-4 px-2 font-bold">{user.fullName}</td>
                     <td className="py-4 px-2 text-slate-400 text-sm text-center font-mono">{user.nationalId}</td>
                     <td className="py-4 px-2 font-black text-blue-400 text-xs">{user.jobTitle || '---'}</td>
                     <td className="py-4 px-2 text-center">
                        <div className="flex flex-col items-center">
                           <span className={`text-[9px] font-black uppercase ${user.deviceId ? 'text-green-400' : 'text-slate-500'}`}>
                             {user.deviceId ? 'مربوط' : 'غير مربوط'}
                           </span>
                           {user.deviceId && (
                             <button onClick={() => resetDevice(user.id)} className="flex items-center gap-1 mt-1 px-2 py-1 bg-orange-900/30 text-orange-400 border border-orange-800 rounded-md text-[8px] font-black hover:bg-orange-800 hover:text-white transition-all">
                               <RefreshCw size={10} /> إعادة تعيين الجهاز
                             </button>
                           )}
                        </div>
                     </td>
                     <td className="py-4 px-2 text-center flex justify-center gap-2">
                       <button onClick={() => setAllUsers(allUsers.filter(u => u.id !== user.id))} className="text-red-500 p-2 hover:bg-red-900/20 rounded-lg"><Trash2 size={16}/></button>
                     </td>
                   </tr>
                 ))}</tbody>
               </table>
             </div>
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-10 max-w-2xl mx-auto py-4">
              <div className="space-y-4">
                <h4 className="text-lg font-black text-orange-400 flex items-center gap-2"><Globe size={20}/> إعدادات الربط السحابي</h4>
                <div className="p-8 bg-slate-900 rounded-3xl border border-slate-700 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-tighter">رابط الـ Web App (Apps Script)</label>
                    <input type="text" className={inputClasses} value={syncUrl} onChange={e => setSyncUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-black text-red-400 flex items-center gap-2"><Shield size={20}/> بيانات المسؤول</h4>
                <div className="p-8 bg-slate-900 rounded-3xl border border-slate-700 grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">اسم المستخدم</label>
                      <input type="text" className={inputClasses} value={adminUser} onChange={e => setAdminUser(e.target.value)} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">كلمة المرور</label>
                      <input type="password" className={inputClasses} value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                   </div>
                </div>
              </div>
              <button onClick={handleSaveSettings} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all">حفظ الإعدادات بالكامل</button>
           </div>
        )}
        
        {activeTab === 'reports' && <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-4"><Table size={48} className="opacity-20 text-blue-400" /><div className="text-center"><p className="font-black text-lg text-slate-300">التقارير السحابية</p><p className="text-[10px] font-bold mt-1 uppercase tracking-widest">يتم التسجيل لحظياً في ملف جوجل شيت المربوط</p></div></div>}
      </div>
    </div>
  );
};

export default AdminDashboard;
