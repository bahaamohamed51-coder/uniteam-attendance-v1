
import React, { useState, useMemo, useEffect } from 'react';
import { FileSpreadsheet, Download, LogIn, Loader2, Table, Calendar as CalendarIcon, MapPin, User as UserIcon, Briefcase, Filter, RefreshCw, ChevronRight, ChevronLeft, X, Link as LinkIcon, AlertCircle, Check, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppConfig } from '../types';

interface ReportsViewProps {
  syncUrl: string;
  adminConfig: AppConfig;
}

// مكون التقويم المدمج
const CustomDatePicker = ({ 
  label, 
  value, 
  onChange, 
  placeholder 
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void,
  placeholder: string
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateClick = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const offset = selected.getTimezoneOffset();
    const adjustedDate = new Date(selected.getTime() - (offset * 60 * 1000));
    onChange(adjustedDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  
  return (
    <div className="relative space-y-1 w-full text-right">
      <label className="text-[9px] font-black text-slate-500 mr-2 uppercase">{label}</label>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold text-right flex justify-between items-center hover:border-blue-500 transition-all"
      >
        <span>{value || placeholder}</span>
        <CalendarIcon size={14} className="text-slate-500" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 p-4 bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl w-64 right-0">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-700 rounded-lg text-white"><ChevronRight size={18} /></button>
            <span className="text-xs font-black text-blue-400">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-700 rounded-lg text-white"><ChevronLeft size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["ح", "ن", "ث", "ر", "خ", "ج", "س"].map(d => (
              <span key={d} className="text-[10px] text-slate-500 font-bold">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => {
              const day = i + 1;
              const isSelected = value === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toISOString().split('T')[0];
              return (
                <button 
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <button onClick={() => setIsOpen(false)} className="w-full mt-4 py-1 text-[9px] text-slate-500 hover:text-white font-black uppercase tracking-widest border-t border-slate-700 pt-2">إغلاق</button>
        </div>
      )}
    </div>
  );
};

export default function ReportsView({ syncUrl: initialSyncUrl, adminConfig }: ReportsViewProps) {
  const [localSyncUrl, setLocalSyncUrl] = useState(initialSyncUrl || localStorage.getItem('attendance_temp_sync_url') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [showUrlField, setShowUrlField] = useState(!initialSyncUrl);

  // فلاتر التاريخ والوظيفة
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]); // مصفوفة لاختيار متعدد

  const activeSyncUrl = localSyncUrl || initialSyncUrl;

  const fetchData = async (showLoading = true) => {
    if (!activeSyncUrl) {
      setError('يرجى إدخال رابط المزامنة الخاص بالشركة أولاً');
      setShowUrlField(true);
      return;
    }
    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    
    setError('');
    try {
      const response = await fetch(`${activeSyncUrl}?action=getReportData&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
      const data = await response.json();
      
      if (data.error) {
        setError('بيانات الدخول غير صحيحة أو ليس لديك صلاحيات لهذه الوظائف');
        if (showLoading) setIsLoggedIn(false);
      } else {
        setRecords(data);
        setIsLoggedIn(true);
        // تحقق إذا كان الداخل هو المسؤول
        if (adminConfig && username === adminConfig.adminUsername && password === adminConfig.adminPassword) {
           setIsAdminLogin(true);
        } else {
           setIsAdminLogin(false);
        }
        localStorage.setItem('attendance_temp_sync_url', activeSyncUrl);
        setShowUrlField(false);
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالسحابة. تأكد من صحة رابط المزامنة.');
      setShowUrlField(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(true);
  };

  const handleRefresh = () => {
    fetchData(false);
  };

  const availableJobs = useMemo(() => {
    const jobs = records.map(r => r.job);
    return Array.from(new Set(jobs)).filter(Boolean) as string[];
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!fromDate && !toDate && selectedJobs.length === 0) return records;
    
    return records.filter(r => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      
      let match = true;
      if (fromDate) {
        const f = new Date(fromDate);
        f.setHours(0, 0, 0, 0);
        match = match && recordDate >= f;
      }
      if (toDate) {
        const t = new Date(toDate);
        t.setHours(0, 0, 0, 0);
        match = match && recordDate <= t;
      }
      if (selectedJobs.length > 0) {
        match = match && selectedJobs.includes(r.job);
      }
      return match;
    });
  }, [records, fromDate, toDate, selectedJobs]);

  const toggleJobSelection = (job: string) => {
    setSelectedJobs(prev => 
      prev.includes(job) ? prev.filter(j => j !== job) : [...prev, job]
    );
  };

  const exportToExcel = () => {
    const dataToExport = filteredRecords.map(r => ({
      'التاريخ': new Date(r.date).toLocaleDateString('ar-EG'),
      'الوقت': new Date(r.time).toLocaleTimeString('ar-EG'),
      'اسم الموظف': r.name,
      'الرقم القومي': r.nationalId,
      'الوظيفة': r.job,
      'الفرع': r.branch,
      'الحالة': r.type === 'check-in' ? 'حضور' : 'انصراف',
      'الموقع GPS': r.gps
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `Report_${username}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center py-12 px-4">
        <div className="bg-slate-800 rounded-3xl p-8 w-full max-w-md border border-slate-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/20">
              <FileSpreadsheet size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Reports Access</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase mt-1">نظام متابعة التقارير والوظائف</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {showUrlField && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest flex items-center gap-1">
                  <LinkIcon size={12} /> رابط المزامنة (Sync URL)
                </label>
                <input 
                  type="text" 
                  placeholder="https://script.google.com/..."
                  className="w-full bg-slate-900 border border-slate-700 text-white px-5 py-3.5 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all text-xs"
                  value={localSyncUrl}
                  onChange={e => setLocalSyncUrl(e.target.value)}
                />
                {initialSyncUrl && (
                  <button 
                    type="button"
                    onClick={() => setShowUrlField(false)}
                    className="text-[9px] text-slate-500 hover:text-blue-400 font-bold mr-2 uppercase transition-colors"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">اسم المستخدم</label>
              <input 
                type="text" 
                className="w-full bg-slate-900 border border-slate-700 text-white px-5 py-3.5 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-widest">كلمة المرور</label>
              <input 
                type="password" 
                className="w-full bg-slate-900 border border-slate-700 text-white px-5 py-3.5 rounded-2xl font-bold outline-none focus:border-blue-500 transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400 text-[10px] font-bold flex gap-2 items-center">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <button 
              disabled={isLoading}
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              دخول واستعراض التقارير
            </button>
            
            {!showUrlField && initialSyncUrl && (
               <button 
                 type="button" 
                 onClick={() => setShowUrlField(true)}
                 className="w-full text-slate-500 text-[10px] font-black py-2 uppercase hover:text-slate-300 transition-colors"
               >
                 تغيير رابط الشركة
               </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div className="text-right w-full md:w-auto">
          <h2 className="text-xl font-black text-blue-400 flex items-center gap-2">
            {isAdminLogin ? <ShieldCheck size={24} className="text-orange-400" /> : <Table size={24} />} 
            متابعة التقارير والوظائف {isAdminLogin && <span className="text-[10px] text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-lg border border-orange-400/20 mr-2">Admin Mode</span>}
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase">المسؤول: {username}</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-blue-400 border border-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-700 transition-all"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> تحديث البيانات
          </button>
          <button 
            onClick={() => setIsLoggedIn(false)} 
            className="px-4 py-2 bg-slate-900/50 text-slate-400 border border-slate-700/50 rounded-xl text-[10px] font-black hover:text-red-400"
          >
            خروج
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-xs shadow-xl transition-all"
          >
            <Download size={16} /> تحميل Excel
          </button>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-lg space-y-4">
        <h3 className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest text-right">
           <Filter size={14} /> تصفية السجلات قبل التحميل
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CustomDatePicker label="من تاريخ" value={fromDate} onChange={setFromDate} placeholder="اختر البداية" />
          <CustomDatePicker label="إلى تاريخ" value={toDate} onChange={setToDate} placeholder="اختر النهاية" />

          <div className="space-y-1 text-right lg:col-span-2">
            <label className="text-[9px] font-black text-slate-500 mr-2 uppercase tracking-widest">تصفية بالوظائف (اختيار متعدد)</label>
            <div className="flex flex-wrap gap-2 p-3 bg-slate-900 border border-slate-700 rounded-2xl min-h-[48px] shadow-inner">
              {availableJobs.map(job => (
                <button
                  key={job}
                  onClick={() => toggleJobSelection(job)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 border ${
                    selectedJobs.includes(job) 
                      ? 'bg-blue-600 text-white border-blue-500 shadow-lg' 
                      : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {selectedJobs.includes(job) && <Check size={12} />}
                  {job}
                </button>
              ))}
              {availableJobs.length === 0 && <span className="text-[10px] text-slate-600 font-bold italic py-1">لا توجد وظائف متاحة حالياً</span>}
            </div>
          </div>
          
          <div className="lg:col-start-4">
             <button 
               onClick={() => { setFromDate(''); setToDate(''); setSelectedJobs([]); }}
               className="w-full px-6 py-3.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-[10px] font-black uppercase transition-all flex justify-center items-center gap-2 shadow-lg"
             >
               <X size={14} /> مسح جميع الفلاتر
             </button>
          </div>
        </div>
      </div>

      <div className="p-10 text-center bg-slate-900/30 rounded-3xl border border-dashed border-slate-700">
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">
          تم إخفاء عرض الجدول المباشر. يمكنك استخدام الفلاتر أعلاه ثم الضغط على "تحميل Excel" لاستخراج التقارير.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="text-[10px] text-blue-500 font-bold uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            عدد السجلات المفلترة حالياً: {filteredRecords.length}
          </div>
          {selectedJobs.length > 0 && (
            <div className="text-[9px] text-slate-600 font-bold uppercase">
              وظائف مختارة: {selectedJobs.join('، ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
