
import React, { useState, useMemo, useEffect } from 'react';
import { FileSpreadsheet, Download, LogIn, Loader2, Table, Calendar as CalendarIcon, MapPin, User as UserIcon, Briefcase, Filter, RefreshCw, ChevronRight, ChevronLeft, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsViewProps {
  syncUrl: string;
}

// مكون التقويم المدمج
const CustomDatePicker: React.FC<{ 
  label: string, 
  value: string, 
  onChange: (val: string) => void,
  placeholder: string
}> = ({ label, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateClick = (day: number) => {
    const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    // تصحيح التوقيت للمنطقة الزمنية
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
    <div className="relative space-y-1 w-full">
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

const ReportsView: React.FC<ReportsViewProps> = ({ syncUrl }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState('');

  // فلاتر التاريخ والوظيفة
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedJob, setSelectedJob] = useState('');

  const fetchData = async (showLoading = true) => {
    if (!username || !password) return;
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    
    setError('');
    try {
      const response = await fetch(`${syncUrl}?action=getReportData&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
      const data = await response.json();
      
      if (data.error) {
        setError('بيانات الدخول غير صحيحة أو ليس لديك صلاحيات');
        if (showLoading) setIsLoggedIn(false);
      } else {
        setRecords(data);
        setIsLoggedIn(true);
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالسحابة');
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

  // استخراج الوظائف الفريدة من السجلات المتاحة
  const availableJobs = useMemo(() => {
    const jobs = records.map(r => r.job);
    return Array.from(new Set(jobs)).filter(Boolean) as string[];
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!fromDate && !toDate && !selectedJob) return records;
    
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
      if (selectedJob) {
        match = match && r.job === selectedJob;
      }
      return match;
    });
  }, [records, fromDate, toDate, selectedJob]);

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
    XLSX.writeFile(wb, `Report_${username}_${selectedJob ? selectedJob + '_' : ''}${new Date().toLocaleDateString()}.xlsx`);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="bg-slate-800 rounded-3xl p-8 w-full max-w-md border border-slate-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/20">
              <FileSpreadsheet size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">تقارير الوظائف</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase mt-1">سجل الدخول لاستعراض البيانات</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
            {error && <p className="text-red-400 text-[10px] font-bold text-center px-2">{error}</p>}
            <button 
              disabled={isLoading}
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
              دخول النظام
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-xl">
        <div className="text-white">
          <h2 className="text-xl font-black text-blue-400 flex items-center gap-2">
            <Table size={24} /> تقرير بيانات الموظفين
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase">مرحباً {username}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {/* شريط الفلاتر */}
      <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-lg space-y-4">
        <h3 className="text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
           <Filter size={14} /> تصفية السجل المتقدمة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <CustomDatePicker 
            label="من تاريخ" 
            value={fromDate} 
            onChange={setFromDate} 
            placeholder="اختر البداية" 
          />
          
          <CustomDatePicker 
            label="إلى تاريخ" 
            value={toDate} 
            onChange={setToDate} 
            placeholder="اختر النهاية" 
          />

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-500 mr-2 uppercase">الوظيفة</label>
            <div className="relative">
              <select 
                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500 appearance-none cursor-pointer"
                value={selectedJob}
                onChange={e => setSelectedJob(e.target.value)}
              >
                <option value="">كل الوظائف المتاحة</option>
                {availableJobs.map(job => (
                  <option key={job} value={job}>{job}</option>
                ))}
              </select>
              <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-end">
             <button 
               onClick={() => { setFromDate(''); setToDate(''); setSelectedJob(''); }}
               className="w-full px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-[10px] font-black uppercase transition-all flex justify-center items-center gap-2"
             >
               <X size={14} /> مسح الفلاتر
             </button>
          </div>
        </div>
      </div>
      
      {/* تم إزالة جدول عرض البيانات بناءً على طلب المستخدم لإظهار الفلاتر فقط */}
    </div>
  );
};

export default ReportsView;
