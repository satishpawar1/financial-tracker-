export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          display_name: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          display_name: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          display_name?: string
          created_at?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          id: string
          household_id: string
          code: string
          used_by: string | null
          used_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          code: string
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          code?: string
          used_by?: string | null
          used_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          color: string
          icon: string
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          color?: string
          icon?: string
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          color?: string
          icon?: string
          is_system?: boolean
          created_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          id: string
          household_id: string
          imported_by: string
          source: string
          filename: string | null
          row_count: number
          skipped: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          imported_by: string
          source: string
          filename?: string | null
          row_count?: number
          skipped?: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          imported_by?: string
          source?: string
          filename?: string | null
          row_count?: number
          skipped?: number
          created_at?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          id: string
          household_id: string
          paid_by: string
          category_id: string | null
          amount: number
          description: string
          is_income: boolean
          frequency: string
          day_of_week: number | null
          day_of_month: number | null
          month_of_year: number | null
          start_date: string
          end_date: string | null
          last_generated: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          paid_by: string
          category_id?: string | null
          amount: number
          description: string
          is_income?: boolean
          frequency: string
          day_of_week?: number | null
          day_of_month?: number | null
          month_of_year?: number | null
          start_date: string
          end_date?: string | null
          last_generated?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          paid_by?: string
          category_id?: string | null
          amount?: number
          description?: string
          is_income?: boolean
          frequency?: string
          day_of_week?: number | null
          day_of_month?: number | null
          month_of_year?: number | null
          start_date?: string
          end_date?: string | null
          last_generated?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          household_id: string
          paid_by: string
          category_id: string | null
          amount: number
          description: string
          transaction_date: string
          is_income: boolean
          notes: string | null
          import_source: string | null
          import_batch_id: string | null
          recurring_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          paid_by: string
          category_id?: string | null
          amount: number
          description: string
          transaction_date: string
          is_income?: boolean
          notes?: string | null
          import_source?: string | null
          import_batch_id?: string | null
          recurring_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          paid_by?: string
          category_id?: string | null
          amount?: number
          description?: string
          transaction_date?: string
          is_income?: boolean
          notes?: string | null
          import_source?: string | null
          import_batch_id?: string | null
          recurring_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          household_id: string
          category_id: string
          amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          category_id: string
          amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          category_id?: string
          amount?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          household_id: string
          user_id: string
          type: string
          title: string
          body: string
          metadata: Json
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          type: string
          title: string
          body: string
          metadata?: Json
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          metadata?: Json
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_household_id: {
        Args: Record<string, never>
        Returns: string
      }
      seed_default_categories: {
        Args: { p_household_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience aliases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Household = Tables<'households'>
export type HouseholdMember = Tables<'household_members'>
export type Category = Tables<'categories'>
export type Transaction = Tables<'transactions'>
export type RecurringRule = Tables<'recurring_rules'>
export type Budget = Tables<'budgets'>
export type Notification = Tables<'notifications'>
export type ImportBatch = Tables<'import_batches'>
