export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_rate_limit_buckets: {
        Row: {
          action: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          category: Database["public"]["Enums"]["announcement_category"];
          created_at: string;
          cta_label: string;
          cta_url: string;
          deleted_at: string | null;
          expires_at: string | null;
          id: string;
          image_url: string;
          pinned: boolean;
          published_at: string;
          status: Database["public"]["Enums"]["announcement_status"];
          summary: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["announcement_category"];
          created_at?: string;
          cta_label?: string;
          cta_url?: string;
          deleted_at?: string | null;
          expires_at?: string | null;
          id?: string;
          image_url?: string;
          pinned?: boolean;
          published_at?: string;
          status?: Database["public"]["Enums"]["announcement_status"];
          summary: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["announcement_category"];
          created_at?: string;
          cta_label?: string;
          cta_url?: string;
          deleted_at?: string | null;
          expires_at?: string | null;
          id?: string;
          image_url?: string;
          pinned?: boolean;
          published_at?: string;
          status?: Database["public"]["Enums"]["announcement_status"];
          summary?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      church_profile: {
        Row: {
          address: string;
          city: string;
          created_at: string;
          email: string;
          hero_verse: string;
          id: string;
          instagram_url: string;
          maps_url: string;
          mission: string;
          name: string;
          pastor_name: string;
          short_name: string;
          tagline: string;
          updated_at: string;
          whatsapp: string;
          youtube_url: string;
        };
        Insert: {
          address?: string;
          city?: string;
          created_at?: string;
          email?: string;
          hero_verse?: string;
          id?: string;
          instagram_url?: string;
          maps_url?: string;
          mission?: string;
          name?: string;
          pastor_name?: string;
          short_name?: string;
          tagline?: string;
          updated_at?: string;
          whatsapp?: string;
          youtube_url?: string;
        };
        Update: {
          address?: string;
          city?: string;
          created_at?: string;
          email?: string;
          hero_verse?: string;
          id?: string;
          instagram_url?: string;
          maps_url?: string;
          mission?: string;
          name?: string;
          pastor_name?: string;
          short_name?: string;
          tagline?: string;
          updated_at?: string;
          whatsapp?: string;
          youtube_url?: string;
        };
        Relationships: [];
      };
      commemorative_dates: {
        Row: {
          color: string;
          created_at: string;
          day_of_month: number | null;
          deleted_at: string | null;
          description: string;
          id: string;
          month: number;
          name: string;
          sort_order: number;
          type: Database["public"]["Enums"]["commemoration_type"];
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          day_of_month?: number | null;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          month: number;
          name: string;
          sort_order?: number;
          type: Database["public"]["Enums"]["commemoration_type"];
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          day_of_month?: number | null;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          month?: number;
          name?: string;
          sort_order?: number;
          type?: Database["public"]["Enums"]["commemoration_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      content_audit_log: {
        Row: {
          action: string;
          changed_at: string;
          changed_by: string | null;
          id: string;
          new_row: Json | null;
          old_row: Json | null;
          row_id: string;
          table_name: string;
        };
        Insert: {
          action: string;
          changed_at?: string;
          changed_by?: string | null;
          id?: string;
          new_row?: Json | null;
          old_row?: Json | null;
          row_id: string;
          table_name: string;
        };
        Update: {
          action?: string;
          changed_at?: string;
          changed_by?: string | null;
          id?: string;
          new_row?: Json | null;
          old_row?: Json | null;
          row_id?: string;
          table_name?: string;
        };
        Relationships: [];
      };
      households: {
        Row: {
          address_city: string;
          address_complement: string;
          address_neighborhood: string;
          address_number: string;
          address_state: string;
          address_street: string;
          address_zip: string;
          created_at: string;
          deleted_at: string | null;
          head_member_id: string | null;
          id: string;
          name: string;
          notes: string;
          updated_at: string;
        };
        Insert: {
          address_city?: string;
          address_complement?: string;
          address_neighborhood?: string;
          address_number?: string;
          address_state?: string;
          address_street?: string;
          address_zip?: string;
          created_at?: string;
          deleted_at?: string | null;
          head_member_id?: string | null;
          id?: string;
          name: string;
          notes?: string;
          updated_at?: string;
        };
        Update: {
          address_city?: string;
          address_complement?: string;
          address_neighborhood?: string;
          address_number?: string;
          address_state?: string;
          address_street?: string;
          address_zip?: string;
          created_at?: string;
          deleted_at?: string | null;
          head_member_id?: string | null;
          id?: string;
          name?: string;
          notes?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "households_head_member_fk";
            columns: ["head_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "households_head_member_fk";
            columns: ["head_member_id"];
            isOneToOne: false;
            referencedRelation: "members_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "households_head_member_fk";
            columns: ["head_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "households_head_member_fk";
            columns: ["head_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers_public";
            referencedColumns: ["id"];
          }
        ];
      };
      member_relationships: {
        Row: {
          created_at: string;
          end_date: string | null;
          from_member_id: string;
          id: string;
          start_date: string | null;
          to_member_id: string;
          type: Database["public"]["Enums"]["relationship_type"];
        };
        Insert: {
          created_at?: string;
          end_date?: string | null;
          from_member_id: string;
          id?: string;
          start_date?: string | null;
          to_member_id: string;
          type: Database["public"]["Enums"]["relationship_type"];
        };
        Update: {
          created_at?: string;
          end_date?: string | null;
          from_member_id?: string;
          id?: string;
          start_date?: string | null;
          to_member_id?: string;
          type?: Database["public"]["Enums"]["relationship_type"];
        };
        Relationships: [
          {
            foreignKeyName: "member_relationships_from_member_id_fkey";
            columns: ["from_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_relationships_from_member_id_fkey";
            columns: ["from_member_id"];
            isOneToOne: false;
            referencedRelation: "members_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_relationships_from_member_id_fkey";
            columns: ["from_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_relationships_from_member_id_fkey";
            columns: ["from_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_relationships_to_member_id_fkey";
            columns: ["to_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_relationships_to_member_id_fkey";
            columns: ["to_member_id"];
            isOneToOne: false;
            referencedRelation: "members_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_relationships_to_member_id_fkey";
            columns: ["to_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_relationships_to_member_id_fkey";
            columns: ["to_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers_public";
            referencedColumns: ["id"];
          }
        ];
      };
      members: {
        Row: {
          address_city: string;
          address_complement: string;
          address_neighborhood: string;
          address_number: string;
          address_state: string;
          address_street: string;
          address_zip: string;
          allergies: string;
          baptism_date: string | null;
          baptism_location: string;
          birth_date: string | null;
          church_role: Database["public"]["Enums"]["church_role"];
          consent_given_at: string | null;
          consent_medical_data_at: string | null;
          consent_version: string;
          cpf: string | null;
          created_at: string;
          data_retention_until: string | null;
          deleted_at: string | null;
          email: string;
          emergency_contact_name: string;
          emergency_contact_phone: string;
          full_name: string;
          gender: Database["public"]["Enums"]["gender"] | null;
          household_id: string | null;
          id: string;
          is_volunteer: boolean;
          joined_at: string | null;
          marital_status: Database["public"]["Enums"]["marital_status"] | null;
          medical_notes: string;
          membership_status: Database["public"]["Enums"]["membership_status"];
          notes: string;
          phone: string;
          photo_url: string;
          prayer_topics: string[];
          preferred_name: string;
          profession: string;
          public_bio: string;
          public_directory: boolean;
          rg: string;
          rg_issuer: string;
          spiritual_gifts: string[];
          transferred_from: string;
          updated_at: string;
          volunteer_ministries: string[];
          volunteer_notes: string;
          volunteer_unavailable_dates: string[];
          whatsapp: string;
        };
        Insert: {
          address_city?: string;
          address_complement?: string;
          address_neighborhood?: string;
          address_number?: string;
          address_state?: string;
          address_street?: string;
          address_zip?: string;
          allergies?: string;
          baptism_date?: string | null;
          baptism_location?: string;
          birth_date?: string | null;
          church_role?: Database["public"]["Enums"]["church_role"];
          consent_given_at?: string | null;
          consent_medical_data_at?: string | null;
          consent_version?: string;
          cpf?: string | null;
          created_at?: string;
          data_retention_until?: string | null;
          deleted_at?: string | null;
          email?: string;
          emergency_contact_name?: string;
          emergency_contact_phone?: string;
          full_name: string;
          gender?: Database["public"]["Enums"]["gender"] | null;
          household_id?: string | null;
          id?: string;
          is_volunteer?: boolean;
          joined_at?: string | null;
          marital_status?: Database["public"]["Enums"]["marital_status"] | null;
          medical_notes?: string;
          membership_status?: Database["public"]["Enums"]["membership_status"];
          notes?: string;
          phone?: string;
          photo_url?: string;
          prayer_topics?: string[];
          preferred_name?: string;
          profession?: string;
          public_bio?: string;
          public_directory?: boolean;
          rg?: string;
          rg_issuer?: string;
          spiritual_gifts?: string[];
          transferred_from?: string;
          updated_at?: string;
          volunteer_ministries?: string[];
          volunteer_notes?: string;
          volunteer_unavailable_dates?: string[];
          whatsapp?: string;
        };
        Update: {
          address_city?: string;
          address_complement?: string;
          address_neighborhood?: string;
          address_number?: string;
          address_state?: string;
          address_street?: string;
          address_zip?: string;
          allergies?: string;
          baptism_date?: string | null;
          baptism_location?: string;
          birth_date?: string | null;
          church_role?: Database["public"]["Enums"]["church_role"];
          consent_given_at?: string | null;
          consent_medical_data_at?: string | null;
          consent_version?: string;
          cpf?: string | null;
          created_at?: string;
          data_retention_until?: string | null;
          deleted_at?: string | null;
          email?: string;
          emergency_contact_name?: string;
          emergency_contact_phone?: string;
          full_name?: string;
          gender?: Database["public"]["Enums"]["gender"] | null;
          household_id?: string | null;
          id?: string;
          is_volunteer?: boolean;
          joined_at?: string | null;
          marital_status?: Database["public"]["Enums"]["marital_status"] | null;
          medical_notes?: string;
          membership_status?: Database["public"]["Enums"]["membership_status"];
          notes?: string;
          phone?: string;
          photo_url?: string;
          prayer_topics?: string[];
          preferred_name?: string;
          profession?: string;
          public_bio?: string;
          public_directory?: boolean;
          rg?: string;
          rg_issuer?: string;
          spiritual_gifts?: string[];
          transferred_from?: string;
          updated_at?: string;
          volunteer_ministries?: string[];
          volunteer_notes?: string;
          volunteer_unavailable_dates?: string[];
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
      ministries: {
        Row: {
          color: string;
          contact: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          meeting_time: string;
          name: string;
          slug: string;
          sort_order: number;
          summary: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          contact?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          meeting_time?: string;
          name: string;
          slug: string;
          sort_order?: number;
          summary?: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          contact?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          meeting_time?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          summary?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      prayer_request_rate_limits: {
        Row: {
          created_at: string;
          id: string;
          ip_hash: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ip_hash: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip_hash?: string;
        };
        Relationships: [];
      };
      prayer_requests: {
        Row: {
          assigned_to: string | null;
          contact: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          message: string;
          name: string;
          pastoral_notes: string;
          seen_at: string | null;
          status: Database["public"]["Enums"]["prayer_status"];
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          contact?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          message: string;
          name: string;
          pastoral_notes?: string;
          seen_at?: string | null;
          status?: Database["public"]["Enums"]["prayer_status"];
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          contact?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          message?: string;
          name?: string;
          pastoral_notes?: string;
          seen_at?: string | null;
          status?: Database["public"]["Enums"]["prayer_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prayer_requests_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "admin_users";
            referencedColumns: ["user_id"];
          }
        ];
      };
      recurring_meetings: {
        Row: {
          created_at: string;
          description: string;
          ends_at: string;
          id: string;
          profile_id: string;
          sort_order: number;
          starts_at: string;
          title: string;
          updated_at: string;
          weekday: number;
        };
        Insert: {
          created_at?: string;
          description?: string;
          ends_at: string;
          id?: string;
          profile_id?: string;
          sort_order?: number;
          starts_at: string;
          title: string;
          updated_at?: string;
          weekday: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          ends_at?: string;
          id?: string;
          profile_id?: string;
          sort_order?: number;
          starts_at?: string;
          title?: string;
          updated_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recurring_meetings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "church_profile";
            referencedColumns: ["id"];
          }
        ];
      };
      schedule_items: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          director: string;
          director_member_id: string | null;
          ends_at: string;
          featured: boolean;
          id: string;
          location: string;
          ministry: string;
          occasion_label: string;
          passage: string;
          preacher: string;
          preacher_member_id: string | null;
          series_id: string | null;
          sound_member_id: string | null;
          sound_team: string;
          starts_at: string;
          status: Database["public"]["Enums"]["schedule_status"];
          summary: string;
          title: string;
          updated_at: string;
          youtube_url: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          director?: string;
          director_member_id?: string | null;
          ends_at: string;
          featured?: boolean;
          id?: string;
          location: string;
          ministry: string;
          occasion_label?: string;
          passage?: string;
          preacher?: string;
          preacher_member_id?: string | null;
          series_id?: string | null;
          sound_member_id?: string | null;
          sound_team?: string;
          starts_at: string;
          status?: Database["public"]["Enums"]["schedule_status"];
          summary: string;
          title: string;
          updated_at?: string;
          youtube_url?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          director?: string;
          director_member_id?: string | null;
          ends_at?: string;
          featured?: boolean;
          id?: string;
          location?: string;
          ministry?: string;
          occasion_label?: string;
          passage?: string;
          preacher?: string;
          preacher_member_id?: string | null;
          series_id?: string | null;
          sound_member_id?: string | null;
          sound_team?: string;
          starts_at?: string;
          status?: Database["public"]["Enums"]["schedule_status"];
          summary?: string;
          title?: string;
          updated_at?: string;
          youtube_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_items_director_member_id_fkey";
            columns: ["director_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_director_member_id_fkey";
            columns: ["director_member_id"];
            isOneToOne: false;
            referencedRelation: "members_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_director_member_id_fkey";
            columns: ["director_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_director_member_id_fkey";
            columns: ["director_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_preacher_member_id_fkey";
            columns: ["preacher_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_preacher_member_id_fkey";
            columns: ["preacher_member_id"];
            isOneToOne: false;
            referencedRelation: "members_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_preacher_member_id_fkey";
            columns: ["preacher_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_preacher_member_id_fkey";
            columns: ["preacher_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_sound_member_id_fkey";
            columns: ["sound_member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_sound_member_id_fkey";
            columns: ["sound_member_id"];
            isOneToOne: false;
            referencedRelation: "members_public";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_sound_member_id_fkey";
            columns: ["sound_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_items_sound_member_id_fkey";
            columns: ["sound_member_id"];
            isOneToOne: false;
            referencedRelation: "volunteers_public";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      members_public: {
        Row: {
          church_role: Database["public"]["Enums"]["church_role"] | null;
          full_name: string | null;
          household_id: string | null;
          id: string | null;
          is_volunteer: boolean | null;
          photo_url: string | null;
          preferred_name: string | null;
          public_bio: string | null;
        };
        Insert: {
          church_role?: Database["public"]["Enums"]["church_role"] | null;
          full_name?: string | null;
          household_id?: string | null;
          id?: string | null;
          is_volunteer?: boolean | null;
          photo_url?: string | null;
          preferred_name?: string | null;
          public_bio?: string | null;
        };
        Update: {
          church_role?: Database["public"]["Enums"]["church_role"] | null;
          full_name?: string | null;
          household_id?: string | null;
          id?: string | null;
          is_volunteer?: boolean | null;
          photo_url?: string | null;
          preferred_name?: string | null;
          public_bio?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
      volunteers: {
        Row: {
          contact: string | null;
          created_at: string | null;
          id: string | null;
          ministries: string[] | null;
          name: string | null;
          notes: string | null;
          photo_url: string | null;
          role: string | null;
          sort_order: number | null;
          unavailable_dates: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          contact?: never;
          created_at?: string | null;
          id?: string | null;
          ministries?: string[] | null;
          name?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          role?: never;
          sort_order?: never;
          unavailable_dates?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          contact?: never;
          created_at?: string | null;
          id?: string | null;
          ministries?: string[] | null;
          name?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          role?: never;
          sort_order?: never;
          unavailable_dates?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      volunteers_public: {
        Row: {
          created_at: string | null;
          id: string | null;
          ministries: string[] | null;
          name: string | null;
          notes: string | null;
          photo_url: string | null;
          role: string | null;
          sort_order: number | null;
          unavailable_dates: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string | null;
          ministries?: string[] | null;
          name?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          role?: never;
          sort_order?: never;
          unavailable_dates?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string | null;
          ministries?: string[] | null;
          name?: string | null;
          notes?: string | null;
          photo_url?: string | null;
          role?: never;
          sort_order?: never;
          unavailable_dates?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      anonymize_member: { Args: { p_id: string }; Returns: undefined };
      archive_announcement: { Args: { p_id: string }; Returns: undefined };
      archive_commemorative_date: { Args: { p_id: string }; Returns: undefined };
      archive_member: { Args: { p_id: string }; Returns: undefined };
      archive_ministry: { Args: { p_id: string }; Returns: undefined };
      archive_prayer_request: { Args: { p_id: string }; Returns: undefined };
      archive_schedule_item: { Args: { p_id: string }; Returns: undefined };
      check_admin_rate_limit: { Args: { p_action: string }; Returns: boolean };
      find_member_duplicates: {
        Args: {
          p_cpf: string;
          p_email: string;
          p_full_name: string;
          p_phone: string;
        };
        Returns: {
          full_name: string;
          match_reason: string;
          member_id: string;
          score: number;
        }[];
      };
      is_admin: { Args: never; Returns: boolean };
      is_owner: { Args: never; Returns: boolean };
      list_admins: {
        Args: never;
        Returns: {
          created_at: string;
          display_name: string;
          email: string;
          role: Database["public"]["Enums"]["admin_role"];
          user_id: string;
        }[];
      };
      purge_old_audit: { Args: never; Returns: number };
      purge_old_prayers: { Args: never; Returns: number };
      redact_member_pii: { Args: { payload: Json }; Returns: Json };
      restore_announcement: { Args: { p_id: string }; Returns: undefined };
      restore_commemorative_date: { Args: { p_id: string }; Returns: undefined };
      restore_member: { Args: { p_id: string }; Returns: undefined };
      restore_ministry: { Args: { p_id: string }; Returns: undefined };
      restore_prayer_request: { Args: { p_id: string }; Returns: undefined };
      restore_schedule_item: { Args: { p_id: string }; Returns: undefined };
      revert_audit_entry: { Args: { entry_id: string }; Returns: undefined };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
    };
    Enums: {
      admin_role: "owner" | "editor";
      announcement_category: "geral" | "evento" | "juventude" | "oracao";
      announcement_status: "draft" | "scheduled" | "published" | "archived";
      church_role:
        | "membro_comum"
        | "presbitero"
        | "diacono"
        | "conselho_fiscal"
        | "tesoureiro"
        | "secretario"
        | "pastor"
        | "pastor_auxiliar";
      commemoration_type: "month" | "day";
      gender: "masculino" | "feminino" | "outro";
      marital_status: "solteiro" | "casado" | "viuvo" | "divorciado" | "uniao_estavel";
      membership_status: "ativo" | "inativo" | "transferido" | "falecido";
      prayer_status: "novo" | "em_oracao" | "concluido";
      relationship_type:
        | "conjuge"
        | "pai"
        | "mae"
        | "filho"
        | "irmao"
        | "avo"
        | "neto"
        | "tio"
        | "sobrinho"
        | "responsavel";
      schedule_status: "scheduled" | "suspended" | "free";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      admin_role: ["owner", "editor"],
      announcement_category: ["geral", "evento", "juventude", "oracao"],
      announcement_status: ["draft", "scheduled", "published", "archived"],
      church_role: [
        "membro_comum",
        "presbitero",
        "diacono",
        "conselho_fiscal",
        "tesoureiro",
        "secretario",
        "pastor",
        "pastor_auxiliar"
      ],
      commemoration_type: ["month", "day"],
      gender: ["masculino", "feminino", "outro"],
      marital_status: ["solteiro", "casado", "viuvo", "divorciado", "uniao_estavel"],
      membership_status: ["ativo", "inativo", "transferido", "falecido"],
      prayer_status: ["novo", "em_oracao", "concluido"],
      relationship_type: [
        "conjuge",
        "pai",
        "mae",
        "filho",
        "irmao",
        "avo",
        "neto",
        "tio",
        "sobrinho",
        "responsavel"
      ],
      schedule_status: ["scheduled", "suspended", "free"]
    }
  }
} as const;
