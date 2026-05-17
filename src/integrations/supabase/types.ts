export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          branch_id: string
          buffer_minutes: number | null
          checked_in_at: string | null
          completed_at: string | null
          consultation_started_at: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          duration_minutes: number
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          source: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          branch_id: string
          buffer_minutes?: number | null
          checked_in_at?: string | null
          completed_at?: string | null
          consultation_started_at?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          branch_id?: string
          buffer_minutes?: number | null
          checked_in_at?: string | null
          completed_at?: string | null
          consultation_started_at?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      followups: {
        Row: {
          appointment_id: string | null
          branch_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          followup_date: string
          id: string
          notes: string | null
          patient_id: string
          reason: string
          status: Database["public"]["Enums"]["followup_status"]
          updated_at: string
          urgency: string | null
        }
        Insert: {
          appointment_id?: string | null
          branch_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          followup_date: string
          id?: string
          notes?: string | null
          patient_id: string
          reason: string
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          appointment_id?: string | null
          branch_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          followup_date?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string
          status?: Database["public"]["Enums"]["followup_status"]
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followups_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followups_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          appointment_id: string | null
          branch_id: string
          consultation_fee: number
          created_at: string
          created_by: string | null
          discount: number
          id: string
          notes: string | null
          other_charges: number
          patient_id: string
          status: string
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          appointment_id?: string | null
          branch_id: string
          consultation_fee?: number
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          notes?: string | null
          other_charges?: number
          patient_id: string
          status?: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          appointment_id?: string | null
          branch_id?: string
          consultation_fee?: number
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          notes?: string | null
          other_charges?: number
          patient_id?: string
          status?: string
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      medical_history: {
        Row: {
          appointment_id: string | null
          created_at: string
          description: string | null
          doctor_id: string | null
          end_date: string | null
          history_type: string
          id: string
          patient_id: string
          severity: string | null
          start_date: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          end_date?: string | null
          history_type: string
          id?: string
          patient_id: string
          severity?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          end_date?: string | null
          history_type?: string
          id?: string
          patient_id?: string
          severity?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          appointment_id: string | null
          content: string
          created_at: string
          doctor_id: string | null
          id: string
          patient_id: string
          record_type: string
          title: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          content: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          patient_id: string
          record_type?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          content?: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          patient_id?: string
          record_type?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_allergies: {
        Row: {
          allergen: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          patient_id: string
          reaction: string | null
          severity: string | null
          updated_at: string
        }
        Insert: {
          allergen: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          reaction?: string | null
          severity?: string | null
          updated_at?: string
        }
        Update: {
          allergen?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          reaction?: string | null
          severity?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      patient_portal_access: {
        Row: {
          created_at: string | null
          id: string
          last_login_at: string | null
          login_token: string | null
          patient_id: string
          token_expires_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_login_at?: string | null
          login_token?: string | null
          patient_id: string
          token_expires_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_login_at?: string | null
          login_token?: string | null
          patient_id?: string
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_portal_access_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_vitals: {
        Row: {
          appointment_id: string | null
          bmi: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          height_cm: number | null
          id: string
          notes: string | null
          patient_id: string
          pulse: number | null
          recorded_at: string
          recorded_by: string | null
          spo2: number | null
          temperature_c: number | null
          weight_kg: number | null
        }
        Insert: {
          appointment_id?: string | null
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          pulse?: number | null
          recorded_at?: string
          recorded_by?: string | null
          spo2?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Update: {
          appointment_id?: string | null
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          pulse?: number | null
          recorded_at?: string
          recorded_by?: string | null
          spo2?: number | null
          temperature_c?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          branch_id: string | null
          communication_optout: boolean
          consent_document_url: string | null
          consent_signed: boolean
          consent_signed_at: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          gender: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          last_name: string
          notes: string | null
          phone: string
          photo_thumbnail_url: string | null
          photo_url: string | null
          preferred_communication: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch_id?: string | null
          communication_optout?: boolean
          consent_document_url?: string | null
          consent_signed?: boolean
          consent_signed_at?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          last_name: string
          notes?: string | null
          phone: string
          photo_thumbnail_url?: string | null
          photo_url?: string | null
          preferred_communication?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch_id?: string | null
          communication_optout?: boolean
          consent_document_url?: string | null
          consent_signed?: boolean
          consent_signed_at?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          last_name?: string
          notes?: string | null
          phone?: string
          photo_thumbnail_url?: string | null
          photo_url?: string | null
          preferred_communication?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: string
          notes: string | null
          paid_at: string
          received_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          notes?: string | null
          paid_at?: string
          received_by?: string | null
          reference?: string | null
        }
        Relationships: []
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          drug_name: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          prescription_id: string
          quantity: string | null
        }
        Insert: {
          created_at?: string
          dosage: string
          drug_name: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          prescription_id: string
          quantity?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string
          drug_name?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          prescription_id?: string
          quantity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_templates: {
        Row: {
          created_at: string
          created_by: string | null
          dosage: string
          drug_name: string
          duration: string
          frequency: string
          id: string
          instructions: string | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dosage: string
          drug_name: string
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dosage?: string
          drug_name?: string
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          name?: string
        }
        Relationships: []
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          created_at: string
          diagnosis: string | null
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          prescribed_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          prescribed_date?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          prescribed_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reschedule_requests: {
        Row: {
          appointment_id: string
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_date: string | null
          requested_time: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_date?: string | null
          requested_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_date?: string | null
          requested_time?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_requests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_reminders: {
        Row: {
          appointment_id: string
          created_at: string
          error_message: string | null
          id: string
          message: string
          patient_id: string
          phone_number: string
          reminder_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message: string
          patient_id: string
          phone_number: string
          reminder_type: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          patient_id?: string
          phone_number?: string
          reminder_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_branch_assignments: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_branch_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          branch_id: string
          contacted_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          patient_id: string
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          priority: string
          reason: string | null
          scheduled_appointment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          branch_id: string
          contacted_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          priority?: string
          reason?: string | null
          scheduled_appointment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          branch_id?: string
          contacted_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          priority?: string
          reason?: string | null
          scheduled_appointment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_scheduled_appointment_id_fkey"
            columns: ["scheduled_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "doctor" | "receptionist"
      appointment_status:
        | "scheduled"
        | "checked_in"
        | "in_consultation"
        | "completed"
        | "no_show"
        | "cancelled"
      appointment_type: "new" | "follow_up" | "procedure" | "teleconsult"
      followup_status: "pending" | "contacted" | "done" | "snoozed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "doctor", "receptionist"],
      appointment_status: [
        "scheduled",
        "checked_in",
        "in_consultation",
        "completed",
        "no_show",
        "cancelled",
      ],
      appointment_type: ["new", "follow_up", "procedure", "teleconsult"],
      followup_status: ["pending", "contacted", "done", "snoozed"],
    },
  },
} as const
