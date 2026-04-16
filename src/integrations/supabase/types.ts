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
      empresas: {
        Row: {
          cnpj_cpf: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          data_inicio: string | null
          data_termino: string | null
          email: string | null
          empresa_nome: string
          endereco: string | null
          id: string
          logo_url: string | null
          nome_dono: string | null
          status: Database["public"]["Enums"]["empresa_status"]
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj_cpf?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          data_inicio?: string | null
          data_termino?: string | null
          email?: string | null
          empresa_nome: string
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_dono?: string | null
          status?: Database["public"]["Enums"]["empresa_status"]
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj_cpf?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          data_inicio?: string | null
          data_termino?: string | null
          email?: string | null
          empresa_nome?: string
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_dono?: string | null
          status?: Database["public"]["Enums"]["empresa_status"]
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financeiro_mensal: {
        Row: {
          ano_referencia: number
          created_at: string
          custo_operacional: number
          empresa_id: string
          id: string
          investimento_trafego: number
          mes_referencia: number
          meta_faturamento: number
          updated_at: string
        }
        Insert: {
          ano_referencia: number
          created_at?: string
          custo_operacional?: number
          empresa_id: string
          id?: string
          investimento_trafego?: number
          mes_referencia: number
          meta_faturamento?: number
          updated_at?: string
        }
        Update: {
          ano_referencia?: number
          created_at?: string
          custo_operacional?: number
          empresa_id?: string
          id?: string
          investimento_trafego?: number
          mes_referencia?: number
          meta_faturamento?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_mensal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cpf_cnpj: string | null
          created_at: string
          data_mensagem: string
          email: string | null
          empresa_id: string
          endereco: string | null
          id: string
          nome_lead: string
          origem: Database["public"]["Enums"]["lead_origem"]
          status: Database["public"]["Enums"]["lead_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string
          data_mensagem?: string
          email?: string | null
          empresa_id: string
          endereco?: string | null
          id?: string
          nome_lead: string
          origem?: Database["public"]["Enums"]["lead_origem"]
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string
          data_mensagem?: string
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome_lead?: string
          origem?: Database["public"]["Enums"]["lead_origem"]
          status?: Database["public"]["Enums"]["lead_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos: {
        Row: {
          created_at: string
          empresa_id: string
          estofado: string | null
          id: string
          lead_id: string | null
          tipo_servico: Database["public"]["Enums"]["tipo_servico"]
          updated_at: string
          valor: number
          venda_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          estofado?: string | null
          id?: string
          lead_id?: string | null
          tipo_servico?: Database["public"]["Enums"]["tipo_servico"]
          updated_at?: string
          valor?: number
          venda_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          estofado?: string | null
          id?: string
          lead_id?: string | null
          tipo_servico?: Database["public"]["Enums"]["tipo_servico"]
          updated_at?: string
          valor?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          created_at: string
          data_agendada: string | null
          data_venda: string
          desconto: number
          empresa_id: string
          horario_agendado: string | null
          id: string
          lead_id: string | null
          updated_at: string
          valor_cheio: number
          valor_final: number
        }
        Insert: {
          created_at?: string
          data_agendada?: string | null
          data_venda?: string
          desconto?: number
          empresa_id: string
          horario_agendado?: string | null
          id?: string
          lead_id?: string | null
          updated_at?: string
          valor_cheio?: number
          valor_final?: number
        }
        Update: {
          created_at?: string
          data_agendada?: string | null
          data_venda?: string
          desconto?: number
          empresa_id?: string
          horario_agendado?: string | null
          id?: string
          lead_id?: string | null
          updated_at?: string
          valor_cheio?: number
          valor_final?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      empresa_status: "ativo" | "inativo"
      lead_origem: "Tráfego" | "Orgânico" | "Indicação"
      lead_status: "Agendado" | "Sem Interesse" | "Fechado" | "Reabordar"
      tipo_servico:
        | "higienização"
        | "impermeabilização"
        | "higienização e impermeabilização"
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
      app_role: ["admin", "user"],
      empresa_status: ["ativo", "inativo"],
      lead_origem: ["Tráfego", "Orgânico", "Indicação"],
      lead_status: ["Agendado", "Sem Interesse", "Fechado", "Reabordar"],
      tipo_servico: [
        "higienização",
        "impermeabilização",
        "higienização e impermeabilização",
      ],
    },
  },
} as const
