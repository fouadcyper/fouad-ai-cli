export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      fouad_ai_sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          provider: string;
          model: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          provider?: string;
          model?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          provider?: string;
          model?: string;
          archived_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      fouad_ai_messages: {
        Row: {
          id: number;
          session_id: string;
          user_id: string;
          role: 'system' | 'user' | 'assistant' | 'tool';
          content: string;
          provider: string | null;
          model: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          created_at: string;
        };
        Insert: {
          session_id: string;
          user_id: string;
          role: 'system' | 'user' | 'assistant' | 'tool';
          content: string;
          provider?: string | null;
          model?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      fouad_profiles: {
        Row: {
          user_id: string;
          display_name: string;
          locale: 'ar' | 'en';
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; display_name?: string; locale?: 'ar' | 'en' };
        Update: { display_name?: string; locale?: 'ar' | 'en'; updated_at?: string };
        Relationships: [];
      };
      fouad_user_settings: {
        Row: {
          user_id: string;
          locale: 'ar' | 'en';
          theme: string;
          provider: string;
          model: string;
          history_enabled: boolean;
          sync_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          locale?: 'ar' | 'en';
          theme?: string;
          provider?: string;
          model?: string;
          history_enabled?: boolean;
          sync_enabled?: boolean;
        };
        Update: {
          locale?: 'ar' | 'en';
          theme?: string;
          provider?: string;
          model?: string;
          history_enabled?: boolean;
          sync_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      fouad_usage_events: {
        Row: {
          id: number;
          user_id: string;
          session_id: string | null;
          provider: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          session_id?: string | null;
          provider: string;
          model: string;
          input_tokens?: number;
          output_tokens?: number;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
