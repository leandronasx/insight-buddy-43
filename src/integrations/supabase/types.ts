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
          status: 'ativo' | 'inativo' | 'bloqueado'
          permissao: 'admin' | 'manager' | 'viewer'
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id: string
          email: string
          senha?: string | null
          status?: 'ativo' | 'inativo' | 'bloqueado'
          permissao?: 'admin' | 'manager' | 'viewer'
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          email?: string
          senha?: string | null
          status?: 'ativo' | 'inativo' | 'bloqueado'
          permissao?: 'admin' | 'manager' | 'viewer'
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
          situacao_do_cliente: 'Agendado' | 'Fechado' | 'Reabordar' | 'Sem Interesse' | 'Interesse Futuro' | null
          momento_funil: 'Pre Orçamento' | 'Pos Orçamento' | 'Pos Venda' | null
          qualificacao: 'Sim' | 'Não' | null
          robo_pos_vendas: boolean
          robo_follow_ups: boolean
          robo_atendimento: boolean
          robo_agendamento: boolean
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
          situacao_do_cliente?: 'Agendado' | 'Fechado' | 'Reabordar' | 'Sem Interesse' | 'Interesse Futuro' | null
          momento_funil?: 'Pre Orçamento' | 'Pos Orçamento' | 'Pos Venda' | null
          qualificacao?: 'Sim' | 'Não' | null
          robo_pos_vendas?: boolean
          robo_follow_ups?: boolean
          robo_atendimento?: boolean
          robo_agendamento?: boolean
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
          situacao_do_cliente?: 'Agendado' | 'Fechado' | 'Reabordar' | 'Sem Interesse' | 'Interesse Futuro' | null
          momento_funil?: 'Pre Orçamento' | 'Pos Orçamento' | 'Pos Venda' | null
          qualificacao?: 'Sim' | 'Não' | null
          robo_pos_vendas?: boolean
          robo_follow_ups?: boolean
          robo_atendimento?: boolean
          robo_agendamento?: boolean
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
          status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
          data_criacao: string
          data_atualizacao: string
        }
        Insert: {
          id?: string
          id_leads: string
          data_venda?: string
          data_servico?: string | null
          horario_servico?: string | null
          status?: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
          data_criacao?: string
          data_atualizacao?: string
        }
        Update: {
          id?: string
          id_leads?: string
          data_venda?: string
          data_servico?: string | null
          horario_servico?: string | null
          status?: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
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
          valor: number
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
          id_empresa: string | null
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
          id_empresa?: string | null
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
          id_empresa?: string | null
          tipo_lembrete?: string
          data_execucao?: string | null
          disparado?: boolean
          mensagem?: string | null
          data_servico?: string | null
          data_criacao?: string
          data_atualizacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_automacoes_id_leads_fkey"
            columns: ["id_leads"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembretes_automacoes_id_empresa_fkey"
            columns: ["id_empresa"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          }
        ]
      }
    }
  }
}