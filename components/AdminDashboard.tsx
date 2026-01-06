
import React, { useState } from 'react';
import { Branch, AttendanceRecord, AppConfig, User, Job } from '../types';
import { MapPin, Table, Trash2, Edit3, Shield, CloudUpload, Briefcase, RotateCcw, X, Info, Globe, Users, Plus, Save, FileCode, Download } from 'lucide-react';

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
  const [isPushing, setIsPushing] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  
  const [adminUser, setAdminUser] = useState(config.adminUsername);
  const [adminPass, setAdminPass] = useState(config.adminPassword || '');
  const [syncUrl, setSyncUrl] = useState(config.syncUrl || '');
  const [googleSheet, setGoogleSheet] = useState(config.googleSheetLink || '');

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
          jobs: jobs
        })
      });
      alert("تم إرسال الفروع والوظائف للسحابة بنجاح!");
    } catch (err) {
      alert("حدث خطأ أثناء الاتصال بالسحابة");
    } finally {
      setIsPushing(false);
    }
  };

  const handleSaveSettings = () => {
    setConfig({ ...config, adminUsername: adminUser, adminPassword: adminPass, syncUrl: syncUrl, googleSheetLink: googleSheet });
    alert("تم حفظ الإعدادات بنجاح");
  };

  const inputClasses = "px-4 py-3 rounded-xl border border-slate-600 bg-slate-900 text-white font-bold outline-none focus:border-blue-500 w-full transition-all";

  return (
    <div className="space-y-6">
      {/* Modal: Edit Branch */}
      {editingBranch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl text-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-blue-400">تعديل الفرع والمسافة</h3>
              <button onClick={() => setEditingBranch(null)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" className={inputClasses} value={editingBranch.name} onChange={e => setEditingBranch({...editingBranch, name: e.target.value})} placeholder="اسم الفرع" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" className={inputClasses} value={editingBranch.latitude} onChange={e => setEditingBranch({...editingBranch, latitude: parseFloat(e.target.value)})} placeholder="Latitude" />
                <input type="number" className={inputClasses} value={editingBranch.longitude} onChange={e => setEditingBranch({...editingBranch, longitude: parseFloat(e.target.value)})} placeholder="Longitude" />
              </div>
              <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700">
                <label className="block text-xs font-bold text-slate-500 mb-2">المسافة المسموحة لكل موظف (بالمتر)</label>
                <input type="number" className={inputClasses} value={editingBranch.radius} onChange={e => setEditingBranch({...editingBranch, radius: parseInt(e.target.value)})} placeholder="المسافة (مثال: 100)" />
              </div>
              <button onClick={() => {
                setBranches(branches.map(b => b.id === editingBranch.id ? editingBranch : b));
                setEditingBranch(null);
              }} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black shadow-lg">حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl text-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-blue-400">تعديل بيانات الموظف</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" className={inputClasses} value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} placeholder="الاسم الكامل" />
              <input type="text" className={inputClasses} value={editingUser.nationalId} onChange={e => setEditingUser({...editingUser, nationalId: e.target.value})} placeholder="الرقم القومي" />
              <select className={inputClasses} value={editingUser.jobTitle} onChange={e => setEditingUser({...editingUser, jobTitle: e.target.value})}>
                {jobs.map(j => <option key={j.id} value={j.title}>{j.title}</option>)}
              </select>
              <button onClick={() => {
                setAllUsers(allUsers.map(u => u.id === editingUser.id ? editingUser : u));
                setEditingUser(null);
              }} className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black shadow-lg">تحديث البيانات</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Admin Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div className="text-white">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Uniteam Cloud Control</h2>
          <p className="text-slate-500 text-xs font-bold">لوحة إدارة البيانات المركزية</p>
        </div>
        <button 
          onClick={pushToCloud}
          disabled={isPushing}
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all shadow-2xl ${isPushing ? 'bg-slate-700 text-slate-500' : 'bg-orange-600 hover:bg-orange-500 text-white'}`}
        >
          {isPushing ? <RotateCcw size={20} className="animate-spin" /> : <CloudUpload size={20} />}
          مزامنة الإعدادات للسحابة
        </button>
      </div>

      <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'branches', label: 'الفروع والمسافات', icon: MapPin },
          { id: 'users', label: 'الموظفين', icon: Users },
          { id: 'reports', label: 'التقارير', icon: Table },
          { id: 'settings', label: 'الإعدادات', icon: Shield }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all whitespace-nowrap border ${
              activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden p-8 text-white min-h-[400px]">
        {activeTab === 'branches' && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 space-y-4">
               <h4 className="text-sm font-black text-blue-400">إضافة فرع عمل جديد</h4>
               <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <input type="text" placeholder="اسم الفرع" className={inputClasses} value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} />
                  <input type="number" placeholder="Lat" className={inputClasses} value={newBranch.latitude || ''} onChange={e => setNewBranch({...newBranch, latitude: parseFloat(e.target.value)})} />
                  <input type="number" placeholder="Lng" className={inputClasses} value={newBranch.longitude || ''} onChange={e => setNewBranch({...newBranch, longitude: parseFloat(e.target.value)})} />
                  <input type="number" placeholder="نطاق البصمة (م)" className={inputClasses} value={newBranch.radius || ''} onChange={e => setNewBranch({...newBranch, radius: parseInt(e.target.value)})} />
                  <button onClick={() => {
                    if (newBranch.name && newBranch.latitude) {
                      setBranches([...branches, { ...newBranch, id: Math.random().toString(36).substr(2, 9), radius: newBranch.radius || 100 } as Branch]);
                      setNewBranch({ name: '', latitude: 0, longitude: 0, radius: 100 });
                    }
                  }} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black py-3 px-2">إضافة الفرع</button>
               </div>
            </div>
            
            <table className="w-full text-right">
              <thead><tr className="border-b border-slate-700 text-xs font-black text-slate-500">
                <th className="py-4">اسم الفرع</th>
                <th className="py-4">الموقع</th>
                <th className="py-4">نطاق البصمة</th>
                <th className="py-4 text-center">إجراءات</th>
              </tr></thead>
              <tbody>{branches.map(b => (
                <tr key={b.id} className="border-b border-slate-700/50 hover:bg-slate-900/30">
                  <td className="py-4 font-bold">{b.name}</td>
                  <td className="py-4 text-xs text-slate-400">{b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</td>
                  <td className="py-4 text-blue-400 font-black">{b.radius} متر</td>
                  <td className="py-4 text-center flex justify-center gap-2">
                    <button onClick={() => setEditingBranch(b)} className="text-slate-400 hover:text-blue-400 p-2"><Edit3 size={18}/></button>
                    <button onClick={() => setBranches(branches.filter(x => x.id !== b.id))} className="text-slate-400 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-black text-blue-400">بيانات الموظفين المسجلة</h3>
               <span className="bg-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black border border-slate-700">{allUsers.length} موظف</span>
            </div>
            <table className="w-full text-right">
              <thead><tr className="border-b border-slate-700 text-xs font-black text-slate-500">
                <th className="py-4">اسم الموظف</th>
                <th className="py-4">الرقم القومي</th>
                <th className="py-4">الوظيفة</th>
                <th className="py-4 text-center">تعديل</th>
              </tr></thead>
              <tbody>{allUsers.map(user => (
                <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-900/30">
                  <td className="py-4 font-bold">{user.fullName}</td>
                  <td className="py-4 text-slate-400 text-sm">{user.nationalId}</td>
                  <td className="py-4 font-black text-blue-400 text-xs">{user.jobTitle || '---'}</td>
                  <td className="py-4 text-center flex justify-center gap-2">
                    <button onClick={() => setEditingUser(user)} className="text-blue-400 p-2 hover:bg-blue-900/20 rounded-lg"><Edit3 size={18}/></button>
                    <button onClick={() => setAllUsers(allUsers.filter(u => u.id !== user.id))} className="text-red-500 p-2 hover:bg-red-900/20 rounded-lg"><Trash2 size={18}/></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {activeTab === 'settings' && (
           <div className="space-y-10 max-w-2xl mx-auto py-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <h4 className="text-lg font-black text-orange-400 flex items-center gap-2"><Globe size={20}/> الربط السحابي</h4>
                   <button 
                     onClick={() => setShowSetupGuide(!showSetupGuide)}
                     className="text-[10px] font-black text-blue-400 bg-blue-900/20 px-3 py-1 rounded-lg border border-blue-800/50"
                   >
                     {showSetupGuide ? 'إخفاء الدليل' : 'دليل تهيئة الشيت'}
                   </button>
                </div>

                {showSetupGuide && (
                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="space-y-4">
                      <p className="text-xs text-slate-400 leading-relaxed font-bold">يجب أن يحتوي ملف جوجل شيت الخاص بك على 3 صفحات (Tabs) بالأسماء التالية والأعمدة المذكورة:</p>
                      
                      <div className="space-y-4">
                         <div className="p-4 bg-slate-800 rounded-xl border border-blue-900/30">
                            <h5 className="text-blue-400 font-black text-xs mb-2 flex items-center gap-2"><Table size={14}/> الصفحة 1: Attendance</h5>
                            <code className="text-[10px] text-green-500 break-all">ID المعاملة | الاسم | الرقم القومي | الوظيفة | الفرع | النوع | الوقت | الموقع</code>
                         </div>
                         <div className="p-4 bg-slate-800 rounded-xl border border-green-900/30">
                            <h5 className="text-green-400 font-black text-xs mb-2 flex items-center gap-2"><Users size={14}/> الصفحة 2: Users</h5>
                            <code className="text-[10px] text-green-500 break-all">ID | الاسم الكامل | الرقم القومي | الوظيفة | ID الجهاز | تاريخ التسجيل</code>
                         </div>
                         <div className="p-4 bg-slate-800 rounded-xl border border-orange-900/30">
                            <h5 className="text-orange-400 font-black text-xs mb-2 flex items-center gap-2"><Save size={14}/> الصفحة 3: Config</h5>
                            <code className="text-[10px] text-green-500">لا تحتاج أعمدة، الكود سيكتب فيها البيانات تلقائياً</code>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-8 bg-slate-900 rounded-3xl border border-slate-700 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">رابط المزامنة (Apps Script URL)</label>
                    <input type="text" className={inputClasses} value={syncUrl} onChange={e => setSyncUrl(e.target.value)} placeholder="https://script.google.com/macros/..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 mr-2 uppercase">رابط استلام البيانات (EndPoint)</label>
                    <input type="text" className={inputClasses} value={googleSheet} onChange={e => setGoogleSheet(e.target.value)} placeholder="رابط استلام الحضور والبيانات الشخصية" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-black text-red-400 flex items-center gap-2"><Shield size={20}/> أمان المسؤول</h4>
                <div className="p-8 bg-slate-900 rounded-3xl border border-slate-700 grid grid-cols-2 gap-4">
                   <input type="text" className={inputClasses} value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="Username" />
                   <input type="password" className={inputClasses} value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Password" />
                </div>
              </div>
              
              <button onClick={handleSaveSettings} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all">حفظ الإعدادات</button>
           </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
