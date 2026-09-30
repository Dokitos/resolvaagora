/**
 * Textos por omissão do "Inclui / Não inclui" de cada serviço.
 *
 * São um rascunho para rever no painel de admin: o que lá for gravado
 * sobrepõe-se a isto, campo a campo. Ficam aqui (e não numa migração de dados)
 * para que um serviço sem edição no painel mostre sempre algo coerente, e para
 * que um serviço novo no catálogo não precise de uma linha na base de dados.
 *
 * Chave: `${categoryId}:${subcategoryId}` — os mesmos identificadores do
 * catálogo da app (services_data.dart) e do site (services-catalog.ts).
 *
 * Regra seguida na redação: nada que a empresa não controle ou não possa
 * cumprir sempre (sem prazos, sem garantias com duração, sem preços).
 */
export interface CatalogContentDefaults {
  includes: string[];
  excludes: string[];
}

export const CATALOG_CONTENT_DEFAULTS: Record<string, CatalogContentDefaults> = {
  // ─── Eletricidade ──────────────────────────────────────────────────────────
  'ELECTRICITY:elec_installation': {
    includes: [
      'Deslocação do técnico ao local',
      'Instalação e ligação de cada item escolhido',
      'Teste de funcionamento no final',
      'Limpeza da zona de trabalho',
    ],
    excludes: [
      'Material a instalar (tomadas, candeeiros, disjuntores…), salvo indicação em contrário',
      'Abertura de roços ou passagem de cabo por paredes sem tubagem',
      'Pintura ou reparação de paredes',
      'Alterações que exijam projeto ou certificação da instalação',
    ],
  },
  'ELECTRICITY:elec_substitution': {
    includes: [
      'Remoção do elemento antigo',
      'Substituição e ligação do novo',
      'Teste de funcionamento',
    ],
    excludes: [
      'Material de substituição, salvo indicação em contrário',
      'Reparação de avarias na instalação para além do elemento substituído',
    ],
  },
  'ELECTRICITY:elec_appliance': {
    includes: [
      'Ligação elétrica do eletrodoméstico a um ponto existente',
      'Verificação do circuito e teste de funcionamento',
    ],
    excludes: [
      'O próprio eletrodoméstico',
      'Criação de novos circuitos ou reforço do quadro elétrico',
      'Ligação a gás (esquentadores a gás requerem técnico de gás)',
      'Encastramento ou ajustes de carpintaria no móvel',
    ],
  },
  'ELECTRICITY:elec_repair': {
    includes: [
      'Diagnóstico da avaria no local',
      'Orçamento antes de qualquer reparação',
      'Reparação, se aprovada',
    ],
    excludes: [
      'Peças e material necessários (incluídos no orçamento, se aplicável)',
      'Obras de construção civil',
    ],
  },

  // ─── Canalização ───────────────────────────────────────────────────────────
  'PLUMBING:plumb_installation': {
    includes: [
      'Deslocação do técnico ao local',
      'Remoção do equipamento antigo, se existir',
      'Instalação e ligação às tubagens existentes',
      'Teste de estanquidade e funcionamento',
    ],
    excludes: [
      'Torneiras, sanitas e restante material, salvo indicação em contrário',
      'Alteração do traçado das tubagens ou abertura de paredes',
      'Remoção de entulho ou do equipamento antigo do local',
    ],
  },
  'PLUMBING:plumb_unclog': {
    includes: [
      'Desentupimento com equipamento adequado',
      'Verificação do escoamento no final',
    ],
    excludes: [
      'Substituição de tubagens danificadas',
      'Desentupimento de coletores públicos ou do condomínio',
      'Obras para acesso a canos embutidos',
    ],
  },
  'PLUMBING:plumb_repair': {
    includes: [
      'Localização da fuga no local',
      'Orçamento antes de qualquer reparação',
      'Reparação, se aprovada',
    ],
    excludes: [
      'Peças e material necessários (incluídos no orçamento, se aplicável)',
      'Reparação de danos causados pela fuga (tetos, pavimentos, pintura)',
    ],
  },

  // ─── Pintura ───────────────────────────────────────────────────────────────
  'PAINTING:paint_interior': {
    includes: [
      'Proteção de pavimentos e móveis da divisão',
      'Aplicação das demãos necessárias',
      'Limpeza no final do trabalho',
    ],
    excludes: [
      'Tinta e material, salvo os itens escolhidos no pedido',
      'Reparação de fissuras profundas ou humidades',
      'Deslocação de móveis pesados',
    ],
  },
  'PAINTING:paint_exterior': {
    includes: [
      'Preparação e limpeza da superfície',
      'Aplicação das demãos necessárias',
    ],
    excludes: [
      'Andaimes ou meios de elevação para trabalhos em altura',
      'Tinta e material, salvo os itens escolhidos no pedido',
      'Licenças camarárias, quando necessárias',
    ],
  },
  'PAINTING:paint_plaster': {
    includes: [
      'Aplicação de estuque ou regularização da superfície',
      'Lixagem e preparação para pintura',
    ],
    excludes: [
      'Pintura final (pedido separado)',
      'Tratamento de humidades ou infiltrações',
    ],
  },

  // ─── Montagem de móveis ────────────────────────────────────────────────────
  'FURNITURE:furniture_assembly': {
    includes: [
      'Desembalamento do móvel',
      'Verificação de peças em falta ou danificadas antes de começar',
      'Montagem de todos os componentes',
      'Recolha das embalagens para um local indicado em casa',
    ],
    excludes: [
      'Fixação à parede (pedido de fixação em parede)',
      'Transporte do móvel desde a loja',
      'Montagem de móveis com peças em falta: fica reagendada',
      'Remoção das embalagens para fora da habitação',
    ],
  },
  'FURNITURE:furniture_wall': {
    includes: [
      'Marcação, furação e fixação na parede',
      'Buchas e parafusos adequados ao tipo de parede',
      'Nivelamento do elemento fixado',
    ],
    excludes: [
      'O suporte, espelho ou prateleira a fixar',
      'Passagem de cabos pela parede',
      'Fixação em paredes que não suportem a carga',
    ],
  },

  // ─── Ar condicionado ───────────────────────────────────────────────────────
  'AC:ac_install': {
    includes: [
      'Instalação das unidades interior e exterior',
      'Ligação frigorífica até 3 metros entre unidades',
      'Vácuo do circuito e teste de funcionamento',
    ],
    excludes: [
      'O equipamento de ar condicionado',
      'Tubagem adicional acima de 3 metros',
      'Criação de circuito elétrico dedicado',
      'Trabalhos em altura que exijam andaimes',
      'Autorização do condomínio para a unidade exterior',
    ],
  },
  'AC:ac_maintenance': {
    includes: [
      'Limpeza de filtros',
      'Verificação geral de funcionamento',
      'Limpeza completa interior e exterior, se escolhida',
    ],
    excludes: [
      'Recarga de gás (pedido de reparação e recarga)',
      'Reparação de avarias detetadas',
    ],
  },
  'AC:ac_repair': {
    includes: [
      'Diagnóstico técnico no local',
      'Recarga de gás R32, se escolhida',
      'Orçamento antes de qualquer reparação adicional',
    ],
    excludes: [
      'Peças de substituição (incluídas no orçamento, se aplicável)',
      'Reparação de fugas no circuito antes da recarga',
    ],
  },

  // ─── Eletrodomésticos ──────────────────────────────────────────────────────
  'APPLIANCES:appl_repair': {
    includes: [
      'Diagnóstico da avaria no local',
      'Orçamento antes de qualquer reparação',
      'Reparação no local, quando possível',
    ],
    excludes: [
      'Peças de substituição (incluídas no orçamento, se aplicável)',
      'Transporte do equipamento para oficina',
      'Equipamentos ainda em garantia do fabricante (contacte a marca)',
    ],
  },

  // ─── Limpeza ───────────────────────────────────────────────────────────────
  'CLEANING:clean_general': {
    includes: [
      'Limpeza de pó, pavimentos e superfícies',
      'Limpeza de cozinha e casas de banho',
      'Produtos de limpeza, se escolhido o kit',
    ],
    excludes: [
      'Limpeza do interior de eletrodomésticos',
      'Lavagem de roupa ou loiça',
      'Limpeza de vidros exteriores em altura',
    ],
  },
  'CLEANING:clean_postwork': {
    includes: [
      'Remoção de pó de obra de superfícies e pavimentos',
      'Limpeza de caixilharias e vidros interiores',
    ],
    excludes: [
      'Remoção de entulho e resíduos de construção',
      'Remoção de tinta ou cimento endurecidos',
    ],
  },
  'CLEANING:clean_windows': {
    includes: [
      'Limpeza de vidros e caixilhos',
      'Faces interior e/ou exterior, conforme escolhido',
    ],
    excludes: [
      'Vidros inacessíveis sem meios de elevação',
      'Limpeza de estores e persianas',
    ],
  },

  // ─── Serralharia ───────────────────────────────────────────────────────────
  'LOCKSMITH:lock_service': {
    includes: [
      'Substituição de cilindro ou fechadura, conforme escolhido',
      'Abertura de porta, em caso de emergência',
      'Teste de funcionamento e entrega de chaves',
    ],
    excludes: [
      'Cilindro ou fechadura novos, salvo indicação em contrário',
      'Portas blindadas de segurança elevada (orçamento no local)',
      'Reparação da porta ou do aro',
    ],
  },
  'LOCKSMITH:lock_door': {
    includes: [
      'Regulação e ajuste da porta',
      'Reparação ou substituição de dobradiças',
    ],
    excludes: [
      'Dobradiças e ferragens novas, salvo indicação em contrário',
      'Portões automáticos e motores',
    ],
  },

  // ─── Jardinagem ────────────────────────────────────────────────────────────
  'GARDEN:garden_maint': {
    includes: [
      'Corte de relva, poda ou limpeza, conforme escolhido',
      'Recolha dos resíduos verdes, se escolhida',
    ],
    excludes: [
      'Abate de árvores',
      'Tratamentos fitossanitários',
      'Transporte de resíduos para fora do local, salvo o item de recolha',
    ],
  },

  // ─── Revestimentos ─────────────────────────────────────────────────────────
  'FLOORING:floor_tiles': {
    includes: [
      'Assentamento de cerâmico ou azulejo',
      'Cortes e acabamentos',
      'Betumação das juntas',
    ],
    excludes: [
      'Cerâmicos, cola e betume',
      'Remoção do revestimento antigo',
      'Regularização de betonilha',
    ],
  },
  'FLOORING:floor_laminate': {
    includes: [
      'Colocação de manta isolante',
      'Colocação do pavimento',
      'Rodapés e remates, se incluídos no material',
    ],
    excludes: [
      'Pavimento e manta',
      'Remoção do pavimento antigo',
      'Corte de portas para acerto de altura',
    ],
  },

  // ─── TV e antenas ──────────────────────────────────────────────────────────
  'TV_ANTENNA:tv_install': {
    includes: [
      'Montagem do suporte e da TV',
      'Ligação e arrumação dos cabos visíveis',
      'Configuração básica da Smart TV, se escolhida',
    ],
    excludes: [
      'Suporte e cabos',
      'Passagem de cabos por dentro da parede',
      'Configuração de serviços de operador',
    ],
  },
  'TV_ANTENNA:antenna': {
    includes: [
      'Instalação ou alinhamento da antena',
      'Verificação da qualidade do sinal',
    ],
    excludes: [
      'A antena e o material de fixação',
      'Trabalhos em telhados sem acesso seguro',
      'Distribuição de sinal por várias divisões',
    ],
  },
};
