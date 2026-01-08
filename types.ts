
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
  defaultBranchId?: string; // الفرع الافتراضي الذي اختاره الموظف عند التسجيل
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
}

export interface AppConfig {
  googleSheetLink: string;
  syncUrl: string;
  adminUsername: string;
  adminPassword?: string;
  lastUpdated?: string;
}
