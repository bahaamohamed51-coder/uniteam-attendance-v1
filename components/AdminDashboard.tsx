
import React, { useState, useRef } from 'react';
import { Branch, AttendanceRecord, AppConfig, User, Job } from '../types';
import { MapPin, Table, Trash2, Shield, CloudUpload, Briefcase, RotateCcw, Globe, Users, Plus, FileSpreadsheet, Download, Share2, AlertTriangle, Smartphone, RefreshCw, ChevronDown, History } from 'lucide-react';
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

  const handleSaveSettings = () => {
    const newConfig = { ...config, adminUsername: adminUser, adminPassword: adminPass, syncUrl: syncUrl, googleSheetLink: syncUrl };
    setConfig(newConfig);
    localStorage.setItem('attendance_config', JSON.stringify(newConfig));
    alert("تم حفظ الإعدادات محلياً.");
  };

  const inputClasses = "px-4 py-3 rounded-xl border border-slate-600 bg-slate-900 text-white font-bold outline-none focus:border-blue-500 w-full transition-all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div className="text-white">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400 flex items-center gap-2">
            <Shield size={24} /> Uniteam Admin
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase">لوحة التحكم السحابية الموحدة</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
             onClick={onRefresh}
             disabled={isSyncing}
             className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black bg-slate-900 text-blue-400 transition-all shadow-xl text-xs border border-blue-900/30 hover:bg-slate-800"
             title="جلب أحدث التحديثات من السحابة"
           >
             <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
             تحديث البيانات الحالية
           </button>
           <button onClick={copyInviteLink} className="flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-xl text-xs">
             <Share2 size={16} /> رابط الموظفين
           </button>
           <button 
             onClick={pushToCloud}
             disabled={isPushing}
             className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black transition-all shadow-xl text-xs ${isPushing ? 'bg-slate-700 text-slate-500' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
           >
             {isPushing ? <RotateCcw size={16} className="animate-spin" /> : <CloudUpload size={16} />}
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
            <h4 className="text-sm font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">الفروع والمسافات</h4>
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 grid grid-cols-1 md:grid-cols-5 gap-4 shadow-inner">
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
                 <Plus size={18}/> إضافة فرع
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
                    <td className="py-4 px-2 font-bold">{b.name}</td>
                    <td className="py-4 px-2 text-[10px] text-slate-400 font-mono">{b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}</td>
                    <td className="py-4 px-2 text-center text-blue-400 font-black">{b.radius}م</td>
                    <td className="py-4 px-2 text-center">
                      <button onClick={() => setBranches(branches.filter(x => x.id !== b.id))} className="text-slate-500 hover:text-red-400 p-2"><Trash2 size={18}/></button>
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
                 <div className="bg-blue-600/20 p-2 rounded-xl text-blue-400">
                   <Users size={20} />
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-white uppercase">الموظفين المسجلين</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{allUsers.length} موظف مربوط بالمنظومة</p>
                 </div>
               </div>
               <button 
                onClick={onRefresh} 
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-900/30 rounded-xl text-[10px] font-black hover:bg-blue-600/20 transition-all"
               >
                 <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                 تحديث البيانات
               </button>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-right min-w-[700px]">
                 <thead><tr className="border-b border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="py-4 px-2">الاسم</th><th className="py-4 px-2 text-center">الرقم القومي</th><th className="py-4 px-2">الوظيفة</th><th className="py-4 px-2 text-center">حالة الجهاز</th><th className="py-4 px-2 text-center">إجراءات</th></tr></thead>
                 <tbody>{allUsers.map(user => (
                   <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-900/30 transition-all">
                     <td className="py-4 px-2 font-bold">{user.fullName}</td>
                     <td className="py-4 px-2 text-slate-400 text-xs text-center font-mono">{user.nationalId}</td>
                     <td className="py-4 px-2 font-black text-blue-400 text-[10px] uppercase">{user.jobTitle || '---'}</td>
                     <td className="py-4 px-2 text-center">
                        <div className="flex flex-col items-center">
                           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black border ${user.deviceId ? 'bg-green-600/10 text-green-400 border-green-900/30' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>
                             <Smartphone size={10} /> {user.deviceId ? 'مربوط برقم هاتف' : 'غير مربوط'}
                           </div>
                           {user.deviceId && (
                             <button onClick={() => resetDevice(user.id)} className="flex items-center gap-1 mt-1.5 px-2 py-1 bg-orange-900/20 text-orange-400 border border-orange-800 rounded-md text-[8px] font-black hover:bg-orange-600 hover:text-white transition-all">
                               <RefreshCw size={10} /> إعادة تعيين الجهاز
                             </button>
                           )}
                        </div>
                     </td>
                     <td className="py-4 px-2 text-center">
                       <button onClick={() => setAllUsers(allUsers.filter(u => u.id !== user.id))} className="text-slate-500 hover:text-red-500 p-2 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={16}/></button>
                     </td>
                   </tr>
                 ))}</tbody>
               </table>
             </div>
           </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
               <div className="flex items-center gap-3">
                 <div className="bg-orange-600/20 p-2 rounded-xl text-orange-400">
                   <History size={20} />
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-white uppercase">سجل الحركات</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">إجمالي الحركات المسجلة في السحابة</p>
                 </div>
               </div>
               <div className="flex gap-2">
                 <button 
                  onClick={onRefresh} 
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-900/30 rounded-xl text-[10px] font-black hover:bg-blue-600/20 transition-all"
                 >
                   <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                   تحديث الحركات
                 </button>
                 <button 
                   onClick={() => config.googleSheetLink && window.open(config.googleSheetLink, '_blank')}
                   className="flex items-center gap-2 px-4 py-2 bg-green-600/10 text-green-400 border border-green-900/30 rounded-xl text-[10px] font-black"
                 >
                   <FileSpreadsheet size={14} /> فتح Excel
                 </button>
               </div>
            </div>
            
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
              <Table size={48} className="opacity-20 text-blue-400" />
              <div className="text-center max-w-xs">
                <p className="font-black text-lg text-slate-300">التقارير السحابية النشطة</p>
                <p className="text-[10px] font-bold mt-1 uppercase tracking-widest leading-relaxed">تجد جميع عمليات الحضور والانصراف مسجلة لحظياً في ملف "جوجل شيت" المربوط بالنظام.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-10 max-w-2xl mx-auto py-4">
              <div className="space-y-4">
                <h4 className="text-lg font-black text-orange-400 flex items-center gap-2"><Globe size={20}/> إعدادات الربط السحابي</h4>
                <div className="p-8 bg-slate-900 rounded-3xl border border-slate-700 space-y-6 shadow-inner">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-tighter">رابط الـ Web App (Apps Script)</label>
                    <input type="text" className={inputClasses} value={syncUrl} onChange={e => setSyncUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-black text-red-400 flex items-center gap-2"><Shield size={20}/> بيانات المسؤول</h4>
                <div className="p-8 bg-slate-900 rounded-3xl border border-slate-700 grid grid-cols-2 gap-4 shadow-inner">
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
              <button onClick={handleSaveSettings} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-95">حفظ الإعدادات بالكامل</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
