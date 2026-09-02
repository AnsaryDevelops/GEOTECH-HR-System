// Application data layer — requests, notifications, employees, leave types.
// In production, replace with API calls and a real database.

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RequestType = "LEAVE" | "MISSION";
export type UserRole = "EMPLOYEE" | "MANAGER" | "HR";

// ─── Leave Types ───────────────────────────────────────────────────────────────

export interface LeaveTypeRecord {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
}

export const DEFAULT_LEAVE_TYPES: LeaveTypeRecord[] = [
  { id: "lt-1", name: "Annual Leave", status: "ACTIVE" },
  { id: "lt-2", name: "Sick Leave", status: "ACTIVE" },
  { id: "lt-3", name: "Emergency Leave", status: "ACTIVE" },
  { id: "lt-4", name: "Maternity Leave", status: "ACTIVE" },
  { id: "lt-5", name: "Paternity Leave", status: "ACTIVE" },
  { id: "lt-6", name: "Unpaid Leave", status: "ACTIVE" },
];

// ─── Employee Profiles ────────────────────────────────────────────────────────
// Single source of truth. managerId drives My Team, request routing, and approval.

export interface EmployeeProfile {
  id: string;
  name: string;       // "Jordan Lee" — canonical display name
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  status: "ACTIVE" | "INACTIVE";
  managerId: string | null;
  role: UserRole;
  annualLeaveAllocation?: number;
}

export function empName(e: EmployeeProfile): string {
  return e.name;
}

export const DEPARTMENTS = [
  "IT",
  "Human Resources",
  "Finance",
  "Operations",
  "Sales",
  "Marketing",
] as const;
export type Department = (typeof DEPARTMENTS)[number];

export const DEFAULT_EMPLOYEES: EmployeeProfile[] = [
  { id: "EMP-00001", name: "Alex Morgan", firstName: "Alex", lastName: "Morgan", position: "Product Designer", department: "IT", email: "alex.morgan@company.com", phone: "+20 10 0000 0001", status: "ACTIVE", managerId: "EMP-00002", role: "EMPLOYEE", annualLeaveAllocation: 21 },
  { id: "EMP-00002", name: "Jordan Lee", firstName: "Jordan", lastName: "Lee", position: "Engineering Manager", department: "IT", email: "jordan.lee@company.com", phone: "+20 10 0000 0002", status: "ACTIVE", managerId: null, role: "MANAGER", annualLeaveAllocation: 21 },
  { id: "EMP-00003", name: "Riley Chen", firstName: "Riley", lastName: "Chen", position: "HR Specialist", department: "Human Resources", email: "riley.chen@company.com", phone: "+20 10 0000 0003", status: "ACTIVE", managerId: null, role: "HR", annualLeaveAllocation: 21 },
  { id: "EMP-00004", name: "Nour Khalil", firstName: "Nour", lastName: "Khalil", position: "Frontend Developer", department: "IT", email: "nour.khalil@company.com", phone: "+20 10 0000 0004", status: "ACTIVE", managerId: "EMP-00002", role: "EMPLOYEE", annualLeaveAllocation: 21 },
  { id: "EMP-00005", name: "Sami Hadid", firstName: "Sami", lastName: "Hadid", position: "Backend Developer", department: "IT", email: "sami.hadid@company.com", phone: "+20 10 0000 0005", status: "ACTIVE", managerId: "EMP-00002", role: "EMPLOYEE", annualLeaveAllocation: 21 },
  { id: "EMP-00006", name: "Sara Mohamed", firstName: "Sara", lastName: "Mohamed", position: "Operations Manager", department: "Operations", email: "sara.mohamed@company.com", phone: "+20 10 0000 0006", status: "ACTIVE", managerId: null, role: "MANAGER", annualLeaveAllocation: 21 },
  { id: "EMP-00007", name: "Omar Hassan", firstName: "Omar", lastName: "Hassan", position: "Operations Analyst", department: "Operations", email: "omar.hassan@company.com", phone: "+20 10 0000 0007", status: "ACTIVE", managerId: "EMP-00006", role: "EMPLOYEE", annualLeaveAllocation: 21 },
  { id: "EMP-INACTIVE", name: "Sam Park", firstName: "Sam", lastName: "Park", position: "QA Engineer", department: "IT", email: "sam.park@company.com", status: "INACTIVE", managerId: "EMP-00002", role: "EMPLOYEE", annualLeaveAllocation: 21 },
];

// Security: managerId always comes from session, never from client input.
export function getTeamForManager(employees: EmployeeProfile[], managerId: string): EmployeeProfile[] {
  return employees.filter((e) => e.managerId === managerId);
}

export function getManagerForEmployee(
  employees: EmployeeProfile[],
  employeeId: string
): EmployeeProfile | null {
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp?.managerId) return null;
  return employees.find((e) => e.id === emp.managerId) ?? null;
}

export function getEligibleManagers(employees: EmployeeProfile[], excludeId?: string): EmployeeProfile[] {
  return employees.filter(
    (e) => e.role === "MANAGER" && e.status === "ACTIVE" && e.id !== excludeId
  );
}

// ─── Request Records ──────────────────────────────────────────────────────────

export interface RequestRecord {
  id: string;
  requestNumber: string;
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName: string;
  type: RequestType;
  status: RequestStatus;
  submittedAt: string; // ISO
  leaveType?: string;  // stored string (leave type name at time of request)
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;
  reason?: string;
  startTime?: string;  // HH:MM
  endTime?: string;
  location?: string;
  purpose?: string;
  decidedAt?: string;
  decisionComment?: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: "REQUEST_SUBMITTED" | "REQUEST_APPROVED" | "REQUEST_REJECTED";
  requestId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Store Data ───────────────────────────────────────────────────────────────

export interface StoreData {
  requests: RequestRecord[];
  notifications: NotificationRecord[];
  employees: EmployeeProfile[];
  leaveTypes: LeaveTypeRecord[];
  nextSeq: number;
  nextEmpSeq: number;
  nextLeaveTypeSeq: number;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORE_KEY = "hr_portal_store_v2";

export function loadStore(): StoreData {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as StoreData;
      if (!data.employees) data.employees = DEFAULT_EMPLOYEES;
      if (!data.leaveTypes) data.leaveTypes = DEFAULT_LEAVE_TYPES;
      if (!data.nextEmpSeq) data.nextEmpSeq = 9;
      if (!data.nextLeaveTypeSeq) data.nextLeaveTypeSeq = 7;
      return data;
    }
  } catch {}
  return {
    requests: [],
    notifications: [],
    employees: DEFAULT_EMPLOYEES,
    leaveTypes: DEFAULT_LEAVE_TYPES,
    nextSeq: 1,
    nextEmpSeq: 9,
    nextLeaveTypeSeq: 7,
  };
}

export function saveStore(data: StoreData): void {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Employee creation validation ─────────────────────────────────────────────

export function calculateWorkingLeaveDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    if (day >= 0 && day <= 4) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function validateEmployeeFields(
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    position?: string;
    department?: string;
    role?: string;
    managerId?: string;
    annualLeaveAllocation?: number | string;
  },
  employees: EmployeeProfile[],
  editingId?: string
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.firstName?.trim()) errors.firstName = "First name is required.";
  if (!data.lastName?.trim()) errors.lastName = "Last name is required.";
  if (!data.email?.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Enter a valid email address.";
  } else {
    const dup = employees.find(
      (e) => e.email.toLowerCase() === data.email!.toLowerCase() && e.id !== editingId
    );
    if (dup) errors.email = "This email is already in use.";
  }
  if (!data.position?.trim()) errors.position = "Position is required.";
  if (!data.department?.trim()) errors.department = "Department is required.";
  if (!data.role) errors.role = "Role is required.";

  if (data.annualLeaveAllocation === undefined || data.annualLeaveAllocation === null || String(data.annualLeaveAllocation).trim() === "") {
    errors.annualLeaveAllocation = "Annual Leave Allocation is required.";
  } else {
    const value = Number(data.annualLeaveAllocation);
    if (!Number.isInteger(value) || value < 0) {
      errors.annualLeaveAllocation = "Annual Leave Allocation must be a whole number greater than or equal to 0.";
    }
  }

  if (data.role === "EMPLOYEE" && !data.managerId) {
    errors.managerId = "A direct manager is required for employees.";
  }

  return errors;
}

// ─── Request validation ────────────────────────────────────────────────────────

export function validateLeaveFields(
  data: { leaveType?: string; startDate?: string; endDate?: string },
  existingRequests: RequestRecord[],
  activeLeaveTypes: LeaveTypeRecord[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.leaveType) {
    errors.leaveType = "Leave Type is required.";
  } else if (!activeLeaveTypes.some((lt) => lt.name === data.leaveType && lt.status === "ACTIVE")) {
    errors.leaveType = "Selected leave type is not available.";
  }
  if (!data.startDate) errors.startDate = "Start Date is required.";
  if (!data.endDate) errors.endDate = "End Date is required.";

  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    errors.endDate = "End Date cannot be before Start Date.";
  }

  if (data.startDate && data.endDate && !errors.startDate && !errors.endDate) {
    const conflict = existingRequests.find(
      (r) =>
        r.type === "LEAVE" &&
        (r.status === "PENDING" || r.status === "APPROVED") &&
        data.startDate! <= r.endDate! &&
        data.endDate! >= r.startDate!
    );
    if (conflict) {
      errors.startDate = `Dates overlap with existing request ${conflict.requestNumber}.`;
    }
  }

  return errors;
}

export function validateMissionFields(data: {
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  location?: string;
  purpose?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.startDate) errors.startDate = "Start Date is required.";
  if (!data.startTime) errors.startTime = "Start Time is required.";
  if (!data.endDate) errors.endDate = "End Date is required.";
  if (!data.endTime) errors.endTime = "End Time is required.";
  if (!data.location?.trim()) errors.location = "Location is required.";
  if (!data.purpose?.trim()) errors.purpose = "Purpose is required.";

  if (
    data.startDate && data.startTime && data.endDate && data.endTime &&
    !errors.startDate && !errors.startTime && !errors.endDate && !errors.endTime
  ) {
    const start = new Date(`${data.startDate}T${data.startTime}`);
    const end = new Date(`${data.endDate}T${data.endTime}`);
    if (end <= start) errors.endTime = "End date/time must be after Start date/time.";
  }

  return errors;
}
