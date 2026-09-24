/**
 * Database types for the tables the app reads and writes so far.
 *
 * Hand-written to match supabase/migrations until `supabase gen types` can run
 * in CI. Keep in sync with the migrations; see docs/database.md.
 */

export type AppRole = "parent" | "coach" | "admin";
export type AgeGroup = "youth" | "middle_school" | "high_school";
export type LacrosseProgram = "boys" | "girls";
export type PlayerPosition = "attack" | "midfield" | "faceoff_draw" | "defense" | "lsm" | "goalie";
export type ExperienceLevel = "new" | "one_year" | "two_years" | "three_to_four_years" | "five_plus_years";
export type GuardianRelationship = "parent" | "guardian";
export type ConsentType = "terms_of_service" | "privacy_policy" | "parental_consent";
export type ProgramStatus = "draft" | "open" | "active" | "completed" | "archived";
export type CoachAssignmentRole = "lead" | "assistant";
export type SessionStatus = "scheduled" | "cancelled" | "completed";
export type EnrollmentStatus = "pending" | "active" | "waitlisted" | "withdrawn" | "completed";
export type AttendanceStatus = "present" | "absent" | "excused" | "makeup";

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = {
  id: string;
  role: AppRole;
  first_name: string;
  last_name: string;
  phone: string | null;
} & Timestamps;

export type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: number;
  graduation_year: number;
  age_group: AgeGroup;
  program: LacrosseProgram;
  primary_position: PlayerPosition;
  secondary_position: PlayerPosition | null;
  experience_level: ExperienceLevel;
  team_or_school: string | null;
  goals: string | null;
  strengths: string | null;
  improvement_areas: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_by: string | null;
} & Timestamps;

export type ParentPlayerRelationshipRow = {
  id: string;
  parent_id: string;
  player_id: string;
  relationship: GuardianRelationship;
  is_primary: boolean;
  created_by: string | null;
} & Timestamps;

export type ConsentRecordRow = {
  id: string;
  parent_id: string;
  player_id: string | null;
  consent_type: ConsentType;
  document_version: string;
  granted: boolean;
  created_at: string;
};

export type ProfileEmailRow = { profile_id: string; email: string } & Timestamps;

export type CoachRow = {
  profile_id: string;
  bio: string | null;
  is_active: boolean;
  created_by: string | null;
} & Timestamps;

export type ProgramRow = {
  id: string;
  name: string;
  location: string | null;
  age_group: AgeGroup | null;
  program: LacrosseProgram | null;
  start_date: string;
  end_date: string;
  schedule_description: string | null;
  registration_url: string | null;
  status: ProgramStatus;
  created_by: string | null;
} & Timestamps;

export type ProgramCoachRow = {
  id: string;
  program_id: string;
  coach_id: string;
  assignment_role: CoachAssignmentRole;
  created_by: string | null;
} & Timestamps;

export type ProgramSessionRow = {
  id: string;
  program_id: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  status: SessionStatus;
  created_by: string | null;
} & Timestamps;

export type EnrollmentRow = {
  id: string;
  program_id: string;
  player_id: string;
  status: EnrollmentStatus;
  created_by: string | null;
} & Timestamps;

export type AttendanceRow = {
  id: string;
  session_id: string;
  player_id: string;
  status: AttendanceStatus;
  recorded_by: string | null;
} & Timestamps;

type Relationship<Name extends string, Column extends string, Target extends string> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Target;
  referencedColumns: [Target extends "coaches" ? "profile_id" : "id"];
};

type Editable<Row> = Omit<Row, "id" | "created_by" | "created_at" | "updated_at">;

type PlayerEditable = Omit<PlayerRow, "created_by" | "created_at" | "updated_at">;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: never;
        Update: Partial<Pick<ProfileRow, "first_name" | "last_name" | "phone" | "role">>;
        Relationships: [];
      };
      profile_emails: {
        Row: ProfileEmailRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      coaches: {
        Row: CoachRow;
        Insert: Pick<CoachRow, "profile_id"> & Partial<Pick<CoachRow, "bio" | "is_active">>;
        Update: Partial<Pick<CoachRow, "bio" | "is_active">>;
        Relationships: [Relationship<"coaches_profile_id_fkey", "profile_id", "profiles">];
      };
      programs: {
        Row: ProgramRow;
        Insert: Partial<Pick<ProgramRow, "id">> & Editable<ProgramRow>;
        Update: Partial<Editable<ProgramRow>>;
        Relationships: [];
      };
      program_coaches: {
        Row: ProgramCoachRow;
        Insert: Pick<ProgramCoachRow, "program_id" | "coach_id" | "assignment_role">;
        Update: Partial<Pick<ProgramCoachRow, "assignment_role">>;
        Relationships: [
          Relationship<"program_coaches_program_id_fkey", "program_id", "programs">,
          Relationship<"program_coaches_coach_id_fkey", "coach_id", "coaches">,
        ];
      };
      program_sessions: {
        Row: ProgramSessionRow;
        Insert: Pick<ProgramSessionRow, "program_id" | "starts_at" | "ends_at"> &
          Partial<Pick<ProgramSessionRow, "location" | "status">>;
        Update: Partial<Pick<ProgramSessionRow, "starts_at" | "ends_at" | "location" | "status">>;
        Relationships: [Relationship<"program_sessions_program_id_fkey", "program_id", "programs">];
      };
      enrollments: {
        Row: EnrollmentRow;
        Insert: Pick<EnrollmentRow, "program_id" | "player_id"> & Partial<Pick<EnrollmentRow, "status">>;
        Update: Partial<Pick<EnrollmentRow, "status">>;
        Relationships: [
          Relationship<"enrollments_program_id_fkey", "program_id", "programs">,
          Relationship<"enrollments_player_id_fkey", "player_id", "players">,
        ];
      };
      attendance: {
        Row: AttendanceRow;
        Insert: Pick<AttendanceRow, "session_id" | "player_id" | "status"> &
          Partial<Pick<AttendanceRow, "recorded_by">>;
        Update: Partial<Pick<AttendanceRow, "status" | "recorded_by">>;
        Relationships: [
          Relationship<"attendance_session_id_fkey", "session_id", "program_sessions">,
          Relationship<"attendance_player_id_fkey", "player_id", "players">,
        ];
      };
      players: {
        Row: PlayerRow;
        Insert: Partial<Pick<PlayerRow, "id">> & Omit<PlayerEditable, "id">;
        Update: Partial<Omit<PlayerEditable, "id">>;
        Relationships: [];
      };
      parent_player_relationships: {
        Row: ParentPlayerRelationshipRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "parent_player_relationships_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      consent_records: {
        Row: ConsentRecordRow;
        Insert: Pick<ConsentRecordRow, "consent_type" | "document_version" | "granted"> &
          Partial<Pick<ConsentRecordRow, "player_id">>;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      app_role: AppRole;
      age_group: AgeGroup;
      lacrosse_program: LacrosseProgram;
      player_position: PlayerPosition;
      experience_level: ExperienceLevel;
      guardian_relationship: GuardianRelationship;
      consent_type: ConsentType;
      program_status: ProgramStatus;
      coach_assignment_role: CoachAssignmentRole;
      session_status: SessionStatus;
      enrollment_status: EnrollmentStatus;
      attendance_status: AttendanceStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
