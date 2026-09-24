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

type PlayerEditable = Omit<PlayerRow, "created_by" | "created_at" | "updated_at">;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: never;
        Update: Partial<Pick<ProfileRow, "first_name" | "last_name" | "phone">>;
        Relationships: [];
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
    };
    CompositeTypes: { [_ in never]: never };
  };
};
