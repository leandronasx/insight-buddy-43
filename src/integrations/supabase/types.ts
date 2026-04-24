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
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'user'
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'user'
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'user'
        }
        Relationships: []
      }
      empresas: {
        Row: {
          id: string
          user_id: string
          empresa_nome: string
          status: 'ativo' | 'inativo'
          nome_dono: string | null
          data_inicio: string | null
          data_termino: string | null
          endereco: string | null
          cnpj_cpf: string | null
          email: string | null
          telefone: string | null
          logo_url: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          empresa_nome: string
          status?: 'ativo' | 'inativo'
          nome_dono?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          endereco?: string | null
          cnpj_cpf?: string | null
          email?: string | null
          telefone?: string | null
          logo_url?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          empresa_nome?: string
          status?: 'ativo' | 'inativo'
          nome_dono?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          endereco?: string | null
          cnpj_cpf?: string | null
          email?: string | null
          telefone?: string | null
          logo_url?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          empresa_id: string
          nome_lead: string
          telefone: string | null
          origem: 'Tráfego' | 'Orgânico' | 'Indicação'
          status: 'Agendado' | 'Sem Interesse' | 'Fechado' | 'Reabordar'
          data_mensagem: string
          endereco: string | null
          email: string | null
          cpf_cnpj: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome_lead: string
          telefone?: string | null
          origem?: 'Tráfego' | 'Orgânico' | 'Indicação'
          status?: 'Agendado' | 'Sem Interesse' | 'Fechado' | 'Reabordar'
          data_mensagem?: string
          endereco?: string | null
          email?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome_lead?: string
          telefone?: string | null
          origem?: 'Tráfego' | 'Orgânico' | 'Indicação'
          status?: 'Agendado' | 'Sem Interesse' | 'Fechado' | 'Reabordar'
          data_mensagem?: string
          endereco?: string | null
          email?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          }
        ]
      }
      vendas: {
        Row: {
          id: string
          lead_id: string | null
          empresa_id: string
          valor_cheio: number
          desconto: number
          valor_final: number
          data_venda: string
          data_agendada: string | null
          horario_agendado: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          empresa_id: string
          valor_cheio?: number
          desconto?: number
          valor_final?: number
          data_venda?: string
          data_agendada?: string | null
          horario_agendado?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          empresa_id?: string
          valor_cheio?: number
          desconto?: number
          valor_final?: number
          data_venda?: string
          data_agendada?: string | null
          horario_agendado?: string | null
          created_at?: string
          updated_at?: string
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
          }
        ]
      }
      servicos: {
        Row: {
          id: string
          lead_id: string | null
          empresa_id: string
          venda_id: string | null
          estofado: string | null
          valor: number
          tipo_servico: 'higienização' | 'impermeabilização' | 'higienização e impermeabilização'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          empresa_id: string
          venda_id?: string | null
          estofado?: string | null
          valor?: number
          tipo_servico?: 'higienização' | 'impermeabilização' | 'higienização e impermeabilização'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          empresa_id?: string
          venda_id?: string | null
          estofado?: string | null
          valor?: number
          tipo_servico?: 'higienização' | 'impermeabilização' | 'higienização e impermeabilização'
          created_at?: string
          updated_at?: string
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
          }
        ]
      }
      financeiro_mensal: {
        Row: {
          id: string
          empresa_id: string
          mes_referencia: number
          ano_referencia: number
          investimento_trafego: number
          custo_operacional: number
          meta_faturamento: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          mes_referencia: number
          ano_referencia: number
          investimento_trafego?: number
          custo_operacional?: number
          meta_faturamento?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          mes_referencia?: number
          ano_referencia?: number
          investimento_trafego?: number
          custo_operacional?: number
          meta_faturamento?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_mensal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
        Relationships: []
      }
      lembretes_automacoes: {
        Row: {
          id: string
          id_leads: string
          tipo_lembrete: string
          data_execucao: string | null
          disparado: boolean
          mensagem: string | null
          data_servico: string | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_leads: string
          tipo_lembrete: string
          data_execucao?: string | null
          disparado?: boolean
          mensagem?: string | null
          data_servico?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_leads?: string
          tipo_lembrete?: string
          data_execucao?: string | null
          disparado?: boolean
          mensagem?: string | null
          data_servico?: string | null
          data_criacao?: string
          data_atualizacao?: string
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
      app_role: 'admin' | 'user'
      empresa_status: 'ativo' | 'inativo'
      lead_origem: 'Tráfego' | 'Orgânico' | 'Indicação'
      lead_status: 'Agendado' | 'Sem Interesse' | 'Fechado' | 'Reabordar'
      tipo_servico: 'higienização' | 'impermeabilização' | 'higienização e impermeabilização'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    : never = never,
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
    : never = never,
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
    : never = never,
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
