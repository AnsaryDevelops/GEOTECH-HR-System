// Application data layer — requests, notifications, employees, leave types.
// In production, replace with API calls and a real database.

import { supabase } from "./supabase";

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

export async function loadLeaveTypes(): Promise<{
  leaveTypes: LeaveTypeRecord[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("leave_types")
    .select("id,name,status")
    .order("name");

  if (error) return { leaveTypes: [], error: error.message };
  return { leaveTypes: (data ?? []) as LeaveTypeRecord[], error: null };
}

// ─── Employee Profiles ────────────────────────────────────────────────────────
// Single source of truth. managerId drives My Team, request routing, and approval.

export interface EmployeeProfile {
  id: string;
  employeeNumber: string;
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

interface ProfileRow {
  id: string;
  employee_number: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  position: string | null;
  department: string | null;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  role: UserRole;
  manager_id: string | null;
  annual_leave_allocation?: number | null;
}

function mapProfileToEmployee(profile: ProfileRow): EmployeeProfile {
  const firstName = profile.first_name ?? "";
  const lastName = profile.last_name ?? "";
  return {
    id: profile.id,
    employeeNumber: profile.employee_number,
    name: profile.name ?? `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    position: profile.position ?? "",
    department: profile.department ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? undefined,
    status: profile.status,
    managerId: profile.manager_id,
    role: profile.role,
    annualLeaveAllocation: profile.annual_leave_allocation ?? undefined,
  };
}

export async function loadEmployeeProfiles(): Promise<{
  employees: EmployeeProfile[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("employee_number");

  if (error) return { employees: [], error: error.message };
  return {
    employees: ((data ?? []) as ProfileRow[]).map(mapProfileToEmployee),
    error: null,
  };
}

interface RequestRow {
  id: string;
  request_number: string;
  employee_id: string;
  employee_name: string;
  manager_id: string;
  manager_name: string;
  type: RequestType;
  status: RequestStatus;
  submitted_at: string;
  leave_type_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  reason?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  purpose?: string | null;
  decided_at?: string | null;
  decision_comment?: string | null;
  leave_type_id?: string | null;
}

export function mapRequestRow(row: RequestRow): RequestRecord {
  return {
    id: row.id,
    requestNumber: row.request_number,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    managerId: row.manager_id,
    managerName: row.manager_name,
    type: row.type,
    status: row.status,
    submittedAt: row.submitted_at,
    leaveTypeId: row.leave_type_id ?? undefined,
    leaveType: row.leave_type_name ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    reason: row.reason ?? undefined,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    location: row.location ?? undefined,
    purpose: row.purpose ?? undefined,
    decidedAt: row.decided_at ?? undefined,
    decisionComment: row.decision_comment ?? undefined,
  };
}

export async function loadRequests(): Promise<{
  requests: RequestRecord[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("requests")
    .select("id,request_number,employee_id,employee_name,manager_id,manager_name,type,status,submitted_at,leave_type_id,leave_type_name,start_date,end_date,reason,start_time,end_time,location,purpose,decided_at,decision_comment")
    .order("submitted_at", { ascending: false });

  if (error) return { requests: [], error: error.message };
  return {
    requests: ((data ?? []) as RequestRow[]).map(mapRequestRow),
    error: null,
  };
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
  { id: "EMP-00001", employeeNumber: "EMP-00001", name: "Alex Morgan", firstName: "Alex", lastName: "Morgan", position: "Product Designer", department: "IT", email: "alex.morgan@company.com", phone: "+20 10 0000 0001", status: "ACTIVE", managerId: "EMP-00002", role: "EMPLOYEE", annualLeaveAllocation: 21 },
  { id: "EMP-00002", employeeNumber: "EMP-00002", name: "Jordan Lee", firstName: "Jordan", lastName: "Lee", position: "Engineering Manager", department: "IT", email: "jordan.lee@company.com", phone: "+20 10 0000 0002", status: "ACTIVE", managerId: null, role: "MANAGER", annualLeaveAllocation: 21 },
  { id: "EMP-00003", employeeNumber: "EMP-00003", name: "Riley Chen", firstName: "Riley", lastName: "Chen", position: "HR Specialist", department: "Human Resources", email: "riley.chen@company.com", phone: "+20 10 0000 0003", status: "ACTIVE", managerId: null, role: "HR", annualLeaveAllocation: 21 },
  { id: "EMP-00004", employeeNumber: "EMP-00004", name: "Nour Khalil", firstName: "Nour", lastName: "Khalil", position: "Frontend Developer", department: "IT", email: "nour.khalil@company.com", phone: "+20 10 0000 0004", status: "ACTIVE", managerId: "EMP-00002", role: "EMPLOYEE", annualLeaveAllocation: 21 },
  { id: "EMP-00005", employeeNumber: "EMP-00005", name: "Sami Hadid", firstName: "Sami", lastName: "Hadid", position: "Backend Developer", department: "IT", email: "sami.hadid@company.com", phone: "+20 10 0000 0005", status: "ACTIVE", managerId: "EMP-00002", role: "EMPLOYEE", annualLeaveAllocation: 21 },
  { id: "EMP-00006", employeeNumber: "EMP-00006", name: "Sara Mohamed", firstName: "Sara", lastName: "Mohamed", position: "Operations Manager", department: "Operations", email: "sara.mohamed@company.com", phone: "+20 10 0000 0006", status: "ACTIVE", managerId: null, role: "MANAGER", annualLeaveAllocation: 21 },
  { id: "EMP-00007", employeeNumber: "EMP-00007", name: "Omar Hassan", firstName: "Omar", lastName: "Hassan", position: "Operations Analyst", department: "Operations", email: "omar.hassan@company.com", phone: "+20 10 0000 0007", status: "ACTIVE", managerId: "EMP-00006", role: "EMPLOYEE", annualLeaveAllocation: 21 },
  { id: "EMP-INACTIVE", employeeNumber: "EMP-INACTIVE", name: "Sam Park", firstName: "Sam", lastName: "Park", position: "QA Engineer", department: "IT", email: "sam.park@company.com", status: "INACTIVE", managerId: "EMP-00002", role: "EMPLOYEE", annualLeaveAllocation: 21 },
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
  leaveTypeId?: string;
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

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationRecord["type"];
  request_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

function mapNotificationRow(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    requestId: row.request_id,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

export async function loadNotifications(userId: string): Promise<{
  notifications: NotificationRecord[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,type,request_id,message,read,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { notifications: [], error: error.message };
  return {
    notifications: ((data ?? []) as NotificationRow[]).map(mapNotificationRow),
    error: null,
  };
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
