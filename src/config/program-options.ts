import type {
  AttendanceStatus,
  CoachAssignmentRole,
  EnrollmentStatus,
  ProgramStatus,
  SessionStatus,
} from "@/lib/supabase/types";

export const programStatusOptions: { value: ProgramStatus; label: string; hint: string }[] = [
  { value: "draft", label: "Draft", hint: "Only admins and assigned coaches can see it" },
  { value: "open", label: "Open for registration", hint: "Visible to all families" },
  { value: "active", label: "In progress", hint: "Sessions are running" },
  { value: "completed", label: "Completed", hint: "All sessions are finished" },
  { value: "archived", label: "Archived", hint: "Kept for records" },
];

export const enrollmentStatusOptions: { value: EnrollmentStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "withdrawn", label: "Withdrawn" },
  { value: "completed", label: "Completed" },
];

export const assignmentRoleOptions: { value: CoachAssignmentRole; label: string }[] = [
  { value: "lead", label: "Lead coach" },
  { value: "assistant", label: "Assistant coach" },
];

export const attendanceOptions: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
  { value: "makeup", label: "Makeup" },
];

export const sessionStatusLabels: Record<SessionStatus, string> = {
  scheduled: "Scheduled",
  cancelled: "Cancelled",
  completed: "Completed",
};

/** Roster statuses that count as being on the team for sessions and attendance. */
export const onRosterStatuses: EnrollmentStatus[] = ["active", "pending"];
