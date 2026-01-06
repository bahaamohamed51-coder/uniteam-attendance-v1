
import React, { useState, useRef } from 'react';
import { Branch, AttendanceRecord, AppConfig, User, Job } from '../types';
import { MapPin, Table, Trash2, Shield, CloudUpload, Briefcase, RotateCcw, Globe, Users, Plus, FileSpreadsheet, Download, Share2, AlertTriangle, Smartphone, RefreshCw, Edit2, Check, X } from 'lucide-react';
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
  onRefresh: () => void;
  isSyncing: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  branches, setBranches, jobs, setJobs, records, config, setConfig, allUsers, setAllUsers, onRefresh, isSyncing
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'jobs' | 'reports' | 'users' | 'settings'>('branches');
  const [newBranch, setNewBranch] = useState<Partial<Branch>>({ name: '', latitude: 0, longitude: 0, radius: 100 });
  const [newJobTitle, setNewJobTitle] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  
  // حالات التعديل (Inline Editing)
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editBranchData, setEditBranchData] = useState<Partial<Branch>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState<Partial<User>>({});

  const [adminUser, setAdminUser] = useState(config.adminUsername);
  const [adminPass, setAdminPass] = useState(config.adminPassword || '');
  const [syncUrl, setSyncUrl] = useState(config.syncUrl || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jobFileInputRef = useRef<HTMLInputElement>(null);

  const getInviteLink = () => {
    if (!config.syncUrl) return "";
    const baseUrl = window.location.origin + window.location.pathname;
    const encodedUrl = btoa(config.syncUrl);
    return `${baseUrl}?c=${encodedUrl}`;
  };

  const shareInviteLink = async () => {
    const link = getInviteLink();
    if (!link) {
      alert("يرجى ضبط رابط المزامنة أولاً");
      return;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'رابط نظام الحضور - Uniteam',
          text: 'رابط تسجيل الموظفين في شركة Uniteam:',
          url: link,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      navigator.clipboard.writeText(link).then(() => {
        alert("تم نسخ الرابط! يمكنك إرساله للموظفين الآن.");
      });
    }
  };

  const downloadTemplate = (type: 'branches' | 'jobs') => {
    let data = [];
    let fileName = "";
    if (type === 'branches') {
      data = [{ "اسم الفرع": "الفرع الرئيسي", "خط العرض": 30.05, "خط الطول": 31.23, "النطاق بالمتر": 100 }];
      fileName = "template_branches.xlsx";
    } else {
      data = [{ "اسم الوظيفة": "مهندس" }, { "اسم الوظيفة": "فني" }];
      fileName = "template_jobs.xlsx";
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, fileName);
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>, type: 'branches' | 'jobs') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (type === 'branches') {
          const importedBranches = data.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            name: item["اسم الفرع"] || item.name || 'فرع جديد',
            latitude: parseFloat(item["خط العرض"] || item.latitude || 0),
            longitude: parseFloat(item["خط الطول"] || item.longitude || 0),
            radius: parseInt(item["النطاق بالمتر"] || item.radius || 100)
          }));
          setBranches(prev => [...prev, ...importedBranches]);
        } else {
          const importedJobs = data.map((item: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            title: item["اسم الوظيفة"] || item.job || item.title || 'موظف'
          }));
          setJobs(prev => [...prev, ...importedJobs]);
        }
        alert("تم استيراد البيانات! يرجى الضغط على 'حفظ في السحابة' لتفعيلها.");
      } catch (err) {
        alert("خطأ في قراءة ملف الإكسل");
      }
      if(e.target) e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

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
          users: allUsers 
        })
      });
      alert("تم إرسال البيانات للسحابة بنجاح!");
    } catch (err) {
      alert("حدث خطأ أثناء الاتصال بالسحابة");
    } finally {
      setIsPushing(false);
    }
  };

  const saveEditBranch = (id: string) => {
    setBranches(prev => prev.map(b => b.id === id ? { ...b, ...editBranchData } : b));
    setEditingBranchId(null);
  };

  const saveEditUser = (id: string) => {
    setAllUsers(prev => prev.map(u => u.id === id ? { ...u, ...editUserData } : u));
    setEditingUserId(null);
  };

  const inputClasses = "px-4 py-3 rounded-xl border border-slate-600 bg-slate-900 text-white font-bold outline-none focus:border-blue-500 w-full transition-all";

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={(e) => handleExcelImport(e, 'branches')} />
      <input type="file" ref={jobFileInputRef} className="hidden" accept=".xlsx, .xls" onChange={(e) => handleExcelImport(e, 'jobs')} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div className="text-white">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400 flex items-center gap-2">
            <Shield size={24} /> Uniteam Admin
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase">إدارة السحابة الموحدة</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button onClick={onRefresh} disabled={isSyncing} className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black bg-slate-900 text-blue-400 border border-blue-900/30 text-xs hover:bg-slate-800 transition-all">
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> تحديث البيانات
           </button>
           <button onClick={shareInviteLink} className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black bg-blue-600 hover:bg-blue-500 text-white text-xs shadow-xl transition-all">
             <Share2 size={16} /> مشاركة الرابط
           </button>
           <button onClick={pushToCloud} disabled={isPushing} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black bg-orange-600 hover:bg-orange-500 text-white shadow-xl text-xs transition-all">
             {isPushing ? <RotateCcw size={16} className="animate-spin" /> : <CloudUpload size={16} />} حفظ في السحابة
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
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all border shrink-0 ${
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
            <div className="flex justify-between items-center">
               <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">الفروع الحالية</h4>
               <div className="flex gap-2">
                  <button onClick={() => downloadTemplate('branches')} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-[10px] font-black"><Download size={14}/> نموذج</button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-[10px] font-black"><FileSpreadsheet size={14}/> استيراد</button>
               </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 grid grid-cols-1 md:grid-cols-5 gap-4 shadow-inner">
               <input type="text" placeholder="الاسم" className={inputClasses} value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} />
               <input type="number" placeholder="Lat" className={inputClasses} value={newBranch.latitude || ''} onChange={e => setNewBranch({...newBranch, latitude: parseFloat(e.target.value)})} />
               <input type="number" placeholder="Lng" className={inputClasses} value={newBranch.longitude || ''} onChange={e => setNewBranch({...newBranch, longitude: parseFloat(e.target.value)})} />
               <input type="number" placeholder="المسافة" className={inputClasses} value={newBranch.radius || ''} onChange={e => setNewBranch({...newBranch, radius: parseInt(e.target.value)})} />
               <button onClick={() => {
                 if (newBranch.name) {
                   setBranches([...branches, { ...newBranch, id: Math.random().toString(36).substr(2, 9), radius: newBranch.radius || 100 } as Branch]);
                   setNewBranch({ name: '', latitude: 0, longitude: 0, radius: 100 });
                 }
               }} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black py-3 flex items-center justify-center gap-2 transition-all">
                 <Plus size={18}/> إضافة
               </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[600px]">
                <thead><tr className="border-b border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-4 px-2">اسم الفرع</th>
                  <th className="py-4 px-2">الإحداثيات</th>
                  <th className="py-4 px-2 text-center">النطاق</th>
                  <th className="py-4 px-2 text-center">إجراءات</th>
                </tr></thead>
                <tbody>{branches.map(b => (
                  <tr key={b.id} className="border-b border-slate-700/50 hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-2 font-bold">
                       {editingBranchId === b.id ? (
                         <input className="bg-slate-900 border border-blue-500 rounded px-2 py-1 text-xs" value={editBranchData.name} onChange={e => setEditBranchData({...editBranchData, name: e.target.value})} />
                       ) : b.name}
                    </td>
                    <td className="py-4 px-2 text-[10px] text-slate-400 font-mono">
                       {editingBranchId === b.id ? (
                         <div className="flex gap-1">
                           <input type="number" className="bg-slate-900 border border-blue-500 rounded px-1 w-16 text-[9px]" value={editBranchData.latitude} onChange={e => setEditBranchData({...editBranchData, latitude: parseFloat(e.target.value)})} />
                           <input type="number" className="bg-slate-900 border border-blue-500 rounded px-1 w-16 text-[9px]" value={editBranchData.longitude} onChange={e => setEditBranchData({...editBranchData, longitude: parseFloat(e.target.value)})} />
                         </div>
                       ) : `${b.latitude.toFixed(4)}, ${b.longitude.toFixed(4)}`}
                    </td>
                    <td className="py-4 px-2 text-center text-blue-400 font-black">
                       {editingBranchId === b.id ? (
                         <input type="number" className="bg-slate-900 border border-blue-500 rounded px-1 w-12 text-xs" value={editBranchData.radius} onChange={e => setEditBranchData({...editBranchData, radius: parseInt(e.target.value)})} />
                       ) : `${b.radius}م`}
                    </td>
                    <td className="py-4 px-2 text-center">
                       <div className="flex justify-center gap-2">
                         {editingBranchId === b.id ? (
                           <>
                             <button onClick={() => saveEditBranch(b.id)} className="text-green-500"><Check size={18}/></button>
                             <button onClick={() => setEditingBranchId(null)} className="text-red-500"><X size={18}/></button>
                           </>
                         ) : (
                           <>
                             <button onClick={() => { setEditingBranchId(b.id); setEditBranchData(b); }} className="text-blue-400 hover:bg-blue-900/20 p-1.5 rounded"><Edit2 size={16}/></button>
                             <button onClick={() => setBranches(branches.filter(x => x.id !== b.id))} className="text-slate-500 hover:text-red-400 p-1.5"><Trash2 size={16}/></button>
                           </>
                         )}
                       </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
               <div className="flex items-center gap-3">
                 <Users size={20} className="text-blue-400" />
                 <h3 className="text-sm font-black text-white uppercase tracking-tighter">سجل الموظفين (قراءة مباشرة من السحابة)</h3>
               </div>
               <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-900/30 rounded-xl text-[10px] font-black">
                 <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> تحديث القائمة
               </button>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-right min-w-[700px]">
                 <thead><tr className="border-b border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="py-4 px-2">الاسم</th><th className="py-4 px-2 text-center">الرقم القومي</th><th className="py-4 px-2">الوظيفة</th><th className="py-4 px-2 text-center">حالة الجهاز</th><th className="py-4 px-2 text-center">إجراءات</th></tr></thead>
                 <tbody>{allUsers.map(user => (
                   <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-900/30 transition-all">
                     <td className="py-4 px-2 font-bold">
                        {editingUserId === user.id ? (
                          <input className="bg-slate-900 border border-blue-500 rounded px-2 py-1 text-xs w-full" value={editUserData.fullName} onChange={e => setEditUserData({...editUserData, fullName: e.target.value})} />
                        ) : user.fullName}
                     </td>
                     <td className="py-4 px-2 text-slate-400 text-xs text-center font-mono">
                        {editingUserId === user.id ? (
                          <input className="bg-slate-900 border border-blue-500 rounded px-2 py-1 text-xs w-28" value={editUserData.nationalId} onChange={e => setEditUserData({...editUserData, nationalId: e.target.value})} />
                        ) : user.nationalId}
                     </td>
                     <td className="py-4 px-2 font-black text-blue-400 text-[10px]">
                        {editingUserId === user.id ? (
                          <select className="bg-slate-900 border border-blue-500 rounded px-1 py-1 text-[10px]" value={editUserData.jobTitle} onChange={e => setEditUserData({...editUserData, jobTitle: e.target.value})}>
                            {jobs.map(j => <option key={j.id} value={j.title}>{j.title}</option>)}
                          </select>
                        ) : user.jobTitle}
                     </td>
                     <td className="py-4 px-2 text-center">
                        <div className={`flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border mx-auto w-fit ${user.deviceId ? 'bg-green-600/10 text-green-400 border-green-900/30' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>
                          <Smartphone size={10} /> {user.deviceId ? 'مربوط برقم هاتف' : 'غير مربوط'}
                        </div>
                     </td>
                     <td className="py-4 px-2 text-center">
                        <div className="flex justify-center gap-2">
                           {editingUserId === user.id ? (
                             <>
                               <button onClick={() => saveEditUser(user.id)} className="text-green-500"><Check size={18}/></button>
                               <button onClick={() => setEditingUserId(null)} className="text-red-500"><X size={18}/></button>
                             </>
                           ) : (
                             <>
                               <button onClick={() => { setEditingUserId(user.id); setEditUserData(user); }} className="text-blue-400 hover:bg-blue-900/20 p-1.5 rounded"><Edit2 size={16}/></button>
                               <button onClick={() => setAllUsers(allUsers.filter(u => u.id !== user.id))} className="text-slate-500 hover:text-red-500 p-1.5"><Trash2 size={16}/></button>
                             </>
                           )}
                        </div>
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
               <div className="flex gap-2">
                  <button onClick={() => downloadTemplate('jobs')} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-[10px] font-black"><Download size={14}/> نموذج</button>
                  <button onClick={() => jobFileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-[10px] font-black"><FileSpreadsheet size={14}/> استيراد</button>
               </div>
            </div>
            <div className="flex gap-4 bg-slate-900/50 p-6 rounded-3xl border border-slate-700">
               <input type="text" placeholder="عنوان الوظيفة" className={inputClasses} value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} />
               <button onClick={() => {
                 if(newJobTitle.trim()) { setJobs([...jobs, { id: Math.random().toString(36).substr(2, 9), title: newJobTitle }]); setNewJobTitle(''); }
               }} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-8 font-black flex items-center gap-2 transition-all">
                 <Plus size={20}/> إضافة
               </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {jobs.map(j => (
                 <div key={j.id} className="p-4 bg-slate-900 rounded-2xl border border-slate-700 flex justify-between items-center hover:border-blue-500 transition-all">
                   <span className="text-xs font-bold">{j.title}</span>
                   <button onClick={() => setJobs(jobs.filter(x => x.id !== j.id))} className="text-slate-600 hover:text-red-500"><Trash2 size={14}/></button>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
           <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-4">
              <Table size={48} className="opacity-20 text-blue-400" />
              <p className="font-black text-slate-300">التقارير مسجلة لحظياً في السحابة</p>
              <button onClick={() => config.googleSheetLink && window.open(config.googleSheetLink, '_blank')} className="px-6 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs font-black text-slate-400 hover:text-white transition-all shadow-lg flex items-center gap-2">
                فتح ملف جوجل شيت <Share2 size={14} />
              </button>
           </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-10 max-w-2xl mx-auto py-4">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-orange-400 flex items-center gap-2 tracking-widest uppercase"><Globe size={20}/> الربط السحابي</h4>
                <div className="p-8 bg-slate-900 rounded-3xl border border-slate-700 space-y-6 shadow-inner">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">رابط الـ Web App (Apps Script)</label>
                    <input type="text" className={inputClasses} value={syncUrl} onChange={e => setSyncUrl(e.target.value)} placeholder="https://script.google.com/..." />
                  </div>
                </div>
              </div>
              <button onClick={() => {
                const newConfig = { ...config, adminUsername: adminUser, adminPassword: adminPass, syncUrl: syncUrl, googleSheetLink: syncUrl };
                setConfig(newConfig);
                localStorage.setItem('attendance_config', JSON.stringify(newConfig));
                alert("تم حفظ الإعدادات!");
              }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all">حفظ التغييرات</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
