
export interface Branch {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface Job {
  id: string;
  title: string;
}

export interface User {
  id: string;
  fullName: string;
  nationalId: string;
  password?: string;
  employeeId?: string;
  role: 'employee' | 'admin';
  deviceId?: string;
  jobTitle?: string;
  defaultBranchId?: string; // سيحتوي على اسم الفرع للعرض أو الـ ID للمطابقة
  registrationDate?: string; // تاريخ التسجيل لأول مرة
  checkInTime?: string; // وقت الحضور الافتراضي (HH:mm)
  checkOutTime?: string; // وقت الانصراف الافتراضي (HH:mm)
}

export interface ReportAccount {
  id: string;
  username: string;
  password?: string;
  allowedJobs: string[]; // قائمة عناوين الوظائف المسموح بها
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userJob?: string;
  branchId: string;
  branchName: string;
  type: 'check-in' | 'check-out';
  timestamp: string;
  latitude: number;
  longitude: number;
  reason?: string; // سبب التأخير أو الانصراف المبكر
  timeDiff?: string; // الفرق بين الوقت الفعلي والافتراضي
}

export interface AppConfig {
  googleSheetLink: string;
  syncUrl: string;
  adminUsername: string;
  adminPassword?: string;
  lastUpdated?: string;
}
