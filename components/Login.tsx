
import React, { useState } from 'react';
import { User, AppConfig, Job } from '../types';
import { UserPlus, LogIn, ShieldAlert, Key, Smartphone, Briefcase, Loader2 } from 'lucide-react';
import { getDeviceFingerprint } from '../utils';

interface LoginProps {
  onLogin: (user: User) => void;
  allUsers: User[];
  adminConfig: AppConfig;
  availableJobs: Job[];
}

const Login: React.FC<LoginProps> = ({ onLogin, allUsers, adminConfig, availableJobs }) => {
  const [mode, setMode] = useState<'register' | 'login' | 'admin'>('register');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !nationalId || !password || !selectedJob) {
      setError('يرجى إكمال جميع البيانات واختيار الوظيفة');
      return;
    }
    if (nationalId.length !== 14) {
      setError('الرقم القومي يجب أن يكون 14 رقماً');
      return;
    }
    
    const existing = allUsers.find(u => u.nationalId === nationalId);
    if (existing) {
      setError('هذا الرقم القومي مسجل مسبقاً، يرجى تسجيل الدخول');
      return;
    }

    setIsLoading(true);
    const deviceId = getDeviceFingerprint();
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      fullName,
      nationalId,
      password,
      role: 'employee',
      deviceId: deviceId,
      jobTitle: selectedJob
    };

    // رفع البيانات الشخصية للسحابة فوراً لضمان عدم التلاعب
    if (adminConfig.googleSheetLink) {
      try {
        await fetch(adminConfig.googleSheetLink, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'registerUser',
            ...newUser,
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error("Cloud registration failed", err);
      }
    }

    setIsLoading(false);
    onLogin(newUser);
  };

  const handleEmployeeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = allUsers.find(u => u.nationalId === nationalId && u.password === password);
    
    if (user) {
      const currentDeviceId = getDeviceFingerprint();
      if (user.deviceId && user.deviceId !== currentDeviceId) {
        setError('عذراً، هذا الحساب مربوط بجهاز آخر. يرجى مراجعة المسؤول.');
        return;
      }
      onLogin(user);
    } else {
      setError('بيانات الدخول غير صحيحة');
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUsername === adminConfig.adminUsername && adminPassword === adminConfig.adminPassword) {
      onLogin({ id: 'admin-id', fullName: 'المسؤول', nationalId: '000', role: 'admin' });
    } else {
      setError('بيانات المسؤول غير صحيحة');
    }
  };

  const inputClasses = "w-full px-4 py-3.5 rounded-2xl border border-slate-600 bg-slate-900 text-white placeholder:text-slate-500 font-bold outline-none focus:border-blue-500 transition-all shadow-inner";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gray-50">
      <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h2 className="text-4xl font-black mb-1 italic tracking-tighter uppercase">Uniteam</h2>
          <p className="text-blue-100 text-[10px] font-bold tracking-widest uppercase">System Registration</p>
        </div>

        <div className="p-8">
          <div className="flex bg-slate-900/50 p-1 rounded-2xl mb-8 border border-slate-700">
            {['register', 'login', 'admin'].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m as any); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${mode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {m === 'register' ? 'تسجيل موظف' : m === 'login' ? 'دخول' : 'إدارة'}
              </button>
            ))}
          </div>

          {error && <div className="mb-6 p-4 bg-red-900/20 border-r-4 border-red-500 text-red-400 text-xs font-bold">{error}</div>}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <input type="text" placeholder="الاسم الرباعي" value={fullName} onChange={e => setFullName(e.target.value)} className={inputClasses} />
              <input type="text" placeholder="الرقم القومي (14 رقم)" maxLength={14} value={nationalId} onChange={e => setNationalId(e.target.value)} className={inputClasses} />
              <div className="relative">
                <select 
                  value={selectedJob} 
                  onChange={e => setSelectedJob(e.target.value)}
                  className={`${inputClasses} appearance-none cursor-pointer`}
                >
                  <option value="" className="bg-slate-900">-- اختر الوظيفة --</option>
                  {availableJobs.map(job => <option key={job.id} value={job.title} className="bg-slate-900">{job.title}</option>)}
                </select>
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
              <input type="password" placeholder="تعيين كلمة مرور" value={password} onChange={e => setPassword(e.target.value)} className={inputClasses} />
              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />} 
                {isLoading ? 'جاري الحفظ سحابياً...' : 'إنشاء حساب وربط الهاتف'}
              </button>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
              <input type="text" placeholder="الرقم القومي" value={nationalId} onChange={e => setNationalId(e.target.value)} className={inputClasses} />
              <input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className={inputClasses} />
              <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all">
                <LogIn size={20} /> دخول الموظف
              </button>
            </form>
          )}

          {mode === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <input type="text" placeholder="اسم مستخدم المسؤول" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} className={inputClasses} />
              <input type="password" placeholder="كلمة مرور المسؤول" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className={inputClasses} />
              <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all border border-slate-500">
                <ShieldAlert size={20} /> دخول لوحة التحكم
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
