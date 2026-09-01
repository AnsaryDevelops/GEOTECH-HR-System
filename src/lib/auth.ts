// Simulated authentication service.
// In production, replace signIn with a real API call and remove DEV_USERS.

export type UserRole = "EMPLOYEE" | "MANAGER" | "HR";

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  employeeNumber: string;
}

export interface Session {
  user: SessionUser;
  expiresAt: number;
}

export type AuthError = "INVALID_CREDENTIALS" | "INACTIVE_ACCOUNT" | "SYSTEM_ERROR";

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; error: AuthError };

// ─── Dev-only user store ───────────────────────────────────────────────────
// Passwords are stored here only because there is no real backend.
// A production implementation must NEVER store credentials on the client.

interface DevUser {
  employeeNumber: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
}

const DEV_USERS: DevUser[] = [
  { employeeNumber: "EMP-00001", passwordHash: "employee123", name: "Alex Morgan", role: "EMPLOYEE", active: true },
  { employeeNumber: "EMP-00002", passwordHash: "manager123", name: "Jordan Lee", role: "MANAGER", active: true },
  { employeeNumber: "EMP-00003", passwordHash: "hr123", name: "Riley Chen", role: "HR", active: true },
  { employeeNumber: "EMP-00004", passwordHash: "nour123", name: "Nour Khalil", role: "EMPLOYEE", active: true },
  { employeeNumber: "EMP-00005", passwordHash: "sami123", name: "Sami Hadid", role: "EMPLOYEE", active: true },
  { employeeNumber: "EMP-00006", passwordHash: "sara123", name: "Sara Mohamed", role: "MANAGER", active: true },
  { employeeNumber: "EMP-00007", passwordHash: "omar123", name: "Omar Hassan", role: "EMPLOYEE", active: true },
  { employeeNumber: "EMP-INACTIVE", passwordHash: "inactive123", name: "Sam Park", role: "EMPLOYEE", active: false },
];

// ─── HR-created user store (sessionStorage-backed) ────────────────────────────
// When HR creates a new employee, their credentials are added here.
// This is separate from DEV_USERS so auth.ts has no dependency on store.ts.

const HR_USERS_KEY = "hr_portal_hr_users_v1";

interface HRUser {
  employeeNumber: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  active: boolean;
}

function loadHRUsers(): HRUser[] {
  try {
    const raw = sessionStorage.getItem(HR_USERS_KEY);
    if (raw) return JSON.parse(raw) as HRUser[];
  } catch {}
  return [];
}

function saveHRUsers(users: HRUser[]): void {
  try {
    sessionStorage.setItem(HR_USERS_KEY, JSON.stringify(users));
  } catch {}
}

// Called by StoreProvider when HR creates a new employee.
export function createHRUserCredential(data: {
  employeeNumber: string;
  name: string;
  role: UserRole;
  password: string;
}): void {
  const users = loadHRUsers();
  const existing = users.findIndex((u) => u.employeeNumber === data.employeeNumber);
  const record: HRUser = {
    employeeNumber: data.employeeNumber,
    name: data.name,
    role: data.role,
    passwordHash: data.password,
    active: true,
  };
  if (existing >= 0) users[existing] = record;
  else users.push(record);
  saveHRUsers(users);
}

// Called by StoreProvider when HR updates an employee.
export function updateHRUserCredential(
  employeeNumber: string,
  updates: { name?: string; role?: UserRole; active?: boolean }
): void {
  const users = loadHRUsers();
  const u = users.find((u) => u.employeeNumber === employeeNumber);
  if (u) {
    if (updates.name !== undefined) u.name = updates.name;
    if (updates.role !== undefined) u.role = updates.role;
    if (updates.active !== undefined) u.active = updates.active;
    saveHRUsers(users);
  }
  // For DEV_USERS, we can't update them at runtime (they are hardcoded).
  // A real backend would handle this with a database update.
}

// ─── Lookup ────────────────────────────────────────────────────────────────────

function findUser(employeeNumber: string): DevUser | HRUser | undefined {
  const normed = employeeNumber.trim().toLowerCase();
  const devUser = DEV_USERS.find((u) => u.employeeNumber.toLowerCase() === normed);
  if (devUser) return devUser;
  return loadHRUsers().find((u) => u.employeeNumber.toLowerCase() === normed);
}

// ─── Session ───────────────────────────────────────────────────────────────────

const SESSION_KEY = "hr_portal_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// ─── Public API ────────────────────────────────────────────────────────────────

export async function signIn(employeeNumber: string, password: string): Promise<AuthResult> {
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

  try {
    const user = findUser(employeeNumber);

    if (!user || user.passwordHash !== password) {
      return { ok: false, error: "INVALID_CREDENTIALS" };
    }

    if (!user.active) {
      return { ok: false, error: "INACTIVE_ACCOUNT" };
    }

    const session: Session = {
      user: {
        id: user.employeeNumber,
        name: user.name,
        role: user.role,
        employeeNumber: user.employeeNumber,
      },
      expiresAt: Date.now() + SESSION_TTL_MS,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true, session };
  } catch {
    return { ok: false, error: "SYSTEM_ERROR" };
  }
}

export function getSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function signOut(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function dashboardPath(role: UserRole): string {
  switch (role) {
    case "EMPLOYEE": return "/employee/dashboard";
    case "MANAGER":  return "/manager/dashboard";
    case "HR":       return "/hr/dashboard";
  }
}
