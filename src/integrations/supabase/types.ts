export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          senha: string | null
          status: string
          permissao: string
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id: string
          email: string
          senha?: string | null
          status?: string
          permissao?: string
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          email?: string
          senha?: string | null
          status?: string
          permissao?: string
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'manager' | 'viewer'
          data_criacao: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'manager' | 'viewer'
          data_criacao?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'manager' | 'viewer'
          data_criacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      empresas: {
        Row: {
          id: string
          id_usuario: string
          nome_empresa: string
          nome_dono: string | null
          telefone: string | null
          cnpj_cpf: string | null
          endereco: string | null
          logo_url: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          data_inicio: string | null
          data_termino: string | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_usuario: string
          nome_empresa: string
          nome_dono?: string | null
          telefone?: string | null
          cnpj_cpf?: string | null
          endereco?: string | null
          logo_url?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_usuario?: string
          nome_empresa?: string
          nome_dono?: string | null
          telefone?: string | null
          cnpj_cpf?: string | null
          endereco?: string | null
          logo_url?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          }
        ]
      }
      financeiro: {
        Row: {
          id: string
          id_empresa: string
          ano: number
          mes: number
          meta_financeira: number | null
          custo_operacional: number | null
          custo_anuncio: number | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_empresa: string
          ano: number
          mes: number
          meta_financeira?: number | null
          custo_operacional?: number | null
          custo_anuncio?: number | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_empresa?: string
          ano?: number
          mes?: number
          meta_financeira?: number | null
          custo_operacional?: number | null
          custo_anuncio?: number | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          }
        ]
      }
      leads: {
        Row: {
          id: string
          id_empresa: string
          nome: string
          telefone: string | null
          email: string | null
          cnpj_cpf: string | null
          endereco: string | null
          origem_lead: string | null
          situacao_do_cliente: string | null
          momento_funil: string | null
          qualificacao: string | null
          robo_pos_vendas: boolean | null
          robo_follow_ups: boolean | null
          robo_atendimento: boolean | null
          robo_agendamento: boolean | null
          data_contato: string | null
          data_orcamento: string | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_empresa: string
          nome: string
          telefone?: string | null
          email?: string | null
          cnpj_cpf?: string | null
          endereco?: string | null
          origem_lead?: string | null
          situacao_do_cliente?: string | null
          momento_funil?: string | null
          qualificacao?: string | null
          robo_pos_vendas?: boolean | null
          robo_follow_ups?: boolean | null
          robo_atendimento?: boolean | null
          robo_agendamento?: boolean | null
          data_contato?: string | null
          data_orcamento?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_empresa?: string
          nome?: string
          telefone?: string | null
          email?: string | null
          cnpj_cpf?: string | null
          endereco?: string | null
          origem_lead?: string | null
          situacao_do_cliente?: string | null
          momento_funil?: string | null
          qualificacao?: string | null
          robo_pos_vendas?: boolean | null
          robo_follow_ups?: boolean | null
          robo_atendimento?: boolean | null
          robo_agendamento?: boolean | null
          data_contato?: string | null
          data_orcamento?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          }
        ]
      }
      vendas: {
        Row: {
          id: string
          id_leads: string
          data_venda: string
          data_servico: string | null
          horario_servico: string | null
          status: string
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_leads: string
          data_venda?: string
          data_servico?: string | null
          horario_servico?: string | null
          status?: string
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_leads?: string
          data_venda?: string
          data_servico?: string | null
          horario_servico?: string | null
          status?: string
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_id_leads_fkey"
            columns: ["id_leads"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          }
        ]
      }
      itens_vendas: {
        Row: {
          id: string
          id_vendas: string
          estofado: string
          valor: number
          bonus: number | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_vendas: string
          estofado: string
          valor?: number
          bonus?: number | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_vendas?: string
          estofado?: string
          valor?: number
          bonus?: number | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_vendas_id_vendas_fkey"
            columns: ["id_vendas"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          }
        ]
      }
      regras_automacoes: {
        Row: {
          id: string
          id_empresa: string
          tipo_lembrete: string
          cadencia_envio: number
          template_mensagem: string | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_empresa: string
          tipo_lembrete: string
          cadencia_envio?: number
          template_mensagem?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_empresa?: string
          tipo_lembrete?: string
          cadencia_envio?: number
          template_mensagem?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_automacoes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          }
        ]
      }
      lembretes_automacoes: {
        Row: {
          id: string
          id_leads: string
          tipo_lembrete: string
          data_execucao: string | null
          disparado: boolean | null
          mensagem: string | null
          data_servico: string | null
          id_empresa: string | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_leads: string
          tipo_lembrete: string
          data_execucao?: string | null
          disparado?: boolean | null
          mensagem?: string | null
          data_servico?: string | null
          id_empresa?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_leads?: string
          tipo_lembrete?: string
          data_execucao?: string | null
          disparado?: boolean | null
          mensagem?: string | null
          data_servico?: string | null
          id_empresa?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_automacoes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_automacoes_id_leads_fkey"
            columns: ["id_leads"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          }
        ]
      }
      os: {
        Row: {
          id: string
          id_vendas: string
          enviado: boolean | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_vendas: string
          enviado?: boolean | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_vendas?: string
          enviado?: boolean | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_id_vendas_fkey"
            columns: ["id_vendas"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          }
        ]
      }
      historico_atendimento: {
        Row: {
          id: string
          id_leads: string
          tipo: string
          descricao: string
          data_criacao: string
        }
        Insert: {
          id?: string
          id_leads: string
          tipo: string
          descricao: string
          data_criacao?: string
        }
        Update: {
          id?: string
          id_leads?: string
          tipo?: string
          descricao?: string
          data_criacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_atendimento_id_leads_fkey"
            columns: ["id_leads"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_metrics: {
        Args: {
          p_empresa_id: string
          p_start: string
          p_end: string
        }
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : keyof (PublicSchema["Tables"] & PublicSchema["Views"]),
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : keyof PublicSchema["Tables"],
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : keyof PublicSchema["Tables"],
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : keyof PublicSchema["Enums"],
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : keyof PublicSchema["CompositeTypes"],
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

type PublicSchema = Database[Extract<keyof Database, "public">]
