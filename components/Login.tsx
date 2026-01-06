
import React, { useState } from 'react';
import { User, AppConfig, Job } from '../types';
import { UserPlus, LogIn, ShieldAlert, Briefcase, Loader2, Link as LinkIcon, Smartphone, AlertCircle } from 'lucide-react';
import { getDeviceFingerprint } from '../utils';

interface LoginProps {
  onLogin: (user: User) => void;
  allUsers: User[];
  adminConfig: AppConfig;
  availableJobs: Job[];
  setAdminConfig: (cfg: Partial<AppConfig>) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, allUsers, adminConfig, availableJobs, setAdminConfig }) => {
  const [mode, setMode] = useState<'register' | 'login' | 'admin' | 'connect'>(adminConfig.syncUrl ? 'login' : 'connect');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [syncUrlInput, setSyncUrlInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncUrlInput.startsWith('http')) {
      setError('يرجى إدخل رابط صحيح يبدأ بـ https://');
      return;
    }
    setAdminConfig({ syncUrl: syncUrlInput, googleSheetLink: syncUrlInput });
    setMode('register');
    setError('');
  };

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
    
    const deviceId = getDeviceFingerprint();

    const existingById = allUsers.find(u => u.nationalId === nationalId);
    if (existingById) {
      setError('عذراً، هذا الرقم القومي مسجل مسبقاً في النظام. يرجى تسجيل الدخول.');
      return;
    }

    const existingByDevice = allUsers.find(u => u.deviceId === deviceId);
    if (existingByDevice) {
      setError('عذراً، هذا الهاتف مسجل عليه موظف آخر بالفعل (تعدد الحسابات مرفوض).');
      return;
    }

    setIsLoading(true);
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      fullName,
      nationalId,
      password,
      role: 'employee',
      deviceId: deviceId,
      jobTitle: selectedJob
    };

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
    // البحث عن المستخدم مع التأكد من مطابقة كلمة المرور المحفوظة في السحابة
    const user = allUsers.find(u => u.nationalId === nationalId && u.password === password);
    
    if (user) {
      const currentDeviceId = getDeviceFingerprint();
      
      if (user.deviceId) {
        if (user.deviceId !== currentDeviceId) {
          setError('عذراً، هذا الحساب مربوط بهاتف آخر. لا يمكن الدخول إلا من الهاتف المسجل به أول مرة.');
          return;
        }
      } else {
        user.deviceId = currentDeviceId;
      }
      
      onLogin(user);
    } else {
      setError('بيانات الدخول غير صحيحة، تأكد من الرقم القومي وكلمة المرور');
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
    <div className="min-h-full flex items-center justify-center p-0">
      <div className="bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
        <div className="bg-blue-600 p-8 text-white text-center">
          <h2 className="text-4xl font-black mb-1 italic tracking-tighter uppercase">Uniteam</h2>
          <p className="text-blue-100 text-[10px] font-bold tracking-widest uppercase">
            {mode === 'connect' ? 'Company Connection' : 'System Access'}
          </p>
        </div>

        <div className="p-8">
          {adminConfig.syncUrl ? (
            <div className="flex bg-slate-900/50 p-1 rounded-2xl mb-8 border border-slate-700">
              {['login', 'register', 'admin'].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m as any); setError(''); }}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all ${mode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {m === 'login' ? 'دخول' : m === 'register' ? 'تسجيل جديد' : 'إدارة'}
                </button>
              ))}
            </div>
          ) : mode !== 'admin' && (
            <div className="mb-8 p-4 bg-orange-900/20 border-r-4 border-orange-500 rounded-xl">
              <p className="text-orange-400 text-xs font-bold leading-relaxed">
                التطبيق غير مرتبط بشركة حالياً. يرجى إدخال "رابط المزامنة" من المسؤول للبدء.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border-r-4 border-red-500 text-red-400 text-xs font-bold flex gap-2 items-start">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'connect' && (
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-black mr-2 uppercase">رابط الشركة (Sync URL)</label>
                <input type="text" placeholder="https://script.google.com/..." value={syncUrlInput} onChange={e => setSyncUrlInput(e.target.value)} className={inputClasses} />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all">
                <LinkIcon size={20} /> ربط التطبيق بالشركة
              </button>
              <button type="button" onClick={() => setMode('admin')} className="w-full text-slate-500 text-[10px] font-black py-2">أنا مسؤول النظام</button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="flex items-center gap-2 mb-2 p-3 bg-blue-900/20 rounded-xl border border-blue-800/50">
                <Smartphone size={16} className="text-blue-400" />
                <span className="text-[9px] text-blue-300 font-bold">سيتم ربط حسابك بهذا الهاتف تلقائياً ولن يعمل على غيره</span>
              </div>
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
                {isLoading ? 'جاري التحقق...' : 'تسجيل وربط الجهاز'}
              </button>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
              <input 
                type="text" 
                placeholder="الرقم القومي (14 رقم)" 
                maxLength={14} 
                value={nationalId} 
                onChange={e => setNationalId(e.target.value.replace(/\D/g, ''))} 
                className={inputClasses} 
              />
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
              {adminConfig.syncUrl ? (
                 <button type="button" onClick={() => setMode('login')} className="w-full text-slate-500 text-[10px] font-black py-2">العودة للدخول</button>
              ) : (
                 <button type="button" onClick={() => setMode('connect')} className="w-full text-slate-500 text-[10px] font-black py-2">العودة للربط</button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
