import { supabase } from './supabase'

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'HR'

export interface SessionUser {
  id: string
  name: string
  role: UserRole
  employeeNumber: string
}

export interface Session {
  user: SessionUser
  expiresAt: number
}

export type AuthError = 'INVALID_CREDENTIALS' | 'INACTIVE_ACCOUNT' | 'SYSTEM_ERROR'

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; error: AuthError }

interface ProfileRow {
  id: string
  employee_number: string
  name: string | null
  role: UserRole
  status: 'ACTIVE' | 'INACTIVE'
  manager_id: string | null
  first_name?: string | null
  last_name?: string | null
}

let currentSession: Session | null = null
let authListenerInitialized = false
const authListeners = new Set<(session: Session | null) => void>()

function mapEmployeeIdToEmail(employeeNumber: string): string {
  return `${employeeNumber.trim()}@hr.company.internal`
}

function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'MANAGER') return 'MANAGER'
  if (role === 'HR') return 'HR'
  return 'EMPLOYEE'
}

async function getProfileForCurrentUser(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, employee_number, name, role, status, manager_id, first_name, last_name')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as ProfileRow
}

async function buildSessionFromAuthUser(userId: string): Promise<Session | null> {
  const profile = await getProfileForCurrentUser(userId)

  if (!profile) {
    return null
  }

  if (profile.status !== 'ACTIVE') {
    await supabase.auth.signOut()
    return null
  }

  const resolvedName = profile.name ?? ([profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown User')

  return {
    user: {
      id: profile.id,
      name: resolvedName,
      role: normalizeRole(profile.role),
      employeeNumber: profile.employee_number,
    },
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  }
}

async function syncCurrentSessionFromSupabase(): Promise<Session | null> {
  const { data: { session: supabaseSession }, error } = await supabase.auth.getSession()

  if (error || !supabaseSession?.user) {
    currentSession = null
    return null
  }

  const session = await buildSessionFromAuthUser(supabaseSession.user.id)
  currentSession = session
  return session
}

function notifyAuthListeners(session: Session | null): void {
  for (const listener of authListeners) {
    listener(session)
  }
}

function ensureAuthListener(): void {
  if (authListenerInitialized) return

  authListenerInitialized = true

  supabase.auth.onAuthStateChange(async (_event, supabaseSession) => {
    if (!supabaseSession?.user) {
      currentSession = null
      notifyAuthListeners(null)
      return
    }

    const session = await buildSessionFromAuthUser(supabaseSession.user.id)
    currentSession = session
    notifyAuthListeners(session)
  })

  void syncCurrentSessionFromSupabase()
}

export function getSession(): Session | null {
  return currentSession
}

export async function signIn(employeeNumber: string, password: string): Promise<AuthResult> {
  const normalizedEmployeeNumber = employeeNumber.trim()

  if (!normalizedEmployeeNumber) {
    return { ok: false, error: 'INVALID_CREDENTIALS' }
  }

  try {
    const authEmail = mapEmployeeIdToEmail(normalizedEmployeeNumber)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (signInError || !signInData?.user) {
      const code = signInError?.code ?? ''
      if (code === 'invalid_credentials' || code === 'user_not_found') {
        return { ok: false, error: 'INVALID_CREDENTIALS' }
      }
      return { ok: false, error: 'SYSTEM_ERROR' }
    }

    const session = await buildSessionFromAuthUser(signInData.user.id)

    if (!session) {
      await supabase.auth.signOut()
      currentSession = null
      return { ok: false, error: 'INACTIVE_ACCOUNT' }
    }

    currentSession = session
    notifyAuthListeners(session)
    return { ok: true, session }
  } catch {
    return { ok: false, error: 'SYSTEM_ERROR' }
  }
}

export function signOut(): void {
  void supabase.auth.signOut().then(() => {
    currentSession = null
    notifyAuthListeners(null)
  })
}

export function dashboardPath(role: UserRole): string {
  switch (role) {
    case 'EMPLOYEE':
      return '/employee/dashboard'
    case 'MANAGER':
      return '/manager/dashboard'
    case 'HR':
      return '/hr/dashboard'
  }
}

export function subscribeToAuthChanges(callback: (session: Session | null) => void) {
  ensureAuthListener()
  authListeners.add(callback)

  return () => {
    authListeners.delete(callback)
  }
}

export function createHRUserCredential(_data: {
  employeeNumber: string
  name: string
  role: UserRole
  password: string
}): void {
  // Phase 2.2 intentionally does not implement HR-created auth user creation.
  // This is deferred to a secure server-side implementation later.
}

export function updateHRUserCredential(
  _employeeNumber: string,
  _updates: { name?: string; role?: UserRole; active?: boolean }
): void {
  // Phase 2.2 intentionally does not implement HR runtime credential updates.
  // Profile data remains database-owned; auth changes are handled by Supabase.
}
