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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      album_rankings: {
        Row: {
          album_id: string
          album_image_url: string | null
          album_name: string
          artist_id: string
          artist_name: string
          created_at: string
          id: string
          rank: number
          release_date: string | null
          snapshot_id: string
          total_tracks: number | null
          track_count: number
          user_id: string
        }
        Insert: {
          album_id: string
          album_image_url?: string | null
          album_name: string
          artist_id: string
          artist_name: string
          created_at?: string
          id?: string
          rank: number
          release_date?: string | null
          snapshot_id: string
          total_tracks?: number | null
          track_count?: number
          user_id: string
        }
        Update: {
          album_id?: string
          album_image_url?: string | null
          album_name?: string
          artist_id?: string
          artist_name?: string
          created_at?: string
          id?: string
          rank?: number
          release_date?: string | null
          snapshot_id?: string
          total_tracks?: number | null
          track_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_rankings_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_listening_stats: {
        Row: {
          artist_id: string
          artist_name: string
          created_at: string | null
          first_tracked_at: string | null
          id: string
          last_tracked_at: string | null
          total_duration_ms: number | null
          total_hours_listened: number | null
          total_play_count: number | null
          unique_tracks_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          artist_id: string
          artist_name: string
          created_at?: string | null
          first_tracked_at?: string | null
          id?: string
          last_tracked_at?: string | null
          total_duration_ms?: number | null
          total_hours_listened?: number | null
          total_play_count?: number | null
          unique_tracks_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          artist_id?: string
          artist_name?: string
          created_at?: string | null
          first_tracked_at?: string | null
          id?: string
          last_tracked_at?: string | null
          total_duration_ms?: number | null
          total_hours_listened?: number | null
          total_play_count?: number | null
          unique_tracks_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      artist_rankings: {
        Row: {
          artist_id: string
          artist_image_url: string | null
          artist_name: string
          created_at: string
          genres: string[] | null
          id: string
          popularity: number | null
          rank: number
          snapshot_id: string
          user_id: string
        }
        Insert: {
          artist_id: string
          artist_image_url?: string | null
          artist_name: string
          created_at?: string
          genres?: string[] | null
          id?: string
          popularity?: number | null
          rank: number
          snapshot_id: string
          user_id: string
        }
        Update: {
          artist_id?: string
          artist_image_url?: string | null
          artist_name?: string
          created_at?: string
          genres?: string[] | null
          id?: string
          popularity?: number | null
          rank?: number
          snapshot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_rankings_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_cache: {
        Row: {
          cached_at: string
          created_at: string
          id: string
          is_mutual: boolean
          spotify_friend_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cached_at?: string
          created_at?: string
          id?: string
          is_mutual?: boolean
          spotify_friend_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cached_at?: string
          created_at?: string
          id?: string
          is_mutual?: boolean
          spotify_friend_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      snapshots: {
        Row: {
          created_at: string
          id: string
          time_range: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          time_range: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          time_range?: string
          user_id?: string
        }
        Relationships: []
      }
      track_rankings: {
        Row: {
          album_id: string
          album_name: string
          artist_id: string
          artist_name: string
          created_at: string
          duration_ms: number | null
          id: string
          popularity: number | null
          rank: number
          snapshot_id: string
          track_id: string
          track_image_url: string | null
          track_name: string
          user_id: string
        }
        Insert: {
          album_id: string
          album_name: string
          artist_id: string
          artist_name: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          popularity?: number | null
          rank: number
          snapshot_id: string
          track_id: string
          track_image_url?: string | null
          track_name: string
          user_id: string
        }
        Update: {
          album_id?: string
          album_name?: string
          artist_id?: string
          artist_name?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          popularity?: number | null
          rank?: number
          snapshot_id?: string
          track_id?: string
          track_image_url?: string | null
          track_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_rankings_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          discriminator: string
          display_name: string
          id: string
          spotify_user_id: string
          stats_visibility: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discriminator: string
          display_name: string
          id?: string
          spotify_user_id: string
          stats_visibility?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discriminator?: string
          display_name?: string
          id?: string
          spotify_user_id?: string
          stats_visibility?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_mutual_follow_cached: {
        Args: { p_requester_id: string; p_target_user_id: string }
        Returns: boolean
      }
      delete_user_account: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      delete_user_data: { Args: { target_user_id: string }; Returns: undefined }
      export_user_data: { Args: { target_user_id: string }; Returns: Json }
      generate_discriminator: {
        Args: { p_display_name: string }
        Returns: string
      }
      get_latest_snapshot: {
        Args: { target_time_range?: string; target_user_id: string }
        Returns: {
          created_at: string
          snapshot_id: string
        }[]
      }
      get_ranking_history: {
        Args: {
          p_item_id: string
          p_item_type: string
          p_time_range?: string
          p_user_id: string
        }
        Returns: {
          date: string
          is_new_entry: boolean
          is_reentry: boolean
          peak_rank: number
          rank: number
          time_range: string
        }[]
      }
      get_sparkline_data: {
        Args: {
          p_days?: number
          p_item_ids: string[]
          p_item_type: string
          p_user_id: string
        }
        Returns: {
          date: string
          item_id: string
          rank: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_artist_listening_stats: { Args: never; Returns: undefined }
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
