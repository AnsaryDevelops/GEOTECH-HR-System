import React, {
  useState,
  useRef,
  useId,
  useContext,
  createContext,
  useCallback,
  useEffect,
} from "react";
import {
  RouterProvider,
  createBrowserRouter,
  Navigate,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
} from "react-router";
import {
  getManagerForEmployee,
  validateLeaveFields,
  validateMissionFields,
  validateEmployeeFields,
  loadStore,
  saveStore,
  getTeamForManager,
  getEligibleManagers,
  empName,
  DEPARTMENTS,
  DEFAULT_LEAVE_TYPES,
} from "../lib/store";
import type {
  RequestRecord,
  NotificationRecord,
  StoreData,
  EmployeeProfile,
  LeaveTypeRecord,
  UserRole,
} from "../lib/store";
import {
  signIn as authSignIn,
  getSession,
  signOut as authSignOut,
  dashboardPath,
  createHRUserCredential,
  updateHRUserCredential,
} from "../lib/auth";
import companyLogoSrc from "../imports/GEO_Egypt_LOGO-01.png";
import type { Session } from "../lib/auth";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Eye, EyeOff, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Bell, ChevronDown, Chrome as Home, FileText, Users, Settings, LogOut, Menu, X, User, Search, Calendar, Clock, Upload, MoveVertical as MoreVertical, Info, Plus, ArrowLeft, ChevronRight, ChevronLeft, Briefcase, Umbrella, Check, Circle as XCircle, BellRing, CalendarDays } from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type UserRole = "EMPLOYEE" | "MANAGER" | "HR";
export type { RequestStatus, RequestType } from "../lib/store";
export type AccountStatus = "ACTIVE" | "INACTIVE";

type LoginState =
  | "idle"
  | "loading"
  | "success"
  | "invalid_credentials"
  | "inactive_account"
  | "system_error";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";
type BadgeVariant = "pending" | "approved" | "rejected" | "active" | "inactive";
type AlertVariant = "error" | "success" | "warning" | "info";

// ═══════════════════════════════════════════════════════════════════════════════
// LOGO
// Note: Official company logo not supplied. SVG is a geometric placeholder.
// Replace the SVG paths with the official logo artwork when provided.
// ═══════════════════════════════════════════════════════════════════════════════

interface LogoMarkProps {
  size?: number;
  variant?: "light" | "dark";
  className?: string;
}

export function LogoMark({
  size = 40,
  variant = "light",
  className,
}: LogoMarkProps) {
  if (variant === "dark") {
    // For use on light/white backgrounds
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <rect width="40" height="40" rx="9" className="fill-accent" />
        <rect x="16" y="8" width="8" height="7" rx="1.5" className="fill-primary" />
        <rect
          x="19.5"
          y="15"
          width="1"
          height="5"
          className="fill-primary opacity-40"
        />
        <rect
          x="12"
          y="20"
          width="16"
          height="1"
          className="fill-primary opacity-40"
        />
        <rect
          x="12"
          y="20"
          width="1"
          height="5"
          className="fill-primary opacity-40"
        />
        <rect
          x="27"
          y="20"
          width="1"
          height="5"
          className="fill-primary opacity-40"
        />
        <rect x="8" y="25" width="8" height="7" rx="1.5" className="fill-primary" />
        <rect
          x="24"
          y="25"
          width="8"
          height="7"
          rx="1.5"
          className="fill-primary"
        />
      </svg>
    );
  }

  // Light version — for use on the dark primary background
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        width="40"
        height="40"
        rx="9"
        fill="white"
        fillOpacity="0.12"
      />
      <rect x="16" y="8" width="8" height="7" rx="1.5" fill="white" />
      <rect
        x="19.5"
        y="15"
        width="1"
        height="5"
        fill="white"
        fillOpacity="0.55"
      />
      <rect
        x="12"
        y="20"
        width="16"
        height="1"
        fill="white"
        fillOpacity="0.55"
      />
      <rect
        x="12"
        y="20"
        width="1"
        height="5"
        fill="white"
        fillOpacity="0.55"
      />
      <rect
        x="27"
        y="20"
        width="1"
        height="5"
        fill="white"
        fillOpacity="0.55"
      />
      <rect x="8" y="25" width="8" height="7" rx="1.5" fill="white" />
      <rect x="24" y="25" width="8" height="7" rx="1.5" fill="white" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BASE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Button ─────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  secondary:
    "bg-white text-foreground border border-border hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  ghost:
    "text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[8px] font-medium",
        "transition-colors focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        "active:scale-[0.98]",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ─── Input ──────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  id?: string;
  type?: string;
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

const inputBase = [
  "h-10 w-full rounded-[8px] border border-border bg-white px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground/60",
  "transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15",
  "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
];

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          ...inputBase,
          error && "border-destructive/60 focus:border-destructive focus:ring-destructive/15",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined
        }
        {...props}
      />
      {error && (
        <p
          id={`${inputId}-err`}
          className="flex items-center gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Password Input ──────────────────────────────────────────────────────────

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export function PasswordInput({
  label,
  error,
  id,
  disabled,
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn(
            ...inputBase,
            "pr-10",
            error && "border-destructive/60 focus:border-destructive focus:ring-destructive/15",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-err` : undefined}
          {...props}
        />
        <button
          type="button"
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2",
            "text-muted-foreground hover:text-foreground",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          disabled={disabled}
          tabIndex={0}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
      {error && (
        <p
          id={`${inputId}-err`}
          className="flex items-center gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Textarea ────────────────────────────────────────────────────────────────

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  id?: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}

export function Textarea({ label, error, hint, id, className, ...props }: TextareaProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "min-h-[96px] w-full rounded-[8px] border border-border bg-white px-3 py-2.5 text-sm text-foreground",
          "placeholder:text-muted-foreground/60 resize-y",
          "transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15",
          "disabled:cursor-not-allowed disabled:bg-muted",
          error && "border-destructive/60 focus:border-destructive focus:ring-destructive/15",
          className
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

// ─── Select ─────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  placeholder?: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
}

export function Select({
  label,
  error,
  placeholder,
  id,
  className,
  children,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          className={cn(
            "h-10 w-full appearance-none rounded-[8px] border border-border bg-white px-3 pr-9 text-sm text-foreground",
            "transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15",
            "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
            error && "border-destructive/60 focus:border-destructive focus:ring-destructive/15",
            className
          )}
          defaultValue={placeholder ? "" : undefined}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Calendar Popover ────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarPopoverProps {
  value: string; // YYYY-MM-DD or ""
  onChange: (val: string) => void;
  onClose: () => void;
}

function CalendarPopover({ value, onChange, onClose }: CalendarPopoverProps) {
  const today = new Date();
  const selected = value ? new Date(value + "T00:00:00") : null;

  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());
  const [pickingYear, setPickingYear] = useState(false);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayAdj = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mon=0
  const totalCells = Math.ceil((firstDayAdj + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const d = i - firstDayAdj + 1;
    return d >= 1 && d <= daysInMonth ? d : null;
  });

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    onClose();
  }

  const isSelected = (day: number) =>
    !!selected &&
    selected.getFullYear() === viewYear &&
    selected.getMonth() === viewMonth &&
    selected.getDate() === day;

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  // Year picker — show decade window
  const decade = Math.floor(viewYear / 10) * 10;
  const years = Array.from({ length: 12 }, (_, i) => decade - 1 + i);

  return (
    <div className="absolute z-50 top-full mt-1 left-0 w-[272px] rounded-[12px] border border-border bg-card shadow-xl p-3 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={pickingYear ? () => setViewYear((y) => y - 10) : prevMonth}
          className="h-7 w-7 rounded-[6px] flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => setPickingYear((v) => !v)}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors px-2 py-0.5 rounded-[6px] hover:bg-muted"
        >
          {pickingYear ? `${decade} – ${decade + 9}` : `${MONTH_NAMES[viewMonth]} ${viewYear}`}
        </button>

        <button
          type="button"
          onClick={pickingYear ? () => setViewYear((y) => y + 10) : nextMonth}
          className="h-7 w-7 rounded-[6px] flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {pickingYear ? (
        /* Year grid */
        <div className="grid grid-cols-4 gap-1">
          {years.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => { setViewYear(yr); setPickingYear(false); }}
              className={cn(
                "rounded-[8px] py-1.5 text-sm transition-colors",
                yr === viewYear
                  ? "bg-primary text-white font-semibold"
                  : yr === today.getFullYear()
                  ? "border border-primary/30 text-primary font-medium hover:bg-muted"
                  : "text-foreground hover:bg-muted",
                yr < decade || yr > decade + 9 ? "text-muted-foreground/50" : ""
              )}
            >
              {yr}
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground/60 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className={cn(
                      "h-8 w-8 rounded-full text-sm transition-colors",
                      isSelected(day) && "bg-primary text-white font-semibold",
                      !isSelected(day) && isToday(day) &&
                        "font-semibold text-primary ring-1 ring-inset ring-primary/40",
                      !isSelected(day) && !isToday(day) && "text-foreground hover:bg-muted"
                    )}
                  >
                    {day}
                  </button>
                ) : (
                  <div className="h-8 w-8" />
                )}
              </div>
            ))}
          </div>

          {/* Today shortcut */}
          <div className="mt-2 pt-2 border-t border-border flex justify-center">
            <button
              type="button"
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                selectDay(today.getDate());
              }}
              className="text-xs text-primary hover:underline"
            >
              Today
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Date Picker ─────────────────────────────────────────────────────────────

export function DatePicker({
  label, error, value, onChange, placeholder, className, id: idProp, ...props
}: InputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const inputId = idProp ?? generatedId;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleCalendarChange(val: string) {
    if (onChange) {
      onChange({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>);
    }
  }

  const displayValue = value
    ? (() => {
        const [y, m, d] = (value as string).split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
          day: "2-digit", month: "short", year: "numeric",
        });
      })()
    : "";

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <button
        id={inputId}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full h-10 rounded-[8px] border border-border bg-white px-3 text-sm text-left",
          "flex items-center gap-2 transition-colors",
          "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15",
          error && "border-destructive/60 focus:border-destructive focus:ring-destructive/15",
          className
        )}
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className={cn("flex-1", !displayValue && "text-muted-foreground/60")}>
          {displayValue || (placeholder ?? "Select date")}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Hidden input keeps the YYYY-MM-DD value accessible to native form APIs */}
      <input type="date" value={value ?? ""} onChange={onChange} className="sr-only" tabIndex={-1} {...props} />

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {open && (
        <CalendarPopover
          value={(value as string) ?? ""}
          onChange={handleCalendarChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Time Picker (native) ────────────────────────────────────────────────────

export function TimePicker({ className, ...props }: InputProps) {
  return (
    <Input
      {...props}
      type={"time" as const}
      className={cn("cursor-pointer", className)}
    />
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<BadgeVariant, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approved",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  inactive: {
    label: "Inactive",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

interface StatusBadgeProps {
  status: BadgeVariant;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = BADGE_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-[12px] border border-border shadow-sm",
        padding && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Alert ───────────────────────────────────────────────────────────────────

const ALERT_CONFIG: Record<
  AlertVariant,
  { className: string; iconClassName: string; Icon: React.ElementType }
> = {
  error: {
    className: "bg-red-50 border-red-200",
    iconClassName: "text-red-500",
    Icon: AlertCircle,
  },
  success: {
    className: "bg-green-50 border-green-200",
    iconClassName: "text-green-500",
    Icon: CheckCircle2,
  },
  warning: {
    className: "bg-amber-50 border-amber-200",
    iconClassName: "text-amber-500",
    Icon: AlertCircle,
  },
  info: {
    className: "bg-blue-50 border-blue-200",
    iconClassName: "text-blue-500",
    Icon: Info,
  },
};

interface AlertProps {
  variant: AlertVariant;
  children?: React.ReactNode;
  className?: string;
}

export function Alert({ variant, children, className }: AlertProps) {
  const config = ALERT_CONFIG[variant];
  const Icon = config.Icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[8px] border p-4",
        config.className,
        className
      )}
      role="alert"
    >
      <Icon className={cn("h-4.5 w-4.5 flex-shrink-0 mt-0.5", config.iconClassName)} />
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const modalSizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          "relative z-10 w-full rounded-[16px] bg-white border border-border shadow-xl",
          "flex flex-col max-h-[90vh]",
          modalSizes[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px] p-0.5 -mr-0.5 -mt-0.5"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
// Note: Uses Sonner (imported separately). This wrapper provides a design-consistent API.

// ─── Loading State ───────────────────────────────────────────────────────────

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16",
        className
      )}
    >
      <Loader2 className="h-7 w-7 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactElement;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      {icon && (
        <div className="text-muted-foreground/40 mb-1">{icon}</div>
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = "Something went wrong. We couldn't load this content. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <AlertCircle className="h-9 w-9 text-destructive/40" />
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading,
  emptyState,
  className,
}: TableProps<T>) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12">
                <LoadingState />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-4">
                {emptyState ?? (
                  <EmptyState
                    title="No results found"
                    description="Try adjusting your filters."
                  />
                )}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  "border-b border-border last:border-0",
                  "transition-colors",
                  onRowClick &&
                    "cursor-pointer hover:bg-muted/50 active:bg-muted"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3.5", col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

const avatarSizes = {
  sm: "h-7 w-7 text-xs",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary flex-shrink-0",
        avatarSizes[size],
        className
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPLICATION SHELL
// Defined here for architectural completeness. Not rendered in this step.
// Will be wired to the router in subsequent implementation steps.
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ITEMS: Record<
  UserRole,
  { label: string; icon: React.ElementType; id: string }[]
> = {
  EMPLOYEE: [
    { label: "Dashboard", icon: Home, id: "dashboard" },
    { label: "My Requests", icon: FileText, id: "requests" },
    { label: "Notifications", icon: Bell, id: "notifications" },
  ],
  MANAGER: [
    { label: "Dashboard", icon: Home, id: "dashboard" },
    { label: "My Team", icon: Users, id: "team" },
    { label: "Requests", icon: FileText, id: "requests" },
    { label: "Notifications", icon: Bell, id: "notifications" },
  ],
  HR: [
    { label: "Dashboard", icon: Home, id: "dashboard" },
    { label: "Employees", icon: Users, id: "employees" },
    { label: "Requests", icon: FileText, id: "requests" },
    { label: "Notifications", icon: Bell, id: "notifications" },
    { label: "Settings", icon: Settings, id: "settings" },
  ],
};

interface SidebarProps {
  role: UserRole;
  activeId?: string;
  onNavigate?: (id: string) => void;
  onLogout?: () => void;
  userName?: string;
}

export function Sidebar({
  role,
  activeId,
  onNavigate,
  onLogout,
  userName,
}: SidebarProps) {
  const items = NAV_ITEMS[role];

  return (
    <nav
      className="flex flex-col w-60 flex-shrink-0 bg-card border-r border-border h-full"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border flex-shrink-0">
        <LogoMark size={30} variant="dark" />
        <span className="text-sm font-semibold text-foreground tracking-tight">
          HR Portal
        </span>
      </div>

      {/* Nav items */}
      <div className="flex flex-col flex-1 px-3 py-4 gap-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;

          return (
            <button
              key={item.id}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-sm text-left transition-colors",
                isActive
                  ? "bg-accent text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => onNavigate?.(item.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* User + sign out */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0">
        {userName && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <Avatar name={userName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
          </div>
        )}
        <button
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[8px] text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </nav>
  );
}

interface HeaderProps {
  title?: string;
  userName?: string;
  role?: UserRole;
  notificationCount?: number;
  onNotificationsClick?: () => void;
  onMenuClick?: () => void;
}

export function Header({
  title,
  userName,
  role,
  notificationCount = 0,
  onNotificationsClick,
  onMenuClick,
}: HeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden text-muted-foreground hover:text-foreground h-8 w-8 flex items-center justify-center rounded-[6px] hover:bg-muted transition-colors"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {title && (
          <h1 className="text-sm font-medium text-foreground">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button
          className="relative h-9 w-9 flex items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={onNotificationsClick}
          aria-label={
            notificationCount > 0
              ? `${notificationCount} unread notifications`
              : "Notifications"
          }
        >
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <span
              className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive"
              aria-hidden="true"
            />
          )}
        </button>

        {/* User menu */}
        {userName && (
          <button className="flex items-center gap-2.5 h-9 px-3 rounded-[8px] text-sm hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Avatar name={userName} size="sm" />
            <span className="hidden md:block text-sm font-medium text-foreground max-w-[140px] truncate">
              {userName}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </header>
  );
}

interface AppShellProps {
  user: {
    name: string;
    role: UserRole;
    employeeNumber?: string;
  };
  children?: React.ReactNode;
  activeNavId?: string;
  pageTitle?: string;
  notificationCount?: number;
  onNavigate?: (id: string) => void;
  onLogout?: () => void;
}

export function AppShell({
  user,
  children,
  activeNavId,
  pageTitle,
  notificationCount = 0,
  onNavigate,
  onLogout,
}: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          role={user.role}
          activeId={activeNavId}
          onNavigate={onNavigate}
          onLogout={onLogout}
          userName={user.name}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 flex">
            <Sidebar
              role={user.role}
              activeId={activeNavId}
              onNavigate={(id) => {
                onNavigate?.(id);
                setMobileSidebarOpen(false);
              }}
              onLogout={onLogout}
              userName={user.name}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          title={pageTitle}
          userName={user.name}
          role={user.role}
          notificationCount={notificationCount}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface AuthContextValue {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
}

const AuthCtx = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children?: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession());

  const login = useCallback((s: Session) => {
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    authSignOut();
    setSession(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ session, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface CreateEmployeeInput {
  firstName: string; lastName: string; email: string; phone?: string;
  position: string; department: string; role: UserRole;
  managerId: string | null; status: "ACTIVE" | "INACTIVE"; password: string;
}

interface StoreContextValue {
  requests: RequestRecord[];
  notifications: NotificationRecord[];
  employees: EmployeeProfile[];
  leaveTypes: LeaveTypeRecord[];
  createLeaveRequest: (
    employeeId: string, employeeName: string,
    data: { leaveType: string; startDate: string; endDate: string; reason?: string }
  ) => { ok: true; request: RequestRecord } | { ok: false; errors: Record<string, string> };
  createMissionRequest: (
    employeeId: string, employeeName: string,
    data: { startDate: string; startTime: string; endDate: string; endTime: string; location: string; purpose: string }
  ) => { ok: true; request: RequestRecord } | { ok: false; errors: Record<string, string> };
  approveRequest: (requestId: string, managerId: string) => void;
  rejectRequest: (requestId: string, managerId: string, comment: string) => void;
  markNotificationRead: (id: string) => void;
  // HR-only operations
  createEmployee: (
    data: CreateEmployeeInput
  ) => { ok: true; employee: EmployeeProfile; password: string } | { ok: false; errors: Record<string, string> };
  updateEmployee: (id: string, data: Partial<EmployeeProfile>) => void;
  createLeaveType: (name: string) => LeaveTypeRecord;
  updateLeaveType: (id: string, updates: Partial<LeaveTypeRecord>) => void;
}

const StoreCtx = createContext<StoreContextValue | null>(null);

function StoreProvider({ children }: { children?: React.ReactNode }) {
  const [store, setStore] = useState<StoreData>(() => loadStore());

  function mutate(updater: (prev: StoreData) => StoreData) {
    setStore((prev) => { const next = updater(prev); saveStore(next); return next; });
  }

  function createLeaveRequest(
    employeeId: string, employeeName: string,
    data: { leaveType: string; startDate: string; endDate: string; reason?: string }
  ) {
    const manager = getManagerForEmployee(store.employees, employeeId);
    if (!manager || manager.status !== "ACTIVE") {
      return { ok: false as const, errors: { _form: "No active manager assigned. Contact HR." } };
    }
    const errs = validateLeaveFields(
      data,
      store.requests.filter((r) => r.employeeId === employeeId),
      store.leaveTypes
    );
    if (Object.keys(errs).length > 0) return { ok: false as const, errors: errs };

    const id = crypto.randomUUID();
    const requestNumber = `REQ-${String(store.nextSeq).padStart(5, "0")}`;
    const request: RequestRecord = {
      id, requestNumber, employeeId, employeeName,
      managerId: manager.id, managerName: empName(manager),
      type: "LEAVE", status: "PENDING", submittedAt: new Date().toISOString(),
      leaveType: data.leaveType, startDate: data.startDate,
      endDate: data.endDate, reason: data.reason,
    };
    const notif: NotificationRecord = {
      id: crypto.randomUUID(), userId: manager.id, type: "REQUEST_SUBMITTED",
      requestId: id, message: `${employeeName} submitted a ${data.leaveType} request.`,
      read: false, createdAt: new Date().toISOString(),
    };
    mutate((p) => ({ ...p, requests: [...p.requests, request], notifications: [...p.notifications, notif], nextSeq: p.nextSeq + 1 }));
    return { ok: true as const, request };
  }

  function createMissionRequest(
    employeeId: string, employeeName: string,
    data: { startDate: string; startTime: string; endDate: string; endTime: string; location: string; purpose: string }
  ) {
    const manager = getManagerForEmployee(store.employees, employeeId);
    if (!manager || manager.status !== "ACTIVE") {
      return { ok: false as const, errors: { _form: "No active manager assigned. Contact HR." } };
    }
    const errs = validateMissionFields(data);
    if (Object.keys(errs).length > 0) return { ok: false as const, errors: errs };

    const id = crypto.randomUUID();
    const requestNumber = `REQ-${String(store.nextSeq).padStart(5, "0")}`;
    const request: RequestRecord = {
      id, requestNumber, employeeId, employeeName,
      managerId: manager.id, managerName: empName(manager),
      type: "MISSION", status: "PENDING", submittedAt: new Date().toISOString(),
      startDate: data.startDate, startTime: data.startTime,
      endDate: data.endDate, endTime: data.endTime,
      location: data.location, purpose: data.purpose,
    };
    const notif: NotificationRecord = {
      id: crypto.randomUUID(), userId: manager.id, type: "REQUEST_SUBMITTED",
      requestId: id, message: `${employeeName} submitted a Mission request.`,
      read: false, createdAt: new Date().toISOString(),
    };
    mutate((p) => ({ ...p, requests: [...p.requests, request], notifications: [...p.notifications, notif], nextSeq: p.nextSeq + 1 }));
    return { ok: true as const, request };
  }

  function approveRequest(requestId: string, managerId: string) {
    mutate((prev) => {
      const req = prev.requests.find((r) => r.id === requestId);
      if (!req || req.status !== "PENDING" || req.managerId !== managerId) return prev;
      const updated = { ...req, status: "APPROVED" as const, decidedAt: new Date().toISOString() };
      const label = req.type === "LEAVE" ? (req.leaveType ?? "Leave") : "Mission";
      const notif: NotificationRecord = {
        id: crypto.randomUUID(), userId: req.employeeId, type: "REQUEST_APPROVED",
        requestId, message: `Your ${label} request (${req.requestNumber}) has been approved.`,
        read: false, createdAt: new Date().toISOString(),
      };
      return { ...prev, requests: prev.requests.map((r) => r.id === requestId ? updated : r), notifications: [...prev.notifications, notif] };
    });
  }

  function rejectRequest(requestId: string, managerId: string, comment: string) {
    mutate((prev) => {
      const req = prev.requests.find((r) => r.id === requestId);
      if (!req || req.status !== "PENDING" || req.managerId !== managerId) return prev;
      const updated = { ...req, status: "REJECTED" as const, decidedAt: new Date().toISOString(), decisionComment: comment };
      const label = req.type === "LEAVE" ? (req.leaveType ?? "Leave") : "Mission";
      const notif: NotificationRecord = {
        id: crypto.randomUUID(), userId: req.employeeId, type: "REQUEST_REJECTED",
        requestId, message: `Your ${label} request (${req.requestNumber}) has been rejected.`,
        read: false, createdAt: new Date().toISOString(),
      };
      return { ...prev, requests: prev.requests.map((r) => r.id === requestId ? updated : r), notifications: [...prev.notifications, notif] };
    });
  }

  function markNotificationRead(id: string) {
    mutate((p) => ({ ...p, notifications: p.notifications.map((n) => n.id === id ? { ...n, read: true } : n) }));
  }

  function createEmployee(data: CreateEmployeeInput) {
    const errs = validateEmployeeFields(data, store.employees);
    if (Object.keys(errs).length > 0) return { ok: false as const, errors: errs };

    const seq = String(store.nextEmpSeq).padStart(5, "0");
    const id = `EMP-${seq}`;
    const name = `${data.firstName.trim()} ${data.lastName.trim()}`;
    const employee: EmployeeProfile = {
      id, name, firstName: data.firstName.trim(), lastName: data.lastName.trim(),
      position: data.position.trim(), department: data.department,
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || undefined,
      status: data.status, managerId: data.managerId || null, role: data.role,
    };
    createHRUserCredential({ employeeNumber: id, name, role: data.role, password: data.password });
    mutate((p) => ({ ...p, employees: [...p.employees, employee], nextEmpSeq: p.nextEmpSeq + 1 }));
    return { ok: true as const, employee, password: data.password };
  }

  function updateEmployee(id: string, data: Partial<EmployeeProfile>) {
    mutate((p) => {
      const employees = p.employees.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, ...data };
        if (data.firstName || data.lastName) {
          updated.name = `${updated.firstName} ${updated.lastName}`;
        }
        return updated;
      });
      return { ...p, employees };
    });
    // Sync auth record for name, role, status changes
    if (data.name || data.role || data.status) {
      const emp = store.employees.find((e) => e.id === id);
      if (emp) {
        const updates: { name?: string; role?: UserRole; active?: boolean } = {};
        if (data.firstName || data.lastName) {
          const fn = data.firstName ?? emp.firstName;
          const ln = data.lastName ?? emp.lastName;
          updates.name = `${fn} ${ln}`;
        }
        if (data.role) updates.role = data.role;
        if (data.status !== undefined) updates.active = data.status === "ACTIVE";
        updateHRUserCredential(id, updates);
      }
    }
  }

  function createLeaveType(name: string): LeaveTypeRecord {
    const id = `lt-${store.nextLeaveTypeSeq}`;
    const lt: LeaveTypeRecord = { id, name: name.trim(), status: "ACTIVE" };
    mutate((p) => ({ ...p, leaveTypes: [...p.leaveTypes, lt], nextLeaveTypeSeq: p.nextLeaveTypeSeq + 1 }));
    return lt;
  }

  function updateLeaveType(id: string, updates: Partial<LeaveTypeRecord>) {
    mutate((p) => ({ ...p, leaveTypes: p.leaveTypes.map((lt) => lt.id === id ? { ...lt, ...updates } : lt) }));
  }

  return (
    <StoreCtx.Provider value={{
      requests: store.requests, notifications: store.notifications,
      employees: store.employees, leaveTypes: store.leaveTypes,
      createLeaveRequest, createMissionRequest,
      approveRequest, rejectRequest, markNotificationRead,
      createEmployee, updateEmployee, createLeaveType, updateLeaveType,
    }}>
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

function ProtectedRoute() {
  const { session } = useAuth();
  if (!session) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RoleRoute({ role }: { role: UserRole }) {
  const { session } = useAuth();
  if (!session || session.user.role !== role) {
    return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: ACCESS DENIED
// ═══════════════════════════════════════════════════════════════════════════════

function AccessDeniedPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  function handleBack() {
    const dest = session ? dashboardPath(session.user.role) : "/";
    navigate(dest, { replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don't have permission to view this page.
        </p>
        <Button variant="primary" className="mt-6" onClick={handleBack}>
          Go to My Dashboard
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD SHELL
// Wraps all authenticated pages with AppShell + auth-aware nav routing
// ═══════════════════════════════════════════════════════════════════════════════

const NAV_ROUTES: Record<UserRole, Record<string, string>> = {
  EMPLOYEE: {
    dashboard: "/employee/dashboard",
    requests: "/employee/requests",
    notifications: "/employee/notifications",
  },
  MANAGER: {
    dashboard: "/manager/dashboard",
    team: "/manager/team",
    requests: "/manager/requests",
    notifications: "/manager/notifications",
  },
  HR: {
    dashboard: "/hr/dashboard",
    employees: "/hr/employees",
    requests: "/hr/requests",
    notifications: "/hr/notifications",
    settings: "/hr/settings",
  },
};

interface DashboardShellProps {
  activeNavId: string;
  pageTitle: string;
  children?: React.ReactNode;
}

function DashboardShell({ activeNavId, pageTitle, children }: DashboardShellProps) {
  const { session, logout } = useAuth();
  const { notifications } = useStore();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(
    (n) => n.userId === session!.user.id && !n.read
  ).length;

  function handleNavigate(id: string) {
    const routes = NAV_ROUTES[session!.user.role];
    const route = routes[id];
    if (route) navigate(route);
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <AppShell
      user={session!.user}
      activeNavId={activeNavId}
      pageTitle={pageTitle}
      notificationCount={unreadCount}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED PAGE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDateTime(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "—";
  if (!timeStr) return fmtDate(dateStr);
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtRelative(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const STATUS_BADGE: Record<"PENDING" | "APPROVED" | "REJECTED", BadgeVariant> = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

function RequestTimeline({ request }: { request: RequestRecord }) {
  const isPending = request.status === "PENDING";
  const isApproved = request.status === "APPROVED";

  const steps: {
    label: string;
    state: "done" | "current" | "failed" | "future";
    date?: string;
  }[] = [
    { label: "Submitted", state: "done", date: request.submittedAt },
    {
      label: isPending ? "Pending Manager Approval" : "Manager Reviewed",
      state: isPending ? "current" : "done",
      date: isPending ? undefined : request.decidedAt,
    },
    {
      label: isApproved ? "Approved" : request.status === "REJECTED" ? "Rejected" : "Decision",
      state: isPending ? "future" : isApproved ? "done" : "failed",
      date: request.decidedAt,
    },
  ];

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isDone = step.state === "done";
        const isFailed = step.state === "failed";
        const isCurrent = step.state === "current";
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                isDone && "bg-green-100",
                isFailed && "bg-red-100",
                isCurrent && "bg-primary",
                step.state === "future" && "border-2 border-border bg-background"
              )}>
                {isDone && <Check className="h-3.5 w-3.5 text-green-700" />}
                {isFailed && <X className="h-3.5 w-3.5 text-red-700" />}
                {isCurrent && <span className="h-2 w-2 rounded-full bg-white block" />}
                {step.state === "future" && <span className="h-1.5 w-1.5 rounded-full bg-border block" />}
              </div>
              {!isLast && (
                <div className={cn(
                  "w-px flex-1 my-1 min-h-[20px]",
                  isDone ? "bg-green-200" : "bg-border/50"
                )} />
              )}
            </div>
            <div className={cn("flex-1", isLast ? "pb-0" : "pb-4")}>
              <p className={cn(
                "text-sm leading-6",
                isCurrent && "font-medium text-foreground",
                step.state === "future" && "text-muted-foreground/60",
                (isDone || isFailed) && "text-foreground"
              )}>
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-muted-foreground">
                  {new Date(step.date).toLocaleString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApproverInfo({ name }: { name: string }) {
  return (
    <div className="rounded-[8px] border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Approver
      </p>
      <div className="flex items-center gap-3">
        <Avatar name={name} size="sm" />
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">Direct Manager</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/70 mt-3">
        Automatically assigned based on your direct manager.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: EMPLOYEE DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function EmployeeDashboardPage() {
  const { session } = useAuth();
  const { requests } = useStore();
  const navigate = useNavigate();

  const myRequests = requests.filter((r) => r.employeeId === session!.user.id);
  const pending = myRequests.filter((r) => r.status === "PENDING").length;
  const approved = myRequests.filter((r) => r.status === "APPROVED").length;
  const recent = [...myRequests]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5);

  return (
    <DashboardShell activeNavId="dashboard" pageTitle="Dashboard">
      {/* New Request hero */}
      <div className="mb-6 rounded-[12px] bg-primary p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Submit a New Request</h2>
          <p className="text-sm text-white/70 mt-1">
            Request leave or a work mission. Your manager will be notified immediately.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate("/employee/new-request")}
          className="flex-shrink-0 bg-white text-primary hover:bg-white/90 border-0"
        >
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Requests", value: myRequests.length },
          { label: "Pending", value: pending },
          { label: "Approved", value: approved },
        ].map(({ label, value }) => (
          <div key={label} className="contents">
            <Card padding={false}>
              <div className="p-4">
                <p className="text-2xl font-semibold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Recent requests */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Recent Requests</h3>
          {myRequests.length > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate("/employee/requests")}
            >
              View all
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground/40" />}
            title="No requests yet"
            description="Click New Request above to submit your first request."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recent.map((r) => (
              <button
                key={r.id}
                className="flex items-center gap-4 py-3 text-left hover:bg-muted/40 -mx-2 px-2 rounded-[6px] transition-colors"
                onClick={() => navigate(`/employee/requests/${r.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{r.requestNumber}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {r.type === "LEAVE" ? r.leaveType : "Mission"}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5 truncate">
                    {r.type === "LEAVE"
                      ? `${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}`
                      : `${fmtDateTime(r.startDate, r.startTime)} — ${fmtDateTime(r.endDate, r.endTime)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={STATUS_BADGE[r.status]} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: E02 — NEW REQUEST (choose type)
// ═══════════════════════════════════════════════════════════════════════════════

function NewRequestPage() {
  const navigate = useNavigate();
  return (
    <DashboardShell activeNavId="requests" pageTitle="New Request">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">New Request</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose the type of request you want to submit.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            className="group flex flex-col items-start gap-4 rounded-[12px] border-2 border-border bg-card p-6 text-left hover:border-primary hover:bg-accent/30 transition-all"
            onClick={() => navigate("/employee/new-request/leave")}
          >
            <div className="h-12 w-12 rounded-[10px] bg-blue-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Umbrella className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Leave</p>
              <p className="text-sm text-muted-foreground mt-1">Request time off from work.</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-primary mt-auto">
              Select <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>

          <button
            className="group flex flex-col items-start gap-4 rounded-[12px] border-2 border-border bg-card p-6 text-left hover:border-primary hover:bg-accent/30 transition-all"
            onClick={() => navigate("/employee/new-request/mission")}
          >
            <div className="h-12 w-12 rounded-[10px] bg-orange-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Mission</p>
              <p className="text-sm text-muted-foreground mt-1">Request a work mission.</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-primary mt-auto">
              Select <ChevronRight className="h-3.5 w-3.5" />
            </div>
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: E03 — REQUEST LEAVE
// ═══════════════════════════════════════════════════════════════════════════════

function LeaveRequestPage() {
  const { session } = useAuth();
  const { requests, leaveTypes, employees, createLeaveRequest } = useStore();
  const navigate = useNavigate();

  const manager = getManagerForEmployee(employees, session!.user.id);

  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function clearErr(field: string) {
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  }

  if (!manager) {
    return (
      <DashboardShell activeNavId="requests" pageTitle="Request Leave">
        <Alert variant="error">
          <p className="text-sm text-red-800">
            No direct manager is assigned to your account. Please contact HR before submitting requests.
          </p>
        </Alert>
      </DashboardShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateLeaveFields(
      { leaveType, startDate, endDate },
      requests.filter((r) => r.employeeId === session!.user.id),
      leaveTypes.filter((lt) => lt.status === "ACTIVE")
    );
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    const result = createLeaveRequest(session!.user.id, session!.user.name, {
      leaveType,
      startDate, endDate,
      reason: reason.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setErrors((result as { ok: false; errors: Record<string, string> }).errors);
      return;
    }
    navigate(`/employee/requests/${result.request.id}`, {
      replace: true, state: { justSubmitted: true },
    });
  }

  return (
    <DashboardShell activeNavId="requests" pageTitle="Request Leave">
      <div className="max-w-2xl">
        <button
          onClick={() => navigate("/employee/new-request")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Request Type
        </button>
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Leave Request</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete the form below to submit your leave request.
            </p>
          </div>
          {errors._form && (
            <Alert variant="error" className="mb-5">
              <p className="text-sm text-red-800">{errors._form}</p>
            </Alert>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-5">
              <Select
                label="Leave Type *"
                value={leaveType}
                onChange={(e) => { setLeaveType(e.target.value); clearErr("leaveType"); }}
                error={errors.leaveType}
              >
                <option value="">Select Leave Type</option>
                {leaveTypes.filter((lt) => lt.status === "ACTIVE").map((lt) => (
                  <option key={lt.id} value={lt.name}>{lt.name}</option>
                ))}
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="Start Date *"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); clearErr("startDate"); }}
                  error={errors.startDate}
                />
                <DatePicker
                  label="End Date *"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); clearErr("endDate"); }}
                  error={errors.endDate}
                />
              </div>
              <Textarea
                label="Reason"
                placeholder="Optional: describe the reason for your leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
              <ApproverInfo name={manager.name} />
              <div className="flex items-center gap-3 pt-1 border-t border-border">
                <Button
                  type="button" variant="secondary"
                  onClick={() => navigate("/employee/new-request")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: E04 — REQUEST MISSION
// ═══════════════════════════════════════════════════════════════════════════════

function MissionRequestPage() {
  const { session } = useAuth();
  const { employees, createMissionRequest } = useStore();
  const navigate = useNavigate();

  const manager = getManagerForEmployee(employees, session!.user.id);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function clearErr(field: string) {
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  }

  if (!manager) {
    return (
      <DashboardShell activeNavId="requests" pageTitle="Request Mission">
        <Alert variant="error">
          <p className="text-sm text-red-800">
            No direct manager is assigned to your account. Please contact HR before submitting requests.
          </p>
        </Alert>
      </DashboardShell>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateMissionFields({ startDate, startTime, endDate, endTime, location, purpose });
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 700));
    const result = createMissionRequest(session!.user.id, session!.user.name, {
      startDate, startTime, endDate, endTime, location, purpose,
    });
    setSubmitting(false);
    if (!result.ok) {
      setErrors((result as { ok: false; errors: Record<string, string> }).errors);
      return;
    }
    navigate(`/employee/requests/${result.request.id}`, {
      replace: true, state: { justSubmitted: true },
    });
  }

  return (
    <DashboardShell activeNavId="requests" pageTitle="Request Mission">
      <div className="max-w-2xl">
        <button
          onClick={() => navigate("/employee/new-request")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Request Type
        </button>
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Mission Request</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete the form below to submit your mission request.
            </p>
          </div>
          {errors._form && (
            <Alert variant="error" className="mb-5">
              <p className="text-sm text-red-800">{errors._form}</p>
            </Alert>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="Start Date *"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); clearErr("startDate"); }}
                  error={errors.startDate}
                />
                <TimePicker
                  label="Start Time *"
                  value={startTime}
                  onChange={(e) => { setStartTime(e.target.value); clearErr("startTime"); }}
                  error={errors.startTime}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <DatePicker
                  label="End Date *"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); clearErr("endDate"); }}
                  error={errors.endDate}
                />
                <TimePicker
                  label="End Time *"
                  value={endTime}
                  onChange={(e) => { setEndTime(e.target.value); clearErr("endTime"); }}
                  error={errors.endTime}
                />
              </div>
              <Input
                label="Location *"
                placeholder="e.g. Client Office, Cairo"
                value={location}
                onChange={(e) => { setLocation(e.target.value); clearErr("location"); }}
                error={errors.location}
              />
              <Textarea
                label="Purpose *"
                placeholder="Describe the purpose and objectives of this mission..."
                value={purpose}
                onChange={(e) => { setPurpose(e.target.value); clearErr("purpose"); }}
                error={errors.purpose}
                rows={3}
              />
              <ApproverInfo name={manager.name} />
              <div className="flex items-center gap-3 pt-1 border-t border-border">
                <Button
                  type="button" variant="secondary"
                  onClick={() => navigate("/employee/new-request")}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: E06 — REQUEST DETAIL (employee view)
// ═══════════════════════════════════════════════════════════════════════════════

function EmployeeRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { requests } = useStore();
  const navigate = useNavigate();

  const justSubmitted = location.state?.justSubmitted === true;
  const request = requests.find((r) => r.id === id);

  if (!request) return <Navigate to="/employee/requests" replace />;

  return (
    <DashboardShell activeNavId="requests" pageTitle="Request Details">
      <div className="max-w-2xl">
        <button
          onClick={() => navigate("/employee/requests")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Requests
        </button>

        {justSubmitted && (
          <Alert variant="success" className="mb-5">
            <p className="font-medium text-green-800 text-sm">Request submitted successfully</p>
            <p className="text-sm text-green-700 mt-0.5">
              Your request has been sent to your direct manager for approval.
            </p>
          </Alert>
        )}

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{request.requestNumber}</p>
            <h2 className="text-lg font-semibold text-foreground mt-0.5">
              {request.type === "LEAVE" ? `${request.leaveType} Request` : "Mission Request"}
            </h2>
          </div>
          <StatusBadge status={STATUS_BADGE[request.status]} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-xs text-muted-foreground">Employee</dt>
                <dd className="text-sm text-foreground mt-0.5">{request.employeeName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Direct Manager</dt>
                <dd className="text-sm text-foreground mt-0.5">{request.managerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Request Type</dt>
                <dd className="text-sm text-foreground mt-0.5">
                  {request.type === "LEAVE" ? "Leave" : "Mission"}
                </dd>
              </div>
              {request.type === "LEAVE" && (
                <div>
                  <dt className="text-xs text-muted-foreground">Leave Type</dt>
                  <dd className="text-sm text-foreground mt-0.5">{request.leaveType}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">
                  {request.type === "LEAVE" ? "Period" : "Start"}
                </dt>
                <dd className="text-sm text-foreground mt-0.5">
                  {request.type === "LEAVE"
                    ? `${fmtDate(request.startDate)} — ${fmtDate(request.endDate)}`
                    : fmtDateTime(request.startDate, request.startTime)}
                </dd>
              </div>
              {request.type === "MISSION" && (
                <div>
                  <dt className="text-xs text-muted-foreground">End</dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {fmtDateTime(request.endDate, request.endTime)}
                  </dd>
                </div>
              )}
              {request.type === "MISSION" && request.location && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Location</dt>
                  <dd className="text-sm text-foreground mt-0.5">{request.location}</dd>
                </div>
              )}
              {(request.reason || request.purpose) && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    {request.type === "LEAVE" ? "Reason" : "Purpose"}
                  </dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {request.reason ?? request.purpose}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Submitted</dt>
                <dd className="text-sm text-foreground mt-0.5">
                  {new Date(request.submittedAt).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
            {request.status === "REJECTED" && request.decisionComment && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Manager Comment
                </p>
                <div className="rounded-[8px] bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-800">{request.decisionComment}</p>
                </div>
              </div>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>
              <RequestTimeline request={request} />
            </Card>
            {justSubmitted && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate("/employee/dashboard")}
              >
                Back to Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: E05 — MY REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

function EmployeeRequestsPage() {
  const { session } = useAuth();
  const { requests } = useStore();
  const navigate = useNavigate();

  const myRequests = [...requests.filter((r) => r.employeeId === session!.user.id)].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <DashboardShell activeNavId="requests" pageTitle="My Requests">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">My Requests</h2>
        <Button variant="primary" onClick={() => navigate("/employee/new-request")}>
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>
      {myRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground/40" />}
            title="No requests yet"
            description="Submit a leave or mission request to get started."
            action={
              <Button variant="primary" onClick={() => navigate("/employee/new-request")}>
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            }
          />
        </Card>
      ) : (
        <Table
          data={myRequests}
          columns={[
            {
              key: "requestNumber",
              header: "Request #",
              render: (r) => <span className="font-medium text-sm">{r.requestNumber}</span>,
            },
            {
              key: "type",
              header: "Type",
              render: (r) => (
                <span className="text-sm text-foreground">
                  {r.type === "LEAVE" ? r.leaveType : "Mission"}
                </span>
              ),
            },
            {
              key: "startDate",
              header: "Period",
              render: (r) => (
                <span className="text-sm text-muted-foreground">
                  {r.type === "LEAVE"
                    ? `${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}`
                    : `${fmtDate(r.startDate)} ${r.startTime ?? ""}`}
                </span>
              ),
            },
            {
              key: "submittedAt",
              header: "Submitted",
              render: (r) => (
                <span className="text-sm text-muted-foreground">{fmtRelative(r.submittedAt)}</span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={STATUS_BADGE[r.status]} />,
            },
          ]}
          onRowClick={(r) => navigate(`/employee/requests/${r.id}`)}
          keyExtractor={(r) => r.id}
        />
      )}
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: EMPLOYEE NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function EmployeeNotificationsPage() {
  const { session } = useAuth();
  const { notifications, markNotificationRead } = useStore();
  const navigate = useNavigate();

  const myNotifs = [...notifications.filter((n) => n.userId === session!.user.id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  function handleClick(n: NotificationRecord) {
    markNotificationRead(n.id);
    navigate(`/employee/requests/${n.requestId}`);
  }

  return (
    <DashboardShell activeNavId="notifications" pageTitle="Notifications">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-foreground mb-5">Notifications</h2>
        {myNotifs.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Bell className="h-8 w-8 text-muted-foreground/40" />}
              title="No notifications"
              description="You'll be notified here when your requests are approved or rejected."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {myNotifs.map((n) => (
              <button
                key={n.id}
                className={cn(
                  "flex items-start gap-4 rounded-[10px] border p-4 text-left transition-colors w-full",
                  n.read
                    ? "border-border bg-card hover:bg-muted/30"
                    : "border-primary/20 bg-accent/50 hover:bg-accent"
                )}
                onClick={() => handleClick(n)}
              >
                <div className={cn(
                  "mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                  n.type === "REQUEST_APPROVED" ? "bg-green-100" :
                  n.type === "REQUEST_REJECTED" ? "bg-red-100" : "bg-primary/10"
                )}>
                  {n.type === "REQUEST_APPROVED" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-700" />
                  ) : n.type === "REQUEST_REJECTED" ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : (
                    <BellRing className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtRelative(n.createdAt)}</p>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: MANAGER DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerDashboardPage() {
  const { session } = useAuth();
  const { requests } = useStore();
  const navigate = useNavigate();

  const myRequests = requests.filter((r) => r.managerId === session!.user.id);
  const pending = myRequests.filter((r) => r.status === "PENDING");
  const recentPending = [...pending]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5);

  return (
    <DashboardShell activeNavId="dashboard" pageTitle="Dashboard">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending Approval", value: pending.length, highlight: pending.length > 0 },
          { label: "Total Requests", value: myRequests.length, highlight: false },
          {
            label: "Approved",
            value: myRequests.filter((r) => r.status === "APPROVED").length,
            highlight: false,
          },
        ].map(({ label, value, highlight }) => (
          <div key={label} className="contents">
            <Card padding={false}>
              <div className="p-4">
                <p className={cn("text-2xl font-semibold", highlight && value > 0 ? "text-primary" : "text-foreground")}>
                  {value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Pending Requests</h3>
          {myRequests.length > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={() => navigate("/manager/requests")}>
              View all
            </button>
          )}
        </div>
        {recentPending.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />}
            title="No pending requests"
            description="New requests from your team will appear here."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {recentPending.map((r) => (
              <button
                key={r.id}
                className="flex items-center gap-4 py-3 text-left hover:bg-muted/40 -mx-2 px-2 rounded-[6px] transition-colors"
                onClick={() => navigate(`/manager/requests/${r.id}`)}
              >
                <Avatar name={r.employeeName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.employeeName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.type === "LEAVE" ? r.leaveType : "Mission"} ·{" "}
                    {r.type === "LEAVE"
                      ? `${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}`
                      : fmtDate(r.startDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status="pending" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}

// ─── Employee detail view (inside modal) ──────────────────────────────────────

function EmployeeDetailView({
  employee,
  managerName,
}: {
  employee: EmployeeProfile;
  managerName: string;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Employee ID", value: employee.id },
    { label: "Position", value: employee.position },
    { label: "Department", value: employee.department },
    { label: "Email", value: employee.email },
    ...(employee.phone ? [{ label: "Phone", value: employee.phone }] : []),
    { label: "Direct Manager", value: managerName },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <Avatar name={employee.name} size="lg" />
        <div>
          <p className="text-base font-semibold text-foreground">{employee.name}</p>
          <p className="text-sm text-muted-foreground">{employee.position} · {employee.department}</p>
          <div className="mt-1.5">
            <StatusBadge status={employee.status === "ACTIVE" ? "active" : "inactive"} />
          </div>
        </div>
      </div>

      {/* Detail rows */}
      <div className="rounded-[10px] border border-border divide-y divide-border">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center gap-4 px-4 py-3">
            <p className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</p>
            <p className="text-sm text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground/60">
        Employee details are view-only. Contact HR to make changes.
      </p>
    </div>
  );
}

// ─── Manager Team Page ────────────────────────────────────────────────────────

function ManagerTeamPage() {
  const { session } = useAuth();
  const { employees } = useStore();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmployeeProfile | null>(null);
  const [team, setTeam] = useState<EmployeeProfile[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Security: manager ID always comes from the authenticated session, never from a URL param.
        const members = getTeamForManager(employees, session!.user.id);
        setTeam(members);
        setLoadState("done");
      } catch {
        setLoadState("error");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [session, employees]);

  if (loadState === "loading") {
    return (
      <DashboardShell activeNavId="team" pageTitle="My Team">
        <LoadingState message="Loading your team..." />
      </DashboardShell>
    );
  }

  if (loadState === "error") {
    return (
      <DashboardShell activeNavId="team" pageTitle="My Team">
        <ErrorState
          title="Something went wrong"
          description="We couldn't load your team. Please try again."
          action={
            <Button variant="primary" onClick={() => setLoadState("loading")}>
              Try Again
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  const activeCount = team.filter((e) => e.status === "ACTIVE").length;
  const q = search.toLowerCase().trim();
  const filtered = q
    ? team.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q)
      )
    : team;

  return (
    <DashboardShell activeNavId="team" pageTitle="My Team">
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">My Team</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Employees who report directly to you.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <Card padding={false}>
          <div className="p-4">
            <p className="text-2xl font-semibold text-foreground">{team.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Direct Reports</p>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4">
            <p className="text-2xl font-semibold text-foreground">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
          </div>
        </Card>
      </div>

      {team.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-8 w-8 text-muted-foreground/40" />}
            title="No team members yet"
            description="Employees assigned to you will appear here."
          />
        </Card>
      ) : (
        <>
          {/* Search */}
          <div className="mb-4">
            <Input
              placeholder="Search team members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Search className="h-6 w-6 text-muted-foreground/40" />}
                title="No results"
                description={`No team members match "${search}".`}
              />
            </Card>
          ) : (
            <Table
              data={filtered}
              columns={[
                {
                  key: "name",
                  header: "Name",
                  render: (e) => (
                    <div className="flex items-center gap-3">
                      <Avatar name={e.name} size="sm" />
                      <span className="text-sm font-medium text-foreground">{e.name}</span>
                    </div>
                  ),
                },
                {
                  key: "id",
                  header: "Employee ID",
                  render: (e) => (
                    <span className="text-sm text-muted-foreground font-mono">{e.id}</span>
                  ),
                },
                {
                  key: "position",
                  header: "Position",
                  render: (e) => <span className="text-sm text-foreground">{e.position}</span>,
                },
                {
                  key: "department",
                  header: "Department",
                  render: (e) => <span className="text-sm text-muted-foreground">{e.department}</span>,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (e) => (
                    <StatusBadge status={e.status === "ACTIVE" ? "active" : "inactive"} />
                  ),
                },
              ]}
              onRowClick={(e) => setSelected(e)}
              keyExtractor={(e) => e.id}
            />
          )}
        </>
      )}

      {/* Employee detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Employee Details"
        size="md"
      >
        {selected && (
          <EmployeeDetailView
            employee={selected}
            managerName={session!.user.name}
          />
        )}
      </Modal>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: MANAGER REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerRequestsPage() {
  const { session } = useAuth();
  const { requests } = useStore();
  const navigate = useNavigate();

  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterType, setFilterType] = useState<"" | "LEAVE" | "MISSION">("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const myRequests = [...requests.filter((r) => r.managerId === session!.user.id)].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  const employeeOptions = Array.from(new Set(myRequests.map((r) => r.employeeName))).sort();

  const hasFilters = !!(filterEmployee || filterType || filterDateFrom || filterDateTo);

  function clearFilters() {
    setFilterEmployee("");
    setFilterType("");
    setFilterDateFrom("");
    setFilterDateTo("");
  }

  const filtered = myRequests.filter((r) => {
    if (filterEmployee && r.employeeName !== filterEmployee) return false;
    if (filterType && r.type !== filterType) return false;
    // Date range filters against the request's start date
    if (filterDateFrom && r.startDate && r.startDate < filterDateFrom) return false;
    if (filterDateTo && r.startDate && r.startDate > filterDateTo) return false;
    return true;
  });

  const tableColumns = [
    {
      key: "requestNumber",
      header: "Request #",
      render: (r: RequestRecord) => <span className="font-medium text-sm">{r.requestNumber}</span>,
    },
    {
      key: "employeeName",
      header: "Employee",
      render: (r: RequestRecord) => (
        <div className="flex items-center gap-2">
          <Avatar name={r.employeeName} size="sm" />
          <span className="text-sm">{r.employeeName}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r: RequestRecord) => (
        <span className="text-sm text-foreground">
          {r.type === "LEAVE" ? r.leaveType : "Mission"}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Period",
      render: (r: RequestRecord) => (
        <span className="text-sm text-muted-foreground">
          {r.type === "LEAVE"
            ? `${fmtDate(r.startDate)} — ${fmtDate(r.endDate)}`
            : fmtDate(r.startDate)}
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      render: (r: RequestRecord) => (
        <span className="text-sm text-muted-foreground">{fmtRelative(r.submittedAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: RequestRecord) => <StatusBadge status={STATUS_BADGE[r.status]} />,
    },
  ];

  return (
    <DashboardShell activeNavId="requests" pageTitle="Requests">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">Requests</h2>
        {hasFilters && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {myRequests.length}
          </p>
        )}
      </div>

      {/* Filter bar — only shown when there are requests to filter */}
      {myRequests.length > 0 && (
        <div className="rounded-[12px] border border-border bg-card shadow-sm p-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select
              label="Employee"
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
            >
              <option value="">All Employees</option>
              {employeeOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>

            <Select
              label="Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "" | "LEAVE" | "MISSION")}
            >
              <option value="">All Types</option>
              <option value="LEAVE">Leave</option>
              <option value="MISSION">Mission</option>
            </Select>

            <DatePicker
              label="Date From"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              placeholder="Start of range"
            />

            <DatePicker
              label="Date To"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              placeholder="End of range"
            />
          </div>

          {hasFilters && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {filtered.length === myRequests.length
                  ? "Showing all requests"
                  : `${filtered.length} of ${myRequests.length} requests match`}
              </p>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {myRequests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground/40" />}
            title="No requests yet"
            description="Requests from your team will appear here once they are submitted."
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Search className="h-8 w-8 text-muted-foreground/40" />}
            title="No matching requests"
            description="Try adjusting your filters to find what you're looking for."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            }
          />
        </Card>
      ) : (
        <Table
          data={filtered}
          columns={tableColumns}
          onRowClick={(r) => navigate(`/manager/requests/${r.id}`)}
          keyExtractor={(r) => r.id}
        />
      )}
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: MANAGER REQUEST DETAIL (approve / reject)
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { requests, approveRequest, rejectRequest } = useStore();
  const { session } = useAuth();
  const navigate = useNavigate();

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [rejectErr, setRejectErr] = useState("");
  const [loading, setLoading] = useState(false);

  const request = requests.find((r) => r.id === id);
  if (!request) return <Navigate to="/manager/requests" replace />;
  if (request.managerId !== session!.user.id) return <Navigate to="/access-denied" replace />;

  const isPending = request.status === "PENDING";

  async function handleApprove() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    approveRequest(request!.id, session!.user.id);
    setLoading(false);
  }

  async function handleReject() {
    if (!rejectComment.trim()) {
      setRejectErr("A comment is required when rejecting a request.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    rejectRequest(request!.id, session!.user.id, rejectComment.trim());
    setShowRejectModal(false);
    setRejectComment("");
    setLoading(false);
  }

  return (
    <DashboardShell activeNavId="requests" pageTitle="Request Details">
      <div className="max-w-2xl">
        <button
          onClick={() => navigate("/manager/requests")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </button>

        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{request.requestNumber}</p>
            <h2 className="text-lg font-semibold text-foreground mt-0.5">
              {request.type === "LEAVE" ? `${request.leaveType} Request` : "Mission Request"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submitted by {request.employeeName} · {fmtRelative(request.submittedAt)}
            </p>
          </div>
          <StatusBadge status={STATUS_BADGE[request.status]} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-xs text-muted-foreground">Employee</dt>
                <dd className="text-sm text-foreground mt-0.5">
                  <div className="flex items-center gap-2">
                    <Avatar name={request.employeeName} size="sm" />
                    {request.employeeName}
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Request Type</dt>
                <dd className="text-sm text-foreground mt-0.5">
                  {request.type === "LEAVE" ? "Leave" : "Mission"}
                </dd>
              </div>
              {request.type === "LEAVE" && (
                <div>
                  <dt className="text-xs text-muted-foreground">Leave Type</dt>
                  <dd className="text-sm text-foreground mt-0.5">{request.leaveType}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">
                  {request.type === "LEAVE" ? "Period" : "Start"}
                </dt>
                <dd className="text-sm text-foreground mt-0.5">
                  {request.type === "LEAVE"
                    ? `${fmtDate(request.startDate)} — ${fmtDate(request.endDate)}`
                    : fmtDateTime(request.startDate, request.startTime)}
                </dd>
              </div>
              {request.type === "MISSION" && (
                <div>
                  <dt className="text-xs text-muted-foreground">End</dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {fmtDateTime(request.endDate, request.endTime)}
                  </dd>
                </div>
              )}
              {request.type === "MISSION" && request.location && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Location</dt>
                  <dd className="text-sm text-foreground mt-0.5">{request.location}</dd>
                </div>
              )}
              {(request.reason || request.purpose) && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">
                    {request.type === "LEAVE" ? "Reason" : "Purpose"}
                  </dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {request.reason ?? request.purpose}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Submitted</dt>
                <dd className="text-sm text-foreground mt-0.5">
                  {new Date(request.submittedAt).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </dd>
              </div>
            </dl>

            {request.status === "REJECTED" && request.decisionComment && (
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Your Comment</p>
                <div className="rounded-[8px] bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm text-red-800">{request.decisionComment}</p>
                </div>
              </div>
            )}

            {isPending && (
              <div className="mt-5 pt-5 border-t border-border flex items-center gap-3">
                <Button variant="primary" onClick={handleApprove} loading={loading}>
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>
            <RequestTimeline request={request} />
          </Card>
        </div>
      </div>

      <Modal
        open={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectComment(""); setRejectErr(""); }}
        title="Reject Request"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Provide a reason for rejection. The employee will see your comment.
          </p>
          <Textarea
            label="Comment *"
            placeholder="Explain the reason for rejection..."
            value={rejectComment}
            onChange={(e) => { setRejectComment(e.target.value); if (rejectErr) setRejectErr(""); }}
            error={rejectErr}
            rows={4}
          />
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => { setShowRejectModal(false); setRejectComment(""); setRejectErr(""); }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} loading={loading}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: MANAGER NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function ManagerNotificationsPage() {
  const { session } = useAuth();
  const { notifications, markNotificationRead } = useStore();
  const navigate = useNavigate();

  const myNotifs = [...notifications.filter((n) => n.userId === session!.user.id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  function handleClick(n: NotificationRecord) {
    markNotificationRead(n.id);
    navigate(`/manager/requests/${n.requestId}`);
  }

  return (
    <DashboardShell activeNavId="notifications" pageTitle="Notifications">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-foreground mb-5">Notifications</h2>
        {myNotifs.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Bell className="h-8 w-8 text-muted-foreground/40" />}
              title="No notifications"
              description="You'll be notified here when team members submit requests."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {myNotifs.map((n) => (
              <button
                key={n.id}
                className={cn(
                  "flex items-start gap-4 rounded-[10px] border p-4 text-left transition-colors w-full",
                  n.read
                    ? "border-border bg-card hover:bg-muted/30"
                    : "border-primary/20 bg-accent/50 hover:bg-accent"
                )}
                onClick={() => handleClick(n)}
              >
                <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BellRing className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtRelative(n.createdAt)}</p>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGES: HR ADMINISTRATION
// ═══════════════════════════════════════════════════════════════════════════════

// ─── H01 — HR Dashboard ───────────────────────────────────────────────────────

function HRDashboardPage() {
  const { requests, employees, notifications } = useStore();
  const navigate = useNavigate();

  const totalEmp = employees.length;
  const activeEmp = employees.filter((e) => e.status === "ACTIVE").length;
  const totalReq = requests.length;
  const pending = requests.filter((r) => r.status === "PENDING").length;
  const approved = requests.filter((r) => r.status === "APPROVED").length;
  const rejected = requests.filter((r) => r.status === "REJECTED").length;

  const recent = [...requests]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 8);

  const stats = [
    { label: "Total Employees", value: totalEmp, highlight: false },
    { label: "Active Employees", value: activeEmp, highlight: false },
    { label: "Total Requests", value: totalReq, highlight: false },
    { label: "Pending", value: pending, highlight: pending > 0 },
    { label: "Approved", value: approved, highlight: false },
    { label: "Rejected", value: rejected, highlight: false },
  ];

  return (
    <DashboardShell activeNavId="dashboard" pageTitle="Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {stats.map(({ label, value, highlight }) => (
          <div key={label} className="contents">
            <Card padding={false}>
              <div className="p-4">
                <p className={cn("text-2xl font-semibold", highlight && value > 0 ? "text-primary" : "text-foreground")}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="primary" onClick={() => navigate("/hr/employees")} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
        <Button variant="secondary" onClick={() => navigate("/hr/requests")}>
          View All Requests
        </Button>
        <Button variant="secondary" onClick={() => navigate("/hr/employees")}>
          View Employees
        </Button>
      </div>

      {/* Recent requests */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Recent Requests</h3>
          {requests.length > 0 && (
            <button className="text-xs text-primary hover:underline" onClick={() => navigate("/hr/requests")}>
              View all
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8 text-muted-foreground/40" />}
            title="No requests yet"
            description="Employee requests will appear here."
          />
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Request #", "Employee", "Type", "Period", "Manager", "Status", "Submitted"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/hr/requests/${r.id}`)}
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{r.requestNumber}</td>
                    <td className="py-2.5 pr-4 font-medium">{r.employeeName}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{r.type === "LEAVE" ? (r.leaveType ?? "Leave") : "Mission"}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground whitespace-nowrap">
                      {r.type === "LEAVE" ? `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}` : `${fmtDate(r.startDate)} ${r.startTime ?? ""}`}
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{r.managerName}</td>
                    <td className="py-2.5 pr-4"><StatusBadge status={STATUS_BADGE[r.status]} /></td>
                    <td className="py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(r.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}

// ─── Employee form (used by Add and Edit) ─────────────────────────────────────

interface EmployeeFormData {
  firstName: string; lastName: string; email: string; phone: string;
  position: string; department: string; role: UserRole;
  managerId: string; status: "ACTIVE" | "INACTIVE"; password: string;
}

function EmployeeForm({
  initial,
  managers,
  errors,
  onChange,
  isEdit,
}: {
  initial: EmployeeFormData;
  managers: EmployeeProfile[];
  errors: Record<string, string>;
  onChange: (next: EmployeeFormData) => void;
  isEdit: boolean;
}) {
  function field<K extends keyof EmployeeFormData>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...initial, [key]: e.target.value });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First Name *" value={initial.firstName} onChange={field("firstName")} error={errors.firstName} placeholder="First name" />
        <Input label="Last Name *" value={initial.lastName} onChange={field("lastName")} error={errors.lastName} placeholder="Last name" />
      </div>
      <Input label="Email *" type="email" value={initial.email} onChange={field("email")} error={errors.email} placeholder="email@company.com" />
      <Input label="Phone" value={initial.phone} onChange={field("phone")} placeholder="+20 10 0000 0000" />
      <Input label="Position *" value={initial.position} onChange={field("position")} error={errors.position} placeholder="e.g. Frontend Developer" />
      <Select label="Department *" value={initial.department} onChange={field("department")} error={errors.department}>
        <option value="">Select Department</option>
        {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
      </Select>
      <Select label="Role *" value={initial.role} onChange={field("role")} error={errors.role}>
        <option value="">Select Role</option>
        <option value="EMPLOYEE">Employee</option>
        <option value="MANAGER">Manager</option>
        <option value="HR">HR</option>
      </Select>
      <Select label="Direct Manager" value={initial.managerId} onChange={field("managerId")} error={errors.managerId}>
        <option value="">None</option>
        {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </Select>
      <Select label="Account Status" value={initial.status} onChange={field("status")}>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
      </Select>
      {!isEdit && (
        <Input label="Initial Password *" type="text" value={initial.password} onChange={field("password")} error={errors.password} placeholder="Temporary password for this employee" />
      )}
    </div>
  );
}

// ─── H02 — HR Employees ───────────────────────────────────────────────────────

const EMPTY_FORM: EmployeeFormData = {
  firstName: "", lastName: "", email: "", phone: "",
  position: "", department: "", role: "EMPLOYEE" as UserRole,
  managerId: "", status: "ACTIVE", password: "",
};

function HREmployeesPage() {
  const { employees, createEmployee, updateEmployee } = useStore();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"" | UserRole>("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "ACTIVE" | "INACTIVE">("");

  // Add employee modal
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<EmployeeFormData>(EMPTY_FORM);
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addResult, setAddResult] = useState<{ employee: EmployeeProfile; password: string } | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // Edit employee modal
  const [editTarget, setEditTarget] = useState<EmployeeProfile | null>(null);
  const [editForm, setEditForm] = useState<EmployeeFormData>(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  // View detail modal
  const [viewTarget, setViewTarget] = useState<EmployeeProfile | null>(null);

  const eligibleManagers = getEligibleManagers(employees);

  // Filtering
  const q = search.toLowerCase().trim();
  const filtered = employees.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false;
    if (filterRole && e.role !== filterRole) return false;
    if (filterDept && e.department !== filterDept) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });

  function openEdit(emp: EmployeeProfile) {
    setEditTarget(emp);
    setEditForm({
      firstName: emp.firstName, lastName: emp.lastName, email: emp.email,
      phone: emp.phone ?? "", position: emp.position, department: emp.department,
      role: emp.role, managerId: emp.managerId ?? "", status: emp.status, password: "",
    });
    setEditErrors({});
  }

  async function handleAdd() {
    const errs = validateEmployeeFields(
      { ...addForm, managerId: addForm.managerId || undefined },
      employees
    );
    if (!addForm.password.trim()) errs.password = "Initial password is required.";
    if (Object.keys(errs).length > 0) { setAddErrors(errs); return; }
    setAddSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    const result = createEmployee({
      ...addForm,
      managerId: addForm.managerId || null,
      phone: addForm.phone || undefined,
    });
    setAddSaving(false);
    if (!result.ok) { setAddErrors((result as { ok: false; errors: Record<string, string> }).errors); return; }
    setAddResult({ employee: result.employee, password: result.password });
  }

  async function handleEdit() {
    if (!editTarget) return;
    const errs = validateEmployeeFields(
      { ...editForm, managerId: editForm.managerId || undefined },
      employees, editTarget.id
    );
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setEditSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    updateEmployee(editTarget.id, {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      name: `${editForm.firstName.trim()} ${editForm.lastName.trim()}`,
      email: editForm.email.trim().toLowerCase(),
      phone: editForm.phone.trim() || undefined,
      position: editForm.position.trim(),
      department: editForm.department,
      role: editForm.role,
      managerId: editForm.managerId || null,
      status: editForm.status,
    });
    setEditSaving(false);
    setEditTarget(null);
  }

  return (
    <DashboardShell activeNavId="employees" pageTitle="Employees">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as "" | UserRole)}
        >
          <option value="">All Roles</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="HR">HR</option>
        </select>
        <select
          className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as "" | "ACTIVE" | "INACTIVE")}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <Button variant="primary" onClick={() => { setShowAdd(true); setAddForm(EMPTY_FORM); setAddErrors({}); setAddResult(null); }} className="gap-1.5 flex-shrink-0">
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground mb-3">{filtered.length} of {employees.length} employees</p>

      {/* Table */}
      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Users className="h-8 w-8 text-muted-foreground/40" />} title="No employees found" description="Try adjusting your search or filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Employee", "Employee ID", "Position", "Department", "Manager", "Role", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((emp) => {
                  const mgr = employees.find((e) => e.id === emp.managerId);
                  return (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp.name} size="sm" />
                          <button className="font-medium hover:text-primary transition-colors" onClick={() => setViewTarget(emp)}>
                            {emp.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.id}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.position}</td>
                      <td className="px-4 py-3 text-muted-foreground">{emp.department}</td>
                      <td className="px-4 py-3 text-muted-foreground">{mgr ? mgr.name : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{emp.role.charAt(0) + emp.role.slice(1).toLowerCase()}</td>
                      <td className="px-4 py-3"><StatusBadge status={emp.status === "ACTIVE" ? "active" : "inactive"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(emp)}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => updateEmployee(emp.id, { status: emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {emp.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Employee Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Employee"
        size="lg"
        footer={
          addResult ? (
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => { setShowAdd(false); setAddResult(null); }}>Back to Employees</Button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowAdd(false)} disabled={addSaving}>Cancel</Button>
              <Button variant="primary" onClick={handleAdd} loading={addSaving}>{addSaving ? "Creating…" : "Create Employee"}</Button>
            </div>
          )
        }
      >
        {addResult ? (
          <div className="flex flex-col gap-4">
            <Alert variant="success">
              <p className="text-sm font-medium">Employee created successfully.</p>
            </Alert>
            <div className="rounded-[10px] border border-border divide-y divide-border">
              {[
                { label: "Employee ID", value: addResult.employee.id },
                { label: "Name", value: addResult.employee.name },
                { label: "Role", value: addResult.employee.role },
                { label: "Manager", value: employees.find((e) => e.id === addResult.employee.managerId)?.name ?? "None" },
                { label: "Status", value: addResult.employee.status },
                { label: "Temp Password", value: addResult.password },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-4 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</p>
                  <p className="text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Share the temporary password with the employee so they can log in.</p>
          </div>
        ) : (
          <EmployeeForm
            initial={addForm}
            managers={eligibleManagers}
            errors={addErrors}
            onChange={setAddForm}
            isEdit={false}
          />
        )}
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit Employee — ${editTarget?.name ?? ""}`}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleEdit} loading={editSaving}>{editSaving ? "Saving…" : "Save Changes"}</Button>
          </div>
        }
      >
        <EmployeeForm
          initial={editForm}
          managers={eligibleManagers.filter((m) => m.id !== editTarget?.id)}
          errors={editErrors}
          onChange={setEditForm}
          isEdit={true}
        />
      </Modal>

      {/* View Employee Modal */}
      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title="Employee Details" size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setViewTarget(null)}>Close</Button>
            <Button variant="primary" onClick={() => { if (viewTarget) { openEdit(viewTarget); setViewTarget(null); } }}>Edit Employee</Button>
          </div>
        }
      >
        {viewTarget && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Avatar name={viewTarget.name} size="lg" />
              <div>
                <p className="text-base font-semibold">{viewTarget.name}</p>
                <p className="text-sm text-muted-foreground">{viewTarget.position} · {viewTarget.department}</p>
                <div className="mt-1.5"><StatusBadge status={viewTarget.status === "ACTIVE" ? "active" : "inactive"} /></div>
              </div>
            </div>
            <div className="rounded-[10px] border border-border divide-y divide-border">
              {[
                { label: "Employee ID", value: viewTarget.id },
                { label: "Email", value: viewTarget.email },
                ...(viewTarget.phone ? [{ label: "Phone", value: viewTarget.phone }] : []),
                { label: "Role", value: viewTarget.role.charAt(0) + viewTarget.role.slice(1).toLowerCase() },
                { label: "Department", value: viewTarget.department },
                { label: "Direct Manager", value: employees.find((e) => e.id === viewTarget.managerId)?.name ?? "None" },
                { label: "Direct Reports", value: String(employees.filter((e) => e.managerId === viewTarget.id).length) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-4 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</p>
                  <p className="text-sm">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}

// ─── H04 — HR Requests ────────────────────────────────────────────────────────

function HRRequestsPage() {
  const { requests, employees } = useStore();
  const navigate = useNavigate();

  const [filterManager, setFilterManager] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterType, setFilterType] = useState<"" | "LEAVE" | "MISSION">("");
  const [filterStatus, setFilterStatus] = useState<"" | "PENDING" | "APPROVED" | "REJECTED">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Build unique manager list from actual request data (preserves historical)
  const allManagers = Array.from(
    new Map(requests.map((r) => [r.managerId, r.managerName])).entries()
  ).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

  const allEmployees = Array.from(
    new Map(requests.map((r) => [r.employeeId, r.employeeName])).entries()
  ).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));

  const hasFilters = !!(filterManager || filterEmployee || filterType || filterStatus || filterFrom || filterTo);

  function clearFilters() {
    setFilterManager(""); setFilterEmployee(""); setFilterType(""); setFilterStatus(""); setFilterFrom(""); setFilterTo("");
  }

  const filtered = requests.filter((r) => {
    if (filterManager && r.managerId !== filterManager) return false;
    if (filterEmployee && r.employeeId !== filterEmployee) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterFrom && r.submittedAt < filterFrom) return false;
    if (filterTo && r.submittedAt.slice(0, 10) > filterTo) return false;
    return true;
  }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return (
    <DashboardShell activeNavId="requests" pageTitle="All Requests">
      {/* Filter bar */}
      <Card className="mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>
            <option value="">All Managers</option>
            {allManagers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
            <option value="">All Employees</option>
            {allEmployees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={filterType} onChange={(e) => setFilterType(e.target.value as "" | "LEAVE" | "MISSION")}>
            <option value="">All Types</option>
            <option value="LEAVE">Leave</option>
            <option value="MISSION">Mission</option>
          </select>
          <select className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "" | "PENDING" | "APPROVED" | "REJECTED")}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <input type="date" className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} placeholder="From" />
          <input type="date" className="px-3 py-2 rounded-[8px] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} placeholder="To" />
        </div>
        {hasFilters && (
          <div className="mt-3 flex items-center gap-2">
            <p className="text-xs text-muted-foreground">{filtered.length} of {requests.length} requests</p>
            <button onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> Clear Filters
            </button>
          </div>
        )}
      </Card>

      <Card padding={false}>
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<FileText className="h-8 w-8 text-muted-foreground/40" />} title="No requests found" description={hasFilters ? "Try adjusting your filters." : "No requests have been submitted yet."} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Request #", "Employee", "Type", "Leave Type", "Period", "Manager", "Status", "Submitted"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/hr/requests/${r.id}`)}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.requestNumber}</td>
                    <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.leaveType ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {r.type === "LEAVE"
                        ? `${fmtDate(r.startDate)} – ${fmtDate(r.endDate)}`
                        : `${fmtDate(r.startDate)} ${r.startTime ?? ""} – ${fmtDate(r.endDate)} ${r.endTime ?? ""}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.managerName}</td>
                    <td className="px-4 py-3"><StatusBadge status={STATUS_BADGE[r.status]} /></td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtDate(r.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardShell>
  );
}

// ─── H05 — HR Request Detail ──────────────────────────────────────────────────

function HRRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { requests, employees } = useStore();
  const navigate = useNavigate();

  const request = requests.find((r) => r.id === id);

  if (!request) {
    return (
      <DashboardShell activeNavId="requests" pageTitle="Request Detail">
        <Alert variant="error">
          <p className="text-sm">Request not found.</p>
        </Alert>
      </DashboardShell>
    );
  }

  const emp = employees.find((e) => e.id === request.employeeId);

  const details: { label: string; value: string }[] = [
    { label: "Request Number", value: request.requestNumber },
    { label: "Employee", value: request.employeeName },
    { label: "Employee ID", value: request.employeeId },
    { label: "Department", value: emp?.department ?? "—" },
    { label: "Direct Manager", value: request.managerName },
    { label: "Request Type", value: request.type },
    ...(request.leaveType ? [{ label: "Leave Type", value: request.leaveType }] : []),
    { label: "Start Date", value: fmtDate(request.startDate) },
    ...(request.startTime ? [{ label: "Start Time", value: request.startTime }] : []),
    { label: "End Date", value: fmtDate(request.endDate) },
    ...(request.endTime ? [{ label: "End Time", value: request.endTime }] : []),
    ...(request.location ? [{ label: "Location", value: request.location }] : []),
    ...(request.reason ? [{ label: "Reason", value: request.reason }] : []),
    ...(request.purpose ? [{ label: "Purpose", value: request.purpose }] : []),
    { label: "Submitted", value: fmtDate(request.submittedAt) },
    ...(request.decidedAt ? [{ label: "Decided", value: fmtDate(request.decidedAt) }] : []),
    ...(request.decisionComment ? [{ label: "Manager Comment", value: request.decisionComment }] : []),
  ];

  return (
    <DashboardShell activeNavId="requests" pageTitle="Request Detail">
      <div className="max-w-2xl">
        <button
          onClick={() => navigate("/hr/requests")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to All Requests
        </button>

        <Card>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{request.requestNumber}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {request.type === "LEAVE" ? (request.leaveType ?? "Leave") : "Mission"} · {request.employeeName}
              </p>
            </div>
            <StatusBadge status={STATUS_BADGE[request.status]} />
          </div>

          <div className="rounded-[10px] border border-border divide-y divide-border mb-5">
            {details.map(({ label, value }) => (
              <div key={label} className="flex items-start gap-4 px-4 py-2.5">
                <p className="text-xs text-muted-foreground w-32 flex-shrink-0 pt-0.5">{label}</p>
                <p className="text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <Alert variant="info">
            <p className="text-sm text-blue-800">
              HR can view request details. Approval and rejection remain the responsibility of the assigned manager.
            </p>
          </Alert>
        </Card>
      </div>
    </DashboardShell>
  );
}

// ─── H06 — HR Notifications ───────────────────────────────────────────────────

function HRNotificationsPage() {
  const { session } = useAuth();
  const { notifications, markNotificationRead } = useStore();
  const navigate = useNavigate();

  const myNotifs = [...notifications.filter((n) => n.userId === session!.user.id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <DashboardShell activeNavId="notifications" pageTitle="Notifications">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-foreground mb-5">Notifications</h2>
        {myNotifs.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Bell className="h-8 w-8 text-muted-foreground/40" />}
              title="No notifications"
              description="Administrative notifications will appear here."
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {myNotifs.map((n) => (
              <button
                key={n.id}
                className={cn(
                  "flex items-start gap-4 rounded-[10px] border p-4 text-left transition-colors w-full",
                  n.read ? "border-border bg-card hover:bg-muted/30" : "border-primary/20 bg-accent/50 hover:bg-accent"
                )}
                onClick={() => { markNotificationRead(n.id); navigate(`/hr/requests/${n.requestId}`); }}
              >
                <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BellRing className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !n.read && "font-medium")}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtRelative(n.createdAt)}</p>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

// ─── HR Settings — Leave Types ────────────────────────────────────────────────

function HRSettingsPage() {
  const { leaveTypes, createLeaveType, updateLeaveType } = useStore();

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");

  const [editTarget, setEditTarget] = useState<LeaveTypeRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState("");

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) { setAddError("Name is required."); return; }
    if (leaveTypes.some((lt) => lt.name.toLowerCase() === trimmed.toLowerCase())) {
      setAddError("A leave type with this name already exists."); return;
    }
    createLeaveType(trimmed);
    setNewName(""); setShowAdd(false); setAddError("");
  }

  function handleEdit() {
    if (!editTarget) return;
    const trimmed = editName.trim();
    if (!trimmed) { setEditError("Name is required."); return; }
    if (leaveTypes.some((lt) => lt.name.toLowerCase() === trimmed.toLowerCase() && lt.id !== editTarget.id)) {
      setEditError("A leave type with this name already exists."); return;
    }
    updateLeaveType(editTarget.id, { name: trimmed });
    setEditTarget(null); setEditName(""); setEditError("");
  }

  return (
    <DashboardShell activeNavId="settings" pageTitle="Settings">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Leave Types</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage the leave types available to employees.</p>
          </div>
          <Button variant="primary" onClick={() => { setShowAdd(true); setNewName(""); setAddError(""); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Leave Type
          </Button>
        </div>

        {/* Add form inline */}
        {showAdd && (
          <Card className="mb-4">
            <p className="text-sm font-medium mb-3">New Leave Type</p>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Leave type name"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setAddError(""); }}
                  error={addError}
                />
              </div>
              <div className="flex gap-2 pt-0.5">
                <Button variant="primary" onClick={handleAdd}>Save</Button>
                <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        <Card padding={false}>
          {leaveTypes.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Settings className="h-8 w-8 text-muted-foreground/40" />} title="No leave types" description="Add a leave type to get started." />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leaveTypes.map((lt) => (
                <div key={lt.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    {editTarget?.id === lt.id ? (
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => { setEditName(e.target.value); setEditError(""); }}
                            error={editError}
                            placeholder="Leave type name"
                          />
                        </div>
                        <div className="flex gap-2 pt-0.5">
                          <Button variant="primary" onClick={handleEdit}>Save</Button>
                          <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-medium">{lt.name}</p>
                    )}
                  </div>
                  {editTarget?.id !== lt.id && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={lt.status === "ACTIVE" ? "active" : "inactive"} />
                      <button
                        onClick={() => { setEditTarget(lt); setEditName(lt.name); setEditError(""); }}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => updateLeaveType(lt.id, { status: lt.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {lt.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit modal (used for reference display) */}
    </DashboardShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE: A01 — LOGIN
// ═══════════════════════════════════════════════════════════════════════════════

const LOGIN_ERROR_MESSAGES: Partial<Record<LoginState, string>> = {
  invalid_credentials:
    "Invalid Employee ID or password. Please check your credentials and try again.",
  inactive_account:
    "Your account is inactive. Please contact HR for assistance.",
  system_error:
    "Something went wrong. Please try again or contact HR if the problem persists.",
};

function LoginPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loginState, setLoginState] = useState<LoginState>("idle");
  const [fieldErrors, setFieldErrors] = useState<{
    employeeId?: string;
    password?: string;
  }>({});

  // Already authenticated → redirect immediately
  useEffect(() => {
    if (session) {
      navigate(dashboardPath(session.user.role), { replace: true });
    }
  }, [session, navigate]);

  const isSubmitting = loginState === "loading";
  const isSuccess = loginState === "success";
  const accountErrorMsg = LOGIN_ERROR_MESSAGES[loginState];

  function clearAccountError() {
    if (loginState !== "idle" && loginState !== "loading" && loginState !== "success") {
      setLoginState("idle");
    }
  }

  function validate() {
    const errors: { employeeId?: string; password?: string } = {};
    if (!employeeId.trim()) errors.employeeId = "Employee ID is required.";
    if (!password) errors.password = "Password is required.";
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoginState("loading");

    const result = await authSignIn(employeeId, password);

    if (!result.ok) {
      const err = (result as { ok: false; error: "INVALID_CREDENTIALS" | "INACTIVE_ACCOUNT" | "SYSTEM_ERROR" }).error;
      const errorState: LoginState =
        err === "INACTIVE_ACCOUNT"
          ? "inactive_account"
          : err === "SYSTEM_ERROR"
          ? "system_error"
          : "invalid_credentials";
      setLoginState(errorState);
      return;
    }

    login(result.session);
    setLoginState("success");
    // Brief success moment before the router redirects via the useEffect above
    await new Promise((r) => setTimeout(r, 700));
    navigate(dashboardPath(result.session.user.role), { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ── Brand panel ─────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col lg:w-[54%] overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1546628484-186b26f3e572?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080)",
          }}
        />
        {/* Dark blue overlay — 50% opacity */}
        <div className="absolute inset-0" style={{ background: "rgba(10, 37, 71, 0.50)" }} />

        {/* Mobile top bar (when photo panel is collapsed) */}
        <div className="relative z-10 flex items-center gap-3 px-8 py-6 lg:hidden">
          <img src={companyLogoSrc} alt="GEO Egypt Geospatial Hub logo" className="h-8 w-auto object-contain" />
          <span className="text-sm font-medium text-white/80 tracking-wide">HR Portal</span>
        </div>

        {/* Desktop: centered logo block */}
        <div className="relative z-10 hidden lg:flex flex-col flex-1 items-center justify-center px-10">
          <div className="flex flex-col items-center text-center">
            <img
              src={companyLogoSrc}
              alt="GEO Egypt Geospatial Hub logo"
              className="h-20 w-auto object-contain mb-5"
            />
            <p className="text-lg font-semibold text-white tracking-wide">HR Portal</p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 hidden lg:block px-10 py-5 border-t border-white/10">
          <p className="text-xs text-white/40">
            Internal use only. Unauthorized access is prohibited.
          </p>
        </div>
      </div>

      {/* ── Form panel ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-10 lg:px-16 bg-white">
        <div className="w-full max-w-[388px]">
          <div className="mb-8">
            <h2 className="text-[1.625rem] font-semibold text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              Sign in with your employee credentials to access the portal.
            </p>
          </div>

          {isSuccess && (
            <Alert variant="success" className="mb-6">
              <p className="font-medium text-green-800 text-sm">Sign-in successful</p>
              <p className="mt-0.5 text-sm text-green-700">
                Redirecting to your dashboard…
              </p>
            </Alert>
          )}

          {accountErrorMsg && (
            <Alert variant="error" className="mb-6">
              <p className="text-sm text-red-800">{accountErrorMsg}</p>
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-5">
              <Input
                label="Employee ID"
                type="text"
                placeholder="e.g. EMP-00125"
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  clearAccountError();
                  if (fieldErrors.employeeId)
                    setFieldErrors((p) => ({ ...p, employeeId: undefined }));
                }}
                error={fieldErrors.employeeId}
                disabled={isSubmitting || isSuccess}
                autoComplete="username"
                spellCheck={false}
                autoFocus
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearAccountError();
                  if (fieldErrors.password)
                    setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                error={fieldErrors.password}
                disabled={isSubmitting || isSuccess}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                disabled={isSuccess}
                className="w-full mt-1"
              >
                {isSubmitting ? "Signing in…" : "Sign In"}
              </Button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Need help accessing your account?{" "}
            <button
              type="button"
              className="text-primary font-medium hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm"
            >
              Contact HR
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute role="EMPLOYEE" />,
        children: [
          { path: "/employee/dashboard", element: <EmployeeDashboardPage /> },
          { path: "/employee/new-request", element: <NewRequestPage /> },
          { path: "/employee/new-request/leave", element: <LeaveRequestPage /> },
          { path: "/employee/new-request/mission", element: <MissionRequestPage /> },
          { path: "/employee/requests", element: <EmployeeRequestsPage /> },
          { path: "/employee/requests/:id", element: <EmployeeRequestDetailPage /> },
          { path: "/employee/notifications", element: <EmployeeNotificationsPage /> },
          { path: "/employee/*", element: <Navigate to="/employee/dashboard" replace /> },
        ],
      },
      {
        element: <RoleRoute role="MANAGER" />,
        children: [
          { path: "/manager/dashboard", element: <ManagerDashboardPage /> },
          { path: "/manager/team", element: <ManagerTeamPage /> },
          { path: "/manager/requests", element: <ManagerRequestsPage /> },
          { path: "/manager/requests/:id", element: <ManagerRequestDetailPage /> },
          { path: "/manager/notifications", element: <ManagerNotificationsPage /> },
          { path: "/manager/*", element: <Navigate to="/manager/dashboard" replace /> },
        ],
      },
      {
        element: <RoleRoute role="HR" />,
        children: [
          { path: "/hr/dashboard", element: <HRDashboardPage /> },
          { path: "/hr/employees", element: <HREmployeesPage /> },
          { path: "/hr/requests", element: <HRRequestsPage /> },
          { path: "/hr/requests/:id", element: <HRRequestDetailPage /> },
          { path: "/hr/notifications", element: <HRNotificationsPage /> },
          { path: "/hr/settings", element: <HRSettingsPage /> },
          { path: "/hr/*", element: <Navigate to="/hr/dashboard" replace /> },
        ],
      },
    ],
  },
  { path: "/access-denied", element: <AccessDeniedPage /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <RouterProvider router={router} />
      </StoreProvider>
    </AuthProvider>
  );
}
