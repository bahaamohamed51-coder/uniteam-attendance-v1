
import React, { useState, useEffect } from 'react';
import { User, Branch, AttendanceRecord } from '../types';
import { MapPin, Clock, CheckCircle, Navigation, AlertCircle, RotateCcw, Cloud } from 'lucide-react';
import { calculateDistance } from '../utils';

interface UserDashboardProps {
  user: User;
  branches: Branch[];
  records: AttendanceRecord[];
  setRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  googleSheetLink?: string;
  onRefresh?: () => void;
  isSyncing?: boolean;
  lastUpdated?: string;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ 
  user, 
  branches, 
  records, 
  setRecords, 
  googleSheetLink, 
  onRefresh, 
  isSyncing, 
  lastUpdated 
}) => {
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
        setLocationError('يرجى تفعيل GPS');
        setIsVerifying(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleAttendance = async (type: 'check-in' | 'check-out') => {
    if (!selectedBranchId || !currentLocation) {
      setStatus({ type: 'error', msg: 'اختر الفرع وفعل الموقع أولاً' });
      return;
    }

    const branch = branches.find(b => b.id === selectedBranchId);
    if (!branch) return;

    const distance = calculateDistance(currentLocation.lat, currentLocation.lng, branch.latitude, branch.longitude);

    if (distance > branch.radius) {
      setStatus({ 
        type: 'error', 
        msg: `بعيد عن الفرع بمسافة ${Math.round(distance)}م. الحد المسموح ${branch.radius}م.` 
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
          <div className="absolute left-6 top-6 flex flex-col items-end gap-2">
            <button 
              onClick={onRefresh}
              disabled={isSyncing}
              className="p-2.5 bg-slate-900 rounded-xl border border-slate-700 text-slate-400 hover:text-blue-400 transition-all shadow-lg active:scale-95"
              title="تحديث البيانات من السحابة"
            >
              <RotateCcw size={20} className={isSyncing ? 'animate-spin text-blue-400' : ''} />
            </button>
            {lastUpdated && (
              <div className="flex items-center gap-1 text-[8px] font-black text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 uppercase">
                <Cloud size={8} /> محدث: {new Date(lastUpdated).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          <div className="text-center mb-8 pt-4">
             <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">أهلاً، {user.fullName.split(' ')[0]}</h2>
             <div className="bg-blue-900/30 px-5 py-1.5 rounded-xl text-blue-400 border border-blue-800/40 font-black text-[10px] inline-block uppercase tracking-widest">
               {user.jobTitle || 'موظف'}
             </div>
             
             <div className="text-6xl font-black text-white mt-10 mb-2 tracking-tighter drop-shadow-2xl">
                {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
             </div>
             <div className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                {currentTime.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
             </div>
          </div>

          <div className="space-y-6 max-w-md mx-auto">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 mr-2 uppercase tracking-tighter">اختر موقع العمل الحالي</label>
              <div className="relative">
                <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white px-6 py-4 rounded-2xl font-bold outline-none cursor-pointer appearance-none shadow-inner focus:border-blue-500 transition-all">
                  <option value="">-- اختر الفرع للتسجيل --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentLocation ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Navigation size={18} className={isVerifying ? 'animate-spin' : ''} />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${currentLocation ? 'text-green-400' : 'text-slate-500'}`}>
                  {currentLocation ? 'الموقع الجغرافي مفعل' : 'يرجى تحديد الموقع'}
                </span>
              </div>
              <button onClick={getGeolocation} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-black text-[10px] uppercase transition-all active:scale-95 shadow-lg">تحديث</button>
            </div>

            {status.type !== 'none' && (
              <div className={`p-4 rounded-2xl text-[10px] font-black border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-900/20 text-green-400 border-green-800/50' : 'bg-red-900/20 text-red-400 border-red-800/50'}`}>
                {status.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                {status.msg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleAttendance('check-in')} className="py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 active:scale-95 transition-all">حضور</button>
              <button onClick={() => handleAttendance('check-out')} className="py-6 bg-slate-700 hover:bg-slate-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 active:scale-95 transition-all border border-slate-600">انصراف</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl text-white">
        <h3 className="font-black mb-6 border-b border-slate-700 pb-4 flex items-center gap-2 text-blue-400 text-[10px] uppercase tracking-widest">السجل الأخير</h3>
        <div className="space-y-4">
          {myRecords.length === 0 ? (
            <div className="text-center py-10 opacity-20"><Clock size={40} className="mx-auto" /></div>
          ) : (
            myRecords.map(r => (
              <div key={r.id} className="p-4 bg-slate-900 rounded-2xl border border-slate-700/50 group hover:border-blue-500 transition-all">
                <div className="flex justify-between font-black text-[10px] mb-1 uppercase tracking-tighter">
                  <span className="text-slate-300">{r.branchName}</span>
                  <span className={r.type === 'check-in' ? 'text-green-400' : 'text-orange-400'}>{r.type === 'check-in' ? 'حضور' : 'انصراف'}</span>
                </div>
                <div className="text-[9px] text-slate-500 font-bold">{new Date(r.timestamp).toLocaleTimeString('ar-EG')}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
