// Catálogo de serviços do ResolvaAgora.
// Porte 1:1 de mobile-technician/lib/data/services_data.dart — mantém em
// sincronia manualmente com esse ficheiro (não existe endpoint backend para isto).

export interface ServiceItem {
  id: string
  name: string
  price: number
  unit?: string // undefined = por unidade; 'metro' | 'litro' | 'm²' | 'hora' | 'kg'
}

export interface ServiceSubcategory {
  id: string
  name: string
  description: string
  items: ServiceItem[]
  hasCustomQuote?: boolean // true = orçamento no local, sem lista de preços
}

export interface ServiceCategory {
  id: string
  name: string
  emoji: string
  description: string
  basePrice: number
  subcategories: ServiceSubcategory[]
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'ELECTRICITY',
    name: 'Eletricidade',
    emoji: '⚡',
    description: 'Precisas de serviços de eletricista? Instalação, substituição ou reparação — nós resolvemos.',
    basePrice: 30,
    subcategories: [
      {
        id: 'elec_installation',
        name: 'Instalação Elétrica',
        description: 'Novos pontos de luz, tomadas, interruptores, disjuntores e mais.',
        items: [
          { id: 'tomada_simples', name: 'Tomada simples 16A', price: 29.99 },
          { id: 'tomada_dupla', name: 'Tomada dupla 16A', price: 34.99 },
          { id: 'tomada_usb', name: 'Tomada com USB', price: 34.99 },
          { id: 'interruptor_simples', name: 'Interruptor simples', price: 24.99 },
          { id: 'interruptor_duplo', name: 'Interruptor duplo', price: 29.99 },
          { id: 'ponto_luz', name: 'Ponto de luz / candeeiro', price: 34.99 },
          { id: 'luz_ext_int', name: 'Luz Exterior/Interior', price: 29.99 },
          { id: 'fita_led', name: 'Fita de luz LED (5m)', price: 39.99 },
          { id: 'campainha', name: 'Campainha', price: 34.99 },
          { id: 'ventilador_teto', name: 'Ventilador de teto', price: 59.99 },
          { id: 'intercomunicador', name: 'Intercomunicador vídeo', price: 89.99 },
          { id: 'disjuntor', name: 'Disjuntor', price: 29.99 },
          { id: 'quadro_eletrico', name: 'Quadro elétrico 8 módulos', price: 89.99 },
        ],
      },
      {
        id: 'elec_substitution',
        name: 'Substituição Elétrica',
        description: 'Troca de lâmpadas, cabos, tomadas ou pontos de luz existentes.',
        items: [
          { id: 'lampada_e27', name: 'Lâmpada LED E27', price: 9.99 },
          { id: 'lampada_gu10', name: 'Lâmpada LED GU10', price: 11.99 },
          { id: 'tomada_sub', name: 'Tomada (substituição)', price: 24.99 },
          { id: 'interruptor_sub', name: 'Interruptor (substituição)', price: 24.99 },
          { id: 'disjuntor_sub', name: 'Disjuntor (substituição)', price: 29.99 },
          { id: 'cabo_metro', name: 'Cabo elétrico', price: 3.99, unit: 'metro' },
        ],
      },
      {
        id: 'elec_appliance',
        name: 'Instalação de Eletrodoméstico',
        description: 'Placa elétrica, esquentador, forno, máquina de secar.',
        items: [
          { id: 'placa_eletrica', name: 'Placa elétrica', price: 59.99 },
          { id: 'forno_inst', name: 'Forno', price: 59.99 },
          { id: 'esquentador', name: 'Esquentador', price: 79.99 },
          { id: 'maquina_secar', name: 'Máquina de secar', price: 49.99 },
        ],
      },
      {
        id: 'elec_repair',
        name: 'Reparação Elétrica',
        description: 'Diagnóstico e reparação de falhas elétricas.',
        items: [],
        hasCustomQuote: true,
      },
    ],
  },

  {
    id: 'PLUMBING',
    name: 'Canalização',
    emoji: '🔧',
    description: 'Fugas de água, entupimentos, substituição de torneiras e equipamentos sanitários.',
    basePrice: 30,
    subcategories: [
      {
        id: 'plumb_installation',
        name: 'Instalação de Canalização',
        description: 'Torneiras, misturadores, sanitas, autoclismos e mais.',
        items: [
          { id: 'torneira_lav', name: 'Torneira de lavatório', price: 44.99 },
          { id: 'torneira_coz', name: 'Torneira de cozinha', price: 49.99 },
          { id: 'misturador_duche', name: 'Misturador de duche', price: 59.99 },
          { id: 'sanita', name: 'Sanita', price: 114.99 },
          { id: 'autoclismo', name: 'Autoclismo', price: 43.99 },
          { id: 'valvula_corte', name: 'Válvula de corte', price: 11.99 },
          { id: 'sifao', name: 'Sifão de lavatório', price: 8.99 },
          { id: 'flexivel', name: 'Flexível metálico', price: 7.99 },
        ],
      },
      {
        id: 'plumb_unclog',
        name: 'Desentupimento',
        description: 'Desentupimento de lavatório, WC, banheira, cozinha ou exterior.',
        items: [
          { id: 'destup_lav', name: 'Lavatório', price: 39.99 },
          { id: 'destup_wc', name: 'WC / Sanita', price: 39.99 },
          { id: 'destup_banheira', name: 'Banheira', price: 44.99 },
          { id: 'destup_coz', name: 'Cozinha', price: 44.99 },
          { id: 'destup_ext', name: 'Ramal exterior', price: 59.99 },
        ],
      },
      {
        id: 'plumb_repair',
        name: 'Reparação de Fuga',
        description: 'Diagnóstico e reparação de fugas visíveis ou ocultas.',
        items: [],
        hasCustomQuote: true,
      },
    ],
  },

  {
    id: 'PAINTING',
    name: 'Pintura',
    emoji: '🎨',
    description: 'Pintura interior e exterior, estuque e preparação de superfícies.',
    basePrice: 25,
    subcategories: [
      {
        id: 'paint_interior',
        name: 'Pintura Interior',
        description: 'Paredes e tetos interiores com tinta de alta qualidade.',
        items: [
          { id: 'tinta_int', name: 'Tinta interior', price: 8.64, unit: 'litro' },
          { id: 'primario', name: 'Primário / fundo', price: 7.20, unit: 'litro' },
          { id: 'massa_reg', name: 'Massa de regularização', price: 2.88, unit: 'kg' },
          { id: 'rolo', name: 'Rolo de pintura', price: 4.32 },
          { id: 'fita_mascaramento', name: 'Fita de mascaramento', price: 3.60 },
        ],
      },
      {
        id: 'paint_exterior',
        name: 'Pintura Exterior',
        description: 'Fachadas, muros e superfícies exteriores.',
        items: [
          { id: 'tinta_ext', name: 'Tinta exterior', price: 11.52, unit: 'litro' },
          { id: 'primario_ext', name: 'Primário exterior', price: 9.60, unit: 'litro' },
        ],
      },
      {
        id: 'paint_plaster',
        name: 'Estuque e Preparação',
        description: 'Aplicação de estuque projetado ou liso, regularização.',
        items: [
          { id: 'estuque', name: 'Estuque projetado', price: 3.60, unit: 'm²' },
          { id: 'lixa', name: 'Lixagem de superfície', price: 2.40, unit: 'm²' },
        ],
      },
    ],
  },

  {
    id: 'FURNITURE',
    name: 'Montagem de Móveis',
    emoji: '🪑',
    description: 'Montagem de qualquer móvel: IKEA, Leroy Merlin e outras marcas.',
    basePrice: 15,
    subcategories: [
      {
        id: 'furniture_assembly',
        name: 'Montagem de Móvel',
        description: 'Mesas, cadeiras, roupeiros, camas, sofás e mais.',
        items: [
          { id: 'mesa', name: 'Mesa', price: 29.99 },
          { id: 'cadeira', name: 'Cadeira', price: 13.99 },
          { id: 'roupeiro', name: 'Roupeiro', price: 47.99 },
          { id: 'cama_solteiro', name: 'Cama solteiro', price: 41.99 },
          { id: 'cama_casal', name: 'Cama casal', price: 47.99 },
          { id: 'sofa', name: 'Sofá', price: 35.99 },
          { id: 'prateleiras', name: 'Prateleiras (conjunto 3)', price: 17.99 },
          { id: 'modulo_tv', name: 'Móvel de TV / Estante', price: 23.99 },
          { id: 'comoda', name: 'Cómoda', price: 29.99 },
          { id: 'escrivaninha', name: 'Escrivaninha', price: 29.99 },
        ],
      },
      {
        id: 'furniture_wall',
        name: 'Fixação em Parede',
        description: 'Suportes de TV, espelhos, prateleiras e quadros.',
        items: [
          { id: 'suporte_tv', name: 'Suporte de TV', price: 23.99 },
          { id: 'prateleira_parede', name: 'Prateleira em parede', price: 14.99 },
          { id: 'espelho', name: 'Espelho', price: 14.99 },
          { id: 'quadro_grande', name: 'Quadro / tela grande', price: 11.99 },
        ],
      },
    ],
  },

  {
    id: 'AC',
    name: 'Ar Condicionado',
    emoji: '❄️',
    description: 'Instalação, manutenção, limpeza e reparação de aparelhos de AC.',
    basePrice: 60,
    subcategories: [
      {
        id: 'ac_install',
        name: 'Instalação de AC',
        description: 'Instalação de splits mono ou multi-split.',
        items: [
          { id: 'split_simples', name: 'Split simples (até 12.000 BTU)', price: 143.99 },
          { id: 'split_duplo', name: 'Split duplo / multi-split', price: 215.99 },
        ],
      },
      {
        id: 'ac_maintenance',
        name: 'Manutenção e Limpeza',
        description: 'Limpeza de filtros e manutenção preventiva.',
        items: [
          { id: 'limpeza_filtros', name: 'Limpeza de filtros', price: 35.99 },
          { id: 'limpeza_completa', name: 'Limpeza completa (int + ext)', price: 59.99 },
        ],
      },
      {
        id: 'ac_repair',
        name: 'Reparação e Recarga',
        description: 'Diagnóstico e recarga de gás R32.',
        items: [
          { id: 'diagnostico_ac', name: 'Diagnóstico técnico', price: 23.99 },
          { id: 'recarga_gas', name: 'Recarga de gás R32', price: 95.99 },
        ],
      },
    ],
  },

  {
    id: 'APPLIANCES',
    name: 'Eletrodomésticos',
    emoji: '🍳',
    description: 'Reparação de máquinas de lavar, frigoríficos, fornos e mais.',
    basePrice: 20,
    subcategories: [
      {
        id: 'appl_repair',
        name: 'Reparação de Eletrodoméstico',
        description: 'Diagnóstico e reparação no local.',
        items: [
          { id: 'maq_lavar', name: 'Máquina de lavar roupa', price: 71.99 },
          { id: 'frigorifico', name: 'Frigorífico / combinado', price: 83.99 },
          { id: 'arca', name: 'Arca congeladora', price: 71.99 },
          { id: 'maq_louça', name: 'Máquina de lavar louça', price: 65.99 },
          { id: 'forno_rep', name: 'Forno elétrico / a gás', price: 59.99 },
          { id: 'microondas', name: 'Micro-ondas', price: 41.99 },
          { id: 'aspirador', name: 'Aspirador', price: 35.99 },
        ],
      },
    ],
  },

  {
    id: 'CLEANING',
    name: 'Limpeza',
    emoji: '🧹',
    description: 'Limpeza geral, pós-obra e limpeza de vidros.',
    basePrice: 35,
    subcategories: [
      {
        id: 'clean_general',
        name: 'Limpeza Geral',
        description: 'Limpeza completa de habitação ou escritório.',
        items: [
          { id: 'hora_limpeza', name: 'Limpeza por hora', price: 17.99, unit: 'hora' },
          { id: 'kit_produtos', name: 'Kit de produtos incluído', price: 11.99 },
        ],
      },
      {
        id: 'clean_postwork',
        name: 'Limpeza Pós-Obra',
        description: 'Remoção de pó e entulho após obras ou remodelações.',
        items: [
          { id: 'posObra_m2', name: 'Limpeza pós-obra', price: 5.99, unit: 'm²' },
        ],
      },
      {
        id: 'clean_windows',
        name: 'Limpeza de Vidros',
        description: 'Janelas, portas de vidro e claraboias.',
        items: [
          { id: 'painel_vidro', name: 'Painel de vidro (por face)', price: 5.99 },
        ],
      },
    ],
  },

  {
    id: 'LOCKSMITH',
    name: 'Serralharia',
    emoji: '🔑',
    description: 'Abertura de emergência, substituição de fechaduras e cilindros.',
    basePrice: 30,
    subcategories: [
      {
        id: 'lock_service',
        name: 'Fechaduras',
        description: 'Substituição de cilindros, fechaduras ou abertura de emergência.',
        items: [
          { id: 'cilindro', name: 'Substituição de cilindro', price: 35.99 },
          { id: 'fechadura_completa', name: 'Substituição de fechadura', price: 59.99 },
          { id: 'abertura_emergencia', name: 'Abertura de emergência', price: 47.99 },
        ],
      },
      {
        id: 'lock_door',
        name: 'Portas e Portões',
        description: 'Regulação de portas, reparação de dobradiças e fechos.',
        items: [
          { id: 'dobradica', name: 'Reparação de dobradiça', price: 23.99 },
          { id: 'regulacao_porta', name: 'Regulação / ajuste de porta', price: 17.99 },
        ],
      },
    ],
  },

  {
    id: 'GARDEN',
    name: 'Jardinagem',
    emoji: '🌿',
    description: 'Poda, corte de relva, limpeza e manutenção de jardins.',
    basePrice: 25,
    subcategories: [
      {
        id: 'garden_maint',
        name: 'Manutenção de Jardim',
        description: 'Corte de relva, poda e limpeza geral.',
        items: [
          { id: 'corte_relva', name: 'Corte de relva', price: 2.99, unit: 'm²' },
          { id: 'poda_arbustos', name: 'Poda de arbustos', price: 14.99 },
          { id: 'poda_arvore', name: 'Poda de árvore', price: 34.99 },
          { id: 'limpeza_jardim', name: 'Limpeza e recolha de resíduos', price: 19.99 },
        ],
      },
    ],
  },

  {
    id: 'FLOORING',
    name: 'Revestimentos',
    emoji: '🏠',
    description: 'Colocação de pavimentos, cerâmicos, azulejos e parquet.',
    basePrice: 20,
    subcategories: [
      {
        id: 'floor_tiles',
        name: 'Cerâmicos e Azulejos',
        description: 'Colocação de pavimento cerâmico ou azulejos de parede.',
        items: [
          { id: 'ceramico_pav', name: 'Cerâmico de pavimento', price: 14.99, unit: 'm²' },
          { id: 'azulejo_parede', name: 'Azulejo de parede', price: 16.99, unit: 'm²' },
        ],
      },
      {
        id: 'floor_laminate',
        name: 'Parquet e Flutuante',
        description: 'Colocação de soalho de madeira, parquet ou flutuante.',
        items: [
          { id: 'parquet', name: 'Parquet / soalho', price: 12.99, unit: 'm²' },
          { id: 'flutuante', name: 'Pavimento flutuante', price: 9.99, unit: 'm²' },
        ],
      },
    ],
  },

  {
    id: 'TV_ANTENNA',
    name: 'TV e Antenas',
    emoji: '📺',
    description: 'Instalação de TV, antenas, sistemas de som e domótica.',
    basePrice: 25,
    subcategories: [
      {
        id: 'tv_install',
        name: 'Instalação de TV',
        description: 'Montagem de suporte, ligação de cabos e configuração.',
        items: [
          { id: 'suporte_tv_inst', name: 'Montagem de suporte de TV', price: 29.99 },
          { id: 'cabo_hdmi', name: 'Passagem de cabo HDMI', price: 14.99 },
          { id: 'config_smart', name: 'Configuração Smart TV', price: 19.99 },
        ],
      },
      {
        id: 'antenna',
        name: 'Antenas',
        description: 'Instalação e alinhamento de antenas TDT e satélite.',
        items: [
          { id: 'antena_tdt', name: 'Antena TDT exterior', price: 59.99 },
          { id: 'antena_sat', name: 'Antena de satélite', price: 89.99 },
          { id: 'alinhamento', name: 'Alinhamento de antena', price: 34.99 },
        ],
      },
    ],
  },
]

export function findCategory(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((c) => c.id === id)
}

export function findSubcategory(categoryId: string, subcategoryId: string): ServiceSubcategory | undefined {
  return findCategory(categoryId)?.subcategories.find((s) => s.id === subcategoryId)
}

/** Mapeia o id da categoria do catálogo para o enum Specialty do backend (AC → HVAC, resto igual). */
export function categoryToSpecialty(categoryId: string): string {
  return categoryId === 'AC' ? 'HVAC' : categoryId
}
