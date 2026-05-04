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
          data_atualizacao: string
          data_criacao: string
          data_inicio: string | null
          data_termino: string | null
          endereco: string | null
          id: string
          id_usuario: string
          logo_url: string | null
          nome_dono: string | null
          nome_empresa: string
          telefone: string | null
        }
        Insert: {
          cnpj_cpf?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_inicio?: string | null
          data_termino?: string | null
          endereco?: string | null
          id?: string
          id_usuario: string
          logo_url?: string | null
          nome_dono?: string | null
          nome_empresa: string
          telefone?: string | null
        }
        Update: {
          cnpj_cpf?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          data_atualizacao?: string
          data_criacao?: string
          data_inicio?: string | null
          data_termino?: string | null
          endereco?: string | null
          id?: string
          id_usuario?: string
          logo_url?: string | null
          nome_dono?: string | null
          nome_empresa?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro: {
        Row: {
          ano: number
          custo_anuncio: number | null
          custo_operacional: number | null
          data_atualizacao: string
          data_criacao: string
          id: string
          id_empresa: string
          mes: number
          meta_financeira: number | null
        }
        Insert: {
          ano: number
          custo_anuncio?: number | null
          custo_operacional?: number | null
          data_atualizacao?: string
          data_criacao?: string
          id?: string
          id_empresa: string
          mes: number
          meta_financeira?: number | null
        }
        Update: {
          ano?: number
          custo_anuncio?: number | null
          custo_operacional?: number | null
          data_atualizacao?: string
          data_criacao?: string
          id?: string
          id_empresa?: string
          mes?: number
          meta_financeira?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_atendimento: {
        Row: {
          data_atualizacao: string
          data_criacao: string
          data_interacao: string
          id: string
          id_leads: string
          mensagem: string | null
          tipo: string
        }
        Insert: {
          data_atualizacao?: string
          data_criacao?: string
          data_interacao?: string
          id?: string
          id_leads: string
          mensagem?: string | null
          tipo: string
        }
        Update: {
          data_atualizacao?: string
          data_criacao?: string
          data_interacao?: string
          id?: string
          id_leads?: string
          mensagem?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_atendimento_id_leads_fkey"
            columns: ["id_leads"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_vendas: {
        Row: {
          bonus: number | null
          data_atualizacao: string
          data_criacao: string
          estofado: string
          id: string
          id_vendas: string
          valor: number
        }
        Insert: {
          bonus?: number | null
          data_atualizacao?: string
          data_criacao?: string
          estofado: string
          id?: string
          id_vendas: string
          valor?: number
        }
        Update: {
          bonus?: number | null
          data_atualizacao?: string
          data_criacao?: string
          estofado?: string
          id?: string
          id_vendas?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_vendas_id_vendas_fkey"
            columns: ["id_vendas"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          cnpj_cpf: string | null
          data_atualizacao: string
          data_contato: string | null
          data_criacao: string
          data_orcamento: string | null
          email: string | null
          endereco: string | null
          id: string
          id_empresa: string
          momento_funil: string | null
          nome: string
          origem_lead: string | null
          qualificacao: string | null
          robo_agendamento: boolean | null
          robo_atendimento: boolean | null
          robo_follow_ups: boolean | null
          robo_pos_vendas: boolean | null
          situacao_do_cliente: string | null
          telefone: string | null
        }
        Insert: {
          cnpj_cpf?: string | null
          data_atualizacao?: string
          data_contato?: string | null
          data_criacao?: string
          data_orcamento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          id_empresa: string
          momento_funil?: string | null
          nome: string
          origem_lead?: string | null
          qualificacao?: string | null
          robo_agendamento?: boolean | null
          robo_atendimento?: boolean | null
          robo_follow_ups?: boolean | null
          robo_pos_vendas?: boolean | null
          situacao_do_cliente?: string | null
          telefone?: string | null
        }
        Update: {
          cnpj_cpf?: string | null
          data_atualizacao?: string
          data_contato?: string | null
          data_criacao?: string
          data_orcamento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          id_empresa?: string
          momento_funil?: string | null
          nome?: string
          origem_lead?: string | null
          qualificacao?: string | null
          robo_agendamento?: boolean | null
          robo_atendimento?: boolean | null
          robo_follow_ups?: boolean | null
          robo_pos_vendas?: boolean | null
          situacao_do_cliente?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      lembretes_automacoes: {
        Row: {
          data_atualizacao: string
          data_criacao: string
          data_execucao: string | null
          data_servico: string | null
          disparado: boolean | null
          id: string
          id_empresa: string | null
          mensagem: string | null
          tipo_lembrete: string
        }
        Insert: {
          data_atualizacao?: string
          data_criacao?: string
          data_execucao?: string | null
          data_servico?: string | null
          disparado?: boolean | null
          id?: string
          id_empresa?: string | null
          mensagem?: string | null
          tipo_lembrete: string
        }
        Update: {
          data_atualizacao?: string
          data_criacao?: string
          data_execucao?: string | null
          data_servico?: string | null
          disparado?: boolean | null
          id?: string
          id_empresa?: string | null
          mensagem?: string | null
          tipo_lembrete?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_automacoes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      os: {
        Row: {
          data_atualizacao: string
          data_criacao: string
          enviado: boolean | null
          id: string
          id_vendas: string
        }
        Insert: {
          data_atualizacao?: string
          data_criacao?: string
          enviado?: boolean | null
          id?: string
          id_vendas: string
        }
        Update: {
          data_atualizacao?: string
          data_criacao?: string
          enviado?: boolean | null
          id?: string
          id_vendas?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_id_vendas_fkey"
            columns: ["id_vendas"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_automacoes: {
        Row: {
          cadencia_envio: number
          data_atualizacao: string
          data_criacao: string
          id: string
          id_empresa: string
          template_mensagem: string | null
          tipo_lembrete: string
        }
        Insert: {
          cadencia_envio?: number
          data_atualizacao?: string
          data_criacao?: string
          id?: string
          id_empresa: string
          template_mensagem?: string | null
          tipo_lembrete: string
        }
        Update: {
          cadencia_envio?: number
          data_atualizacao?: string
          data_criacao?: string
          id?: string
          id_empresa?: string
          template_mensagem?: string | null
          tipo_lembrete?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_automacoes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          data_atualizacao: string
          data_criacao: string
          email: string
          id: string
          permissao: string
          senha: string | null
          status: string
        }
        Insert: {
          data_atualizacao?: string
          data_criacao?: string
          email: string
          id: string
          permissao?: string
          senha?: string | null
          status?: string
        }
        Update: {
          data_atualizacao?: string
          data_criacao?: string
          email?: string
          id?: string
          permissao?: string
          senha?: string | null
          status?: string
        }
        Relationships: []
      }
      vendas: {
        Row: {
          data_atualizacao: string
          data_criacao: string
          data_servico: string | null
          data_venda: string
          horario_servico: string | null
          id: string
          id_leads: string
          status: string
        }
        Insert: {
          data_atualizacao?: string
          data_criacao?: string
          data_servico?: string | null
          data_venda?: string
          horario_servico?: string | null
          id?: string
          id_leads: string
          status?: string
        }
        Update: {
          data_atualizacao?: string
          data_criacao?: string
          data_servico?: string | null
          data_venda?: string
          horario_servico?: string | null
          id?: string
          id_leads?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_id_leads_fkey"
            columns: ["id_leads"]
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
      fn_get_cadencia_leads: {
        Args: { p_empresa_id: string; p_lead_ids: string[] }
        Returns: Json
      }
      fn_get_dashboard_data_v3: {
        Args: {
          p_empresa_id: string
          p_end: string
          p_month: number
          p_start: string
          p_year: number
        }
        Returns: Json
      }
      fn_get_dashboard_data: {
        Args: {
          p_empresa_id: string
          p_end: string
          p_month: number
          p_start: string
          p_year: number
        }
        Returns: Json
      }
      fn_get_user_role: { Args: never; Returns: string }
      gerar_lembretes_automacoes: {
        Args: { p_id_empresa?: string }
        Returns: undefined
      }
      gerar_lembretes_automacoes_v2: {
        Args: { p_id_empresa: string; p_hoje: string }
        Returns: undefined
      }
      fn_get_cadencia_leads_v2: {
        Args: { p_empresa_id: string; p_lead_ids: string[]; p_hoje: string }
        Returns: Json
      }
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
