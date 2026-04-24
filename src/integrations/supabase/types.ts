export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
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
      empresas: {
        Row: {
          id: string
          id_usuario: string
          nome_empresa: string
          nome_dono: string | null
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
          meta_financeira: number
          custo_operacional: number
          custo_anuncio: number
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_empresa: string
          ano: number
          mes: number
          meta_financeira?: number
          custo_operacional?: number
          custo_anuncio?: number
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_empresa?: string
          ano?: number
          mes?: number
          meta_financeira?: number
          custo_operacional?: number
          custo_anuncio?: number
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
          robo_pos_vendas: boolean
          robo_follow_ups: boolean
          robo_atendimento: boolean
          robo_agendamento: boolean
          qualificacao: string | null
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
          robo_pos_vendas?: boolean
          robo_follow_ups?: boolean
          robo_atendimento?: boolean
          robo_agendamento?: boolean
          qualificacao?: string | null
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
          robo_pos_vendas?: boolean
          robo_follow_ups?: boolean
          robo_atendimento?: boolean
          robo_agendamento?: boolean
          qualificacao?: string | null
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
          bonus: number
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_vendas: string
          estofado: string
          valor?: number
          bonus?: number
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_vendas?: string
          estofado?: string
          valor?: number
          bonus?: number
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
      os: {
        Row: {
          id: string
          id_vendas: string
          enviado: boolean
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_vendas: string
          enviado?: boolean
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_vendas?: string
          enviado?: boolean
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: []
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
      historico_atendimento: {
        Row: {
          id: string
          id_leads: string
          data_interacao: string
          tipo: string
          mensagem: string | null
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_leads: string
          data_interacao?: string
          tipo: string
          mensagem?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_leads?: string
          data_interacao?: string
          tipo?: string
          mensagem?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
