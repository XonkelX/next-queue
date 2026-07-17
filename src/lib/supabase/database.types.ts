export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      queue_commands: {
        Row: {
          actor_user_id: string;
          command_type: string;
          created_at: string;
          queue_id: string | null;
          request_id: string;
        };
        Insert: {
          actor_user_id: string;
          command_type: string;
          created_at?: string;
          queue_id?: string | null;
          request_id: string;
        };
        Update: {
          actor_user_id?: string;
          command_type?: string;
          created_at?: string;
          queue_id?: string | null;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'queue_commands_queue_id_fkey';
            columns: ['queue_id'];
            isOneToOne: false;
            referencedRelation: 'queues';
            referencedColumns: ['id'];
          },
        ];
      };
      queue_entries: {
        Row: {
          called_at: string | null;
          completed_at: string | null;
          id: string;
          joined_at: string;
          number_label: string;
          queue_id: string;
          revision: number;
          sequence: number;
          skipped_at: string | null;
          status: Database['public']['Enums']['queue_entry_status'];
          updated_at: string;
        };
        Insert: {
          called_at?: string | null;
          completed_at?: string | null;
          id?: string;
          joined_at?: string;
          number_label: string;
          queue_id: string;
          revision: number;
          sequence: number;
          skipped_at?: string | null;
          status?: Database['public']['Enums']['queue_entry_status'];
          updated_at?: string;
        };
        Update: {
          called_at?: string | null;
          completed_at?: string | null;
          id?: string;
          joined_at?: string;
          number_label?: string;
          queue_id?: string;
          revision?: number;
          sequence?: number;
          skipped_at?: string | null;
          status?: Database['public']['Enums']['queue_entry_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'queue_entries_queue_id_fkey';
            columns: ['queue_id'];
            isOneToOne: false;
            referencedRelation: 'queues';
            referencedColumns: ['id'];
          },
        ];
      };
      queue_entry_private: {
        Row: {
          created_at: string;
          customer_user_id: string;
          display_name: string | null;
          entry_id: string;
          queue_id: string;
        };
        Insert: {
          created_at?: string;
          customer_user_id: string;
          display_name?: string | null;
          entry_id: string;
          queue_id: string;
        };
        Update: {
          created_at?: string;
          customer_user_id?: string;
          display_name?: string | null;
          entry_id?: string;
          queue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'queue_entry_private_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: true;
            referencedRelation: 'queue_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'queue_entry_private_queue_id_fkey';
            columns: ['queue_id'];
            isOneToOne: false;
            referencedRelation: 'queues';
            referencedColumns: ['id'];
          },
        ];
      };
      queue_events: {
        Row: {
          actor_user_id: string | null;
          entry_id: string | null;
          event_type: Database['public']['Enums']['queue_event_type'];
          id: number;
          occurred_at: string;
          queue_id: string;
          queue_revision: number;
          request_id: string;
        };
        Insert: {
          actor_user_id?: string | null;
          entry_id?: string | null;
          event_type: Database['public']['Enums']['queue_event_type'];
          id?: never;
          occurred_at?: string;
          queue_id: string;
          queue_revision: number;
          request_id: string;
        };
        Update: {
          actor_user_id?: string | null;
          entry_id?: string | null;
          event_type?: Database['public']['Enums']['queue_event_type'];
          id?: never;
          occurred_at?: string;
          queue_id?: string;
          queue_revision?: number;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'queue_events_entry_id_fkey';
            columns: ['entry_id'];
            isOneToOne: false;
            referencedRelation: 'queue_entries';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'queue_events_queue_id_fkey';
            columns: ['queue_id'];
            isOneToOne: false;
            referencedRelation: 'queues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'queue_events_request_id_fkey';
            columns: ['request_id'];
            isOneToOne: true;
            referencedRelation: 'queue_commands';
            referencedColumns: ['request_id'];
          },
        ];
      };
      queue_staff_access: {
        Row: {
          code_hash: string;
          queue_id: string;
          updated_at: string;
        };
        Insert: {
          code_hash: string;
          queue_id: string;
          updated_at?: string;
        };
        Update: {
          code_hash?: string;
          queue_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'queue_staff_access_queue_id_fkey';
            columns: ['queue_id'];
            isOneToOne: true;
            referencedRelation: 'queues';
            referencedColumns: ['id'];
          },
        ];
      };
      queue_staff_access_attempts: {
        Row: {
          attempt_count: number;
          blocked_until: string | null;
          queue_id: string;
          updated_at: string;
          user_id: string;
          window_started_at: string;
        };
        Insert: {
          attempt_count?: number;
          blocked_until?: string | null;
          queue_id: string;
          updated_at?: string;
          user_id: string;
          window_started_at?: string;
        };
        Update: {
          attempt_count?: number;
          blocked_until?: string | null;
          queue_id?: string;
          updated_at?: string;
          user_id?: string;
          window_started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'queue_staff_access_attempts_queue_id_fkey';
            columns: ['queue_id'];
            isOneToOne: false;
            referencedRelation: 'queues';
            referencedColumns: ['id'];
          },
        ];
      };
      queue_staff_memberships: {
        Row: {
          created_at: string;
          queue_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          queue_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          queue_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'queue_staff_memberships_queue_id_fkey';
            columns: ['queue_id'];
            isOneToOne: false;
            referencedRelation: 'queues';
            referencedColumns: ['id'];
          },
        ];
      };
      queues: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          next_sequence: number;
          prefix: string;
          revision: number;
          slug: string;
          status: Database['public']['Enums']['queue_status'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          next_sequence?: number;
          prefix: string;
          revision?: number;
          slug: string;
          status?: Database['public']['Enums']['queue_status'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          next_sequence?: number;
          prefix?: string;
          revision?: number;
          slug?: string;
          status?: Database['public']['Enums']['queue_status'];
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      call_next: {
        Args: { queue_id: string; request_id: string };
        Returns: Json;
      };
      claim_staff_access: {
        Args: { access_code: string; queue_slug: string; request_id: string };
        Returns: Json;
      };
      close_queue: {
        Args: { queue_id: string; request_id: string };
        Returns: Json;
      };
      complete_active: {
        Args: { queue_id: string; request_id: string };
        Returns: Json;
      };
      create_queue: {
        Args: { queue_name: string; queue_prefix: string; request_id: string };
        Returns: Json;
      };
      get_queue_snapshot: { Args: { queue_slug: string }; Returns: Json };
      join_queue: {
        Args: { display_name: string; queue_slug: string; request_id: string };
        Returns: Json;
      };
      pause_queue: {
        Args: { queue_id: string; request_id: string };
        Returns: Json;
      };
      reopen_queue: {
        Args: { queue_id: string; request_id: string };
        Returns: Json;
      };
      skip_entry: {
        Args: { entry_id: string; queue_id: string; request_id: string };
        Returns: Json;
      };
    };
    Enums: {
      queue_entry_status: 'WAITING' | 'SERVING' | 'COMPLETED' | 'SKIPPED';
      queue_event_type:
        | 'QUEUE_CREATED'
        | 'STAFF_ACCESS_CLAIMED'
        | 'CUSTOMER_JOINED'
        | 'CUSTOMER_CALLED'
        | 'CUSTOMER_COMPLETED'
        | 'CUSTOMER_SKIPPED'
        | 'QUEUE_PAUSED'
        | 'QUEUE_REOPENED'
        | 'QUEUE_CLOSED';
      queue_status: 'OPEN' | 'PAUSED' | 'CLOSED';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      queue_entry_status: ['WAITING', 'SERVING', 'COMPLETED', 'SKIPPED'],
      queue_event_type: [
        'QUEUE_CREATED',
        'STAFF_ACCESS_CLAIMED',
        'CUSTOMER_JOINED',
        'CUSTOMER_CALLED',
        'CUSTOMER_COMPLETED',
        'CUSTOMER_SKIPPED',
        'QUEUE_PAUSED',
        'QUEUE_REOPENED',
        'QUEUE_CLOSED',
      ],
      queue_status: ['OPEN', 'PAUSED', 'CLOSED'],
    },
  },
} as const;
