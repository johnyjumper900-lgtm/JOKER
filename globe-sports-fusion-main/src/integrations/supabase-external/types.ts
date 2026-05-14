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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      matches_cache: {
        Row: {
          away_team: string
          away_team_id: number | null
          commence_time: string
          country: string | null
          external_id: number | null
          home_team: string
          home_team_id: number | null
          id: string
          league: string | null
          league_id: number | null
          match_key: string
          paris_date: string | null
          paris_time: string | null
          payload: Json | null
          source: string
          updated_at: string
        }
        Insert: {
          away_team: string
          away_team_id?: number | null
          commence_time: string
          country?: string | null
          external_id?: number | null
          home_team: string
          home_team_id?: number | null
          id?: string
          league?: string | null
          league_id?: number | null
          match_key: string
          paris_date?: string | null
          paris_time?: string | null
          payload?: Json | null
          source: string
          updated_at?: string
        }
        Update: {
          away_team?: string
          away_team_id?: number | null
          commence_time?: string
          country?: string | null
          external_id?: number | null
          home_team?: string
          home_team_id?: number | null
          id?: string
          league?: string | null
          league_id?: number | null
          match_key?: string
          paris_date?: string | null
          paris_time?: string | null
          payload?: Json | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      odds_cache: {
        Row: {
          away: number | null
          away_team: string
          best_away: number | null
          best_draw: number | null
          best_home: number | null
          bookmaker: string | null
          bookmakers: Json | null
          commence_time: string | null
          draw: number | null
          home: number | null
          home_team: string
          id: string
          match_key: string
          payload: Json | null
          raw: Json | null
          source: string | null
          updated_at: string
        }
        Insert: {
          away?: number | null
          away_team: string
          best_away?: number | null
          best_draw?: number | null
          best_home?: number | null
          bookmaker?: string | null
          bookmakers?: Json | null
          commence_time?: string | null
          draw?: number | null
          home?: number | null
          home_team: string
          id?: string
          match_key: string
          payload?: Json | null
          raw?: Json | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          away?: number | null
          away_team?: string
          best_away?: number | null
          best_draw?: number | null
          best_home?: number | null
          bookmaker?: string | null
          bookmakers?: Json | null
          commence_time?: string | null
          draw?: number | null
          home?: number | null
          home_team?: string
          id?: string
          match_key?: string
          payload?: Json | null
          raw?: Json | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          duration_ms: number | null
          finished_at: string | null
          id: string
          items_added: number | null
          items_updated: number | null
          job: string
          message: string | null
          started_at: string
          status: string
        }
        Insert: {
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          items_added?: number | null
          items_updated?: number | null
          job: string
          message?: string | null
          started_at?: string
          status: string
        }
        Update: {
          duration_ms?: number | null
          finished_at?: string | null
          id?: string
          items_added?: number | null
          items_updated?: number | null
          job?: string
          message?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      team_stats_cache: {
        Row: {
          attack: number | null
          defense: number | null
          force: number | null
          form: string | null
          id: string
          league: string | null
          league_id: number | null
          payload: Json | null
          season: number | null
          source: string | null
          team_key: string
          team_name: string
          updated_at: string
        }
        Insert: {
          attack?: number | null
          defense?: number | null
          force?: number | null
          form?: string | null
          id?: string
          league?: string | null
          league_id?: number | null
          payload?: Json | null
          season?: number | null
          source?: string | null
          team_key: string
          team_name: string
          updated_at?: string
        }
        Update: {
          attack?: number | null
          defense?: number | null
          force?: number | null
          form?: string | null
          id?: string
          league?: string | null
          league_id?: number | null
          payload?: Json | null
          season?: number | null
          source?: string | null
          team_key?: string
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams_cache: {
        Row: {
          badge_url: string | null
          banner_url: string | null
          country: string | null
          country_code: string | null
          description: string | null
          external_id: number | null
          founded: string | null
          id: string
          kit_url: string | null
          league: string | null
          league_id: number | null
          logo: string | null
          name: string
          name_key: string
          payload: Json | null
          source: string | null
          stadium: string | null
          strength: number | null
          updated_at: string
        }
        Insert: {
          badge_url?: string | null
          banner_url?: string | null
          country?: string | null
          country_code?: string | null
          description?: string | null
          external_id?: number | null
          founded?: string | null
          id?: string
          kit_url?: string | null
          league?: string | null
          league_id?: number | null
          logo?: string | null
          name: string
          name_key: string
          payload?: Json | null
          source?: string | null
          stadium?: string | null
          strength?: number | null
          updated_at?: string
        }
        Update: {
          badge_url?: string | null
          banner_url?: string | null
          country?: string | null
          country_code?: string | null
          description?: string | null
          external_id?: number | null
          founded?: string | null
          id?: string
          kit_url?: string | null
          league?: string | null
          league_id?: number | null
          logo?: string | null
          name?: string
          name_key?: string
          payload?: Json | null
          source?: string | null
          stadium?: string | null
          strength?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
