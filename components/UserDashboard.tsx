
import React, { useState, useEffect } from 'react';
import { User, Branch, AttendanceRecord } from '../types';
import { MapPin, Clock, CheckCircle, Navigation, AlertCircle, History, RotateCcw } from 'lucide-react';
import { calculateDistance, formatDate } from '../utils';

interface UserDashboardProps {
  user: User;
  branches: Branch[];
  records: AttendanceRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  googleSheetLink?: string;
  onRefresh?: () => void;
  isSyncing?: boolean;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, branches, records, setRecords, googleSheetLink, onRefresh, isSyncing }) => {
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'none', msg: string }>({ type: 'none', msg: '' });

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGeolocation = () => {
    setIsVerifying(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsVerifying(false);
      },
      () => {
        setLocationError('يرجى تفعيل الموقع الجغرافي');
        setIsVerifying(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    if (!selectedBranchId || !currentLocation) {
      setStatus({ type: 'error', msg: 'يرجى اختيار الفرع وتفعيل الموقع أولاً' });
      return;
    }

    const branch = branches.find(b => b.id === selectedBranchId);
    if (!branch) return;

    const distance = calculateDistance(currentLocation.lat, currentLocation.lng, branch.latitude, branch.longitude);

    if (distance > branch.radius) {
      setStatus({ 
        type: 'error', 
        msg: `فشل التسجيل: أنت على بعد ${Math.round(distance)} متر من الفرع. المسموح هو ${branch.radius}م.` 
      });
      return;
    }

    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.fullName,
      userJob: user.jobTitle,
      branchId: branch.id,
      branchName: branch.name,
      type,
      timestamp: new Date().toISOString(),
      latitude: currentLocation.lat,
      longitude: currentLocation.lng
    };

    setRecords(prev => [...prev, newRecord]);
    setStatus({ type: 'success', msg: `تم تسجيل ${type === 'check-in' ? 'الحضور' : 'الانصراف'} بنجاح.` });

    if (googleSheetLink) {
      try {
        await fetch(googleSheetLink, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'saveAttendance',
            ...newRecord, 
            nationalId: user.nationalId 
          })
        });
      } catch (err) { console.error(err); }
    }
  };

  const myRecords = records.filter(r => r.userId === user.id).slice(-5).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-800 rounded-3xl shadow-xl border border-slate-700 p-8 text-white relative overflow-hidden">
          <button 
            onClick={onRefresh}
            disabled={isSyncing}
            className="absolute left-6 top-6 p-2 bg-slate-900 rounded-full border border-slate-700 text-slate-400 hover:text-blue-400 transition-colors"
            title="تحديث البيانات من الإدارة"
          >
            <RotateCcw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </button>

          <div className="text-center mb-8">
             <h2 className="text-3xl font-black text-white mb-2">مرحباً، {user.fullName}</h2>
             <div className="bg-blue-900/40 px-6 py-2 rounded-2xl text-blue-400 border border-blue-800/50 font-black text-xs inline-block">
               {user.jobTitle}
             </div>
             
             <div className="text-5xl font-black text-white mt-8 mb-2 tracking-tighter">
                {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
             </div>
             <div className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                {currentTime.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
             </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 mr-2 uppercase tracking-tighter">اختر مكان العمل</label>
              <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white px-6 py-4 rounded-2xl font-bold outline-none cursor-pointer appearance-none">
                <option value="">-- اختر الفرع للتسجيل --</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation size={20} className={isVerifying ? 'animate-spin text-blue-400' : 'text-blue-500'} />
                <span className={`text-xs font-bold ${currentLocation ? 'text-green-400' : 'text-slate-400'}`}>{currentLocation ? 'الموقع مفعل' : 'الموقع غير محدد'}</span>
              </div>
              <button onClick={getGeolocation} className="px-3 py-1.5 bg-slate-700 text-white rounded-lg font-black text-[10px] uppercase">تحديث الموقع</button>
            </div>

            {status.type !== 'none' && (
              <div className={`p-4 rounded-xl text-xs font-black border flex items-center gap-2 ${status.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-800' : 'bg-red-900/20 text-red-400 border-red-800'}`}>
                {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                {status.msg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleAttendance('check-in')} className="py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">حضور</button>
              <button onClick={() => handleAttendance('check-out')} className="py-6 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">انصراف</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl text-white">
        <h3 className="font-black mb-6 border-b border-slate-700 pb-4 flex items-center gap-2 text-blue-400 text-sm italic">سجل اليوم</h3>
        <div className="space-y-4">
          {myRecords.map(r => (
            <div key={r.id} className="p-3 bg-slate-900 rounded-xl border border-slate-700">
              <div className="flex justify-between font-black text-[10px] mb-1">
                <span>{r.branchName}</span>
                <span className={r.type === 'check-in' ? 'text-green-400' : 'text-orange-400'}>{r.type === 'check-in' ? 'حضور' : 'انصراف'}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">{new Date(r.timestamp).toLocaleTimeString('ar-EG')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
