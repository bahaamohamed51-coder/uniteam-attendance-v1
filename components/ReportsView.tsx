
import React, { useState } from 'react';
import { FileSpreadsheet, Download, LogIn, Loader2, Table, Calendar, MapPin, User as UserIcon, Briefcase } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsViewProps {
  syncUrl: string;
}

const ReportsView: React.FC<ReportsViewProps> = ({ syncUrl }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${syncUrl}?action=getReportData&user=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}`);
      const data = await response.json();
      
      if (data.error) {
        setError('بيانات الدخول غير صحيحة أو ليس لديك صلاحيات');
      } else {
        setRecords(data);
        setIsLoggedIn(true);
      }
    } catch (err) {
      setError('حدث خطأ أثناء الاتصال بالسحابة');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = records.map(r => ({
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
    XLSX.writeFile(wb, `Report_${username}_${new Date().toLocaleDateString()}.xlsx`);
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
          <p className="text-slate-500 text-[10px] font-black uppercase">مرحباً {username} | البيانات مفلترة حسب صلاحياتك</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsLoggedIn(false)} 
            className="px-4 py-2 bg-slate-900 text-slate-400 border border-slate-700 rounded-xl text-[10px] font-black"
          >
            تسجيل الخروج
          </button>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-black text-xs shadow-xl transition-all"
          >
            <Download size={16} /> تحميل ملف Excel
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right min-w-[800px]">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <th className="py-5 px-4">الموظف</th>
                <th className="py-5 px-4">الوظيفة</th>
                <th className="py-5 px-4">الفرع</th>
                <th className="py-5 px-4 text-center">الحالة</th>
                <th className="py-5 px-4">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500 font-bold">لا توجد بيانات مسجلة لهذه الوظائف حالياً</td>
                </tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-700 p-2 rounded-lg text-blue-400"><UserIcon size={14} /></div>
                        <div>
                          <div className="text-white font-bold text-sm">{r.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{r.nationalId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-blue-400 font-black text-[10px]">
                        <Briefcase size={12} /> {r.job}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-slate-300 font-bold text-[10px]">
                        <MapPin size={12} className="text-slate-500" /> {r.branch}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`mx-auto w-fit px-3 py-1 rounded-full text-[9px] font-black border ${r.type === 'check-in' ? 'bg-green-600/10 text-green-400 border-green-900/30' : 'bg-orange-600/10 text-orange-400 border-orange-900/30'}`}>
                        {r.type === 'check-in' ? 'حضور' : 'انصراف'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col items-end">
                        <div className="text-white font-mono text-xs">{new Date(r.time).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'})}</div>
                        <div className="text-[9px] text-slate-500 font-bold flex items-center gap-1"><Calendar size={10} /> {new Date(r.date).toLocaleDateString('ar-EG')}</div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
