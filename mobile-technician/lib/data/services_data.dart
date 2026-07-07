// Service taxonomy for ResolvaAgora
// Prices include material + labour, +20% over market rate

class ServiceItem {
  final String id;
  final String name;
  final double price;
  final String? unit; // null = per unit, 'metro', 'litro', 'm2', 'hora'

  const ServiceItem({
    required this.id,
    required this.name,
    required this.price,
    this.unit,
  });
}

class ServiceSubcategory {
  final String id;
  final String name;
  final String description;
  final List<ServiceItem> items;
  final bool hasCustomQuote; // true = orçamento no local

  const ServiceSubcategory({
    required this.id,
    required this.name,
    required this.description,
    required this.items,
    this.hasCustomQuote = false,
  });
}

class ServiceCategory {
  final String id;
  final String name;
  final String emoji;
  final String description;
  final double basePrice;
  final List<ServiceSubcategory> subcategories;

  const ServiceCategory({
    required this.id,
    required this.name,
    required this.emoji,
    required this.description,
    required this.basePrice,
    required this.subcategories,
  });
}

final List<ServiceCategory> kServiceCategories = [
  ServiceCategory(
    id: 'ELECTRICITY',
    name: 'Eletricidade',
    emoji: '⚡',
    description:
        'Precisas de serviços de eletricista? Instalação, substituição ou reparação — nós resolvemos.',
    basePrice: 30,
    subcategories: [
      ServiceSubcategory(
        id: 'elec_installation',
        name: 'Instalação Elétrica',
        description: 'Novos pontos de luz, tomadas, interruptores, disjuntores e mais.',
        items: [
          ServiceItem(id: 'tomada_simples', name: 'Tomada simples 16A', price: 29.99),
          ServiceItem(id: 'tomada_dupla', name: 'Tomada dupla 16A', price: 34.99),
          ServiceItem(id: 'tomada_usb', name: 'Tomada com USB', price: 34.99),
          ServiceItem(id: 'interruptor_simples', name: 'Interruptor simples', price: 24.99),
          ServiceItem(id: 'interruptor_duplo', name: 'Interruptor duplo', price: 29.99),
          ServiceItem(id: 'ponto_luz', name: 'Ponto de luz / candeeiro', price: 34.99),
          ServiceItem(id: 'luz_ext_int', name: 'Luz Exterior/Interior', price: 29.99),
          ServiceItem(id: 'fita_led', name: 'Fita de luz LED (5m)', price: 39.99),
          ServiceItem(id: 'campainha', name: 'Campainha', price: 34.99),
          ServiceItem(id: 'ventilador_teto', name: 'Ventilador de teto', price: 59.99),
          ServiceItem(id: 'intercomunicador', name: 'Intercomunicador vídeo', price: 89.99),
          ServiceItem(id: 'disjuntor', name: 'Disjuntor', price: 29.99),
          ServiceItem(id: 'quadro_eletrico', name: 'Quadro elétrico 8 módulos', price: 89.99),
        ],
      ),
      ServiceSubcategory(
        id: 'elec_substitution',
        name: 'Substituição Elétrica',
        description: 'Troca de lâmpadas, cabos, tomadas ou pontos de luz existentes.',
        items: [
          ServiceItem(id: 'lampada_e27', name: 'Lâmpada LED E27', price: 9.99),
          ServiceItem(id: 'lampada_gu10', name: 'Lâmpada LED GU10', price: 11.99),
          ServiceItem(id: 'tomada_sub', name: 'Tomada (substituição)', price: 24.99),
          ServiceItem(id: 'interruptor_sub', name: 'Interruptor (substituição)', price: 24.99),
          ServiceItem(id: 'disjuntor_sub', name: 'Disjuntor (substituição)', price: 29.99),
          ServiceItem(id: 'cabo_metro', name: 'Cabo elétrico', price: 3.99, unit: 'metro'),
        ],
      ),
      ServiceSubcategory(
        id: 'elec_appliance',
        name: 'Instalação de Eletrodoméstico',
        description: 'Placa elétrica, esquentador, forno, máquina de secar.',
        items: [
          ServiceItem(id: 'placa_eletrica', name: 'Placa elétrica', price: 59.99),
          ServiceItem(id: 'forno_inst', name: 'Forno', price: 59.99),
          ServiceItem(id: 'esquentador', name: 'Esquentador', price: 79.99),
          ServiceItem(id: 'maquina_secar', name: 'Máquina de secar', price: 49.99),
        ],
      ),
      ServiceSubcategory(
        id: 'elec_repair',
        name: 'Reparação Elétrica',
        description: 'Diagnóstico e reparação de falhas elétricas.',
        items: [],
        hasCustomQuote: true,
      ),
    ],
  ),

  ServiceCategory(
    id: 'PLUMBING',
    name: 'Canalização',
    emoji: '🔧',
    description:
        'Fugas de água, entupimentos, substituição de torneiras e equipamentos sanitários.',
    basePrice: 30,
    subcategories: [
      ServiceSubcategory(
        id: 'plumb_installation',
        name: 'Instalação de Canalização',
        description: 'Torneiras, misturadores, sanitas, autoclismos e mais.',
        items: [
          ServiceItem(id: 'torneira_lav', name: 'Torneira de lavatório', price: 44.99),
          ServiceItem(id: 'torneira_coz', name: 'Torneira de cozinha', price: 49.99),
          ServiceItem(id: 'misturador_duche', name: 'Misturador de duche', price: 59.99),
          ServiceItem(id: 'sanita', name: 'Sanita', price: 114.99),
          ServiceItem(id: 'autoclismo', name: 'Autoclismo', price: 43.99),
          ServiceItem(id: 'valvula_corte', name: 'Válvula de corte', price: 11.99),
          ServiceItem(id: 'sifao', name: 'Sifão de lavatório', price: 8.99),
          ServiceItem(id: 'flexivel', name: 'Flexível metálico', price: 7.99),
        ],
      ),
      ServiceSubcategory(
        id: 'plumb_unclog',
        name: 'Desentupimento',
        description: 'Desentupimento de lavatório, WC, banheira, cozinha ou exterior.',
        items: [
          ServiceItem(id: 'destup_lav', name: 'Lavatório', price: 39.99),
          ServiceItem(id: 'destup_wc', name: 'WC / Sanita', price: 39.99),
          ServiceItem(id: 'destup_banheira', name: 'Banheira', price: 44.99),
          ServiceItem(id: 'destup_coz', name: 'Cozinha', price: 44.99),
          ServiceItem(id: 'destup_ext', name: 'Ramal exterior', price: 59.99),
        ],
      ),
      ServiceSubcategory(
        id: 'plumb_repair',
        name: 'Reparação de Fuga',
        description: 'Diagnóstico e reparação de fugas visíveis ou ocultas.',
        items: [],
        hasCustomQuote: true,
      ),
    ],
  ),

  ServiceCategory(
    id: 'PAINTING',
    name: 'Pintura',
    emoji: '🎨',
    description: 'Pintura interior e exterior, estuque e preparação de superfícies.',
    basePrice: 25,
    subcategories: [
      ServiceSubcategory(
        id: 'paint_interior',
        name: 'Pintura Interior',
        description: 'Paredes e tetos interiores com tinta de alta qualidade.',
        items: [
          ServiceItem(id: 'tinta_int', name: 'Tinta interior', price: 8.64, unit: 'litro'),
          ServiceItem(id: 'primario', name: 'Primário / fundo', price: 7.20, unit: 'litro'),
          ServiceItem(id: 'massa_reg', name: 'Massa de regularização', price: 2.88, unit: 'kg'),
          ServiceItem(id: 'rolo', name: 'Rolo de pintura', price: 4.32),
          ServiceItem(id: 'fita_mascaramento', name: 'Fita de mascaramento', price: 3.60),
        ],
      ),
      ServiceSubcategory(
        id: 'paint_exterior',
        name: 'Pintura Exterior',
        description: 'Fachadas, muros e superfícies exteriores.',
        items: [
          ServiceItem(id: 'tinta_ext', name: 'Tinta exterior', price: 11.52, unit: 'litro'),
          ServiceItem(id: 'primario_ext', name: 'Primário exterior', price: 9.60, unit: 'litro'),
        ],
      ),
      ServiceSubcategory(
        id: 'paint_plaster',
        name: 'Estuque e Preparação',
        description: 'Aplicação de estuque projetado ou liso, regularização.',
        items: [
          ServiceItem(id: 'estuque', name: 'Estuque projetado', price: 3.60, unit: 'm²'),
          ServiceItem(id: 'lixa', name: 'Lixagem de superfície', price: 2.40, unit: 'm²'),
        ],
      ),
    ],
  ),

  ServiceCategory(
    id: 'FURNITURE',
    name: 'Montagem de Móveis',
    emoji: '🪑',
    description: 'Montagem de qualquer móvel: IKEA, Leroy Merlin e outras marcas.',
    basePrice: 15,
    subcategories: [
      ServiceSubcategory(
        id: 'furniture_assembly',
        name: 'Montagem de Móvel',
        description: 'Mesas, cadeiras, roupeiros, camas, sofás e mais.',
        items: [
          ServiceItem(id: 'mesa', name: 'Mesa', price: 29.99),
          ServiceItem(id: 'cadeira', name: 'Cadeira', price: 13.99),
          ServiceItem(id: 'roupeiro', name: 'Roupeiro', price: 47.99),
          ServiceItem(id: 'cama_solteiro', name: 'Cama solteiro', price: 41.99),
          ServiceItem(id: 'cama_casal', name: 'Cama casal', price: 47.99),
          ServiceItem(id: 'sofa', name: 'Sofá', price: 35.99),
          ServiceItem(id: 'prateleiras', name: 'Prateleiras (conjunto 3)', price: 17.99),
          ServiceItem(id: 'modulo_tv', name: 'Móvel de TV / Estante', price: 23.99),
          ServiceItem(id: 'comoda', name: 'Cómoda', price: 29.99),
          ServiceItem(id: 'escrivaninha', name: 'Escrivaninha', price: 29.99),
        ],
      ),
      ServiceSubcategory(
        id: 'furniture_wall',
        name: 'Fixação em Parede',
        description: 'Suportes de TV, espelhos, prateleiras e quadros.',
        items: [
          ServiceItem(id: 'suporte_tv', name: 'Suporte de TV', price: 23.99),
          ServiceItem(id: 'prateleira_parede', name: 'Prateleira em parede', price: 14.99),
          ServiceItem(id: 'espelho', name: 'Espelho', price: 14.99),
          ServiceItem(id: 'quadro_grande', name: 'Quadro / tela grande', price: 11.99),
        ],
      ),
    ],
  ),

  ServiceCategory(
    id: 'AC',
    name: 'Ar Condicionado',
    emoji: '❄️',
    description: 'Instalação, manutenção, limpeza e reparação de aparelhos de AC.',
    basePrice: 60,
    subcategories: [
      ServiceSubcategory(
        id: 'ac_install',
        name: 'Instalação de AC',
        description: 'Instalação de splits mono ou multi-split.',
        items: [
          ServiceItem(id: 'split_simples', name: 'Split simples (até 12.000 BTU)', price: 143.99),
          ServiceItem(id: 'split_duplo', name: 'Split duplo / multi-split', price: 215.99),
        ],
      ),
      ServiceSubcategory(
        id: 'ac_maintenance',
        name: 'Manutenção e Limpeza',
        description: 'Limpeza de filtros e manutenção preventiva.',
        items: [
          ServiceItem(id: 'limpeza_filtros', name: 'Limpeza de filtros', price: 35.99),
          ServiceItem(id: 'limpeza_completa', name: 'Limpeza completa (int + ext)', price: 59.99),
        ],
      ),
      ServiceSubcategory(
        id: 'ac_repair',
        name: 'Reparação e Recarga',
        description: 'Diagnóstico e recarga de gás R32.',
        items: [
          ServiceItem(id: 'diagnostico_ac', name: 'Diagnóstico técnico', price: 23.99),
          ServiceItem(id: 'recarga_gas', name: 'Recarga de gás R32', price: 95.99),
        ],
      ),
    ],
  ),

  ServiceCategory(
    id: 'APPLIANCES',
    name: 'Eletrodomésticos',
    emoji: '🍳',
    description: 'Reparação de máquinas de lavar, frigoríficos, fornos e mais.',
    basePrice: 20,
    subcategories: [
      ServiceSubcategory(
        id: 'appl_repair',
        name: 'Reparação de Eletrodoméstico',
        description: 'Diagnóstico e reparação no local.',
        items: [
          ServiceItem(id: 'maq_lavar', name: 'Máquina de lavar roupa', price: 71.99),
          ServiceItem(id: 'frigorifico', name: 'Frigorífico / combinado', price: 83.99),
          ServiceItem(id: 'arca', name: 'Arca congeladora', price: 71.99),
          ServiceItem(id: 'maq_louça', name: 'Máquina de lavar louça', price: 65.99),
          ServiceItem(id: 'forno_rep', name: 'Forno elétrico / a gás', price: 59.99),
          ServiceItem(id: 'microondas', name: 'Micro-ondas', price: 41.99),
          ServiceItem(id: 'aspirador', name: 'Aspirador', price: 35.99),
        ],
      ),
    ],
  ),

  ServiceCategory(
    id: 'CLEANING',
    name: 'Limpeza',
    emoji: '🧹',
    description: 'Limpeza geral, pós-obra e limpeza de vidros.',
    basePrice: 35,
    subcategories: [
      ServiceSubcategory(
        id: 'clean_general',
        name: 'Limpeza Geral',
        description: 'Limpeza completa de habitação ou escritório.',
        items: [
          ServiceItem(id: 'hora_limpeza', name: 'Limpeza por hora', price: 17.99, unit: 'hora'),
          ServiceItem(id: 'kit_produtos', name: 'Kit de produtos incluído', price: 11.99),
        ],
      ),
      ServiceSubcategory(
        id: 'clean_postwork',
        name: 'Limpeza Pós-Obra',
        description: 'Remoção de pó e entulho após obras ou remodelações.',
        items: [
          ServiceItem(id: 'posObra_m2', name: 'Limpeza pós-obra', price: 5.99, unit: 'm²'),
        ],
      ),
      ServiceSubcategory(
        id: 'clean_windows',
        name: 'Limpeza de Vidros',
        description: 'Janelas, portas de vidro e claraboias.',
        items: [
          ServiceItem(id: 'painel_vidro', name: 'Painel de vidro (por face)', price: 5.99),
        ],
      ),
    ],
  ),

  ServiceCategory(
    id: 'LOCKSMITH',
    name: 'Serralharia',
    emoji: '🔑',
    description: 'Abertura de emergência, substituição de fechaduras e cilindros.',
    basePrice: 30,
    subcategories: [
      ServiceSubcategory(
        id: 'lock_service',
        name: 'Fechaduras',
        description: 'Substituição de cilindros, fechaduras ou abertura de emergência.',
        items: [
          ServiceItem(id: 'cilindro', name: 'Substituição de cilindro', price: 35.99),
          ServiceItem(id: 'fechadura_completa', name: 'Substituição de fechadura', price: 59.99),
          ServiceItem(id: 'abertura_emergencia', name: 'Abertura de emergência', price: 47.99),
        ],
      ),
      ServiceSubcategory(
        id: 'lock_door',
        name: 'Portas e Portões',
        description: 'Regulação de portas, reparação de dobradiças e fechos.',
        items: [
          ServiceItem(id: 'dobradica', name: 'Reparação de dobradiça', price: 23.99),
          ServiceItem(id: 'regulacao_porta', name: 'Regulação / ajuste de porta', price: 17.99),
        ],
      ),
    ],
  ),

  ServiceCategory(
    id: 'GARDEN',
    name: 'Jardinagem',
    emoji: '🌿',
    description: 'Poda, corte de relva, limpeza e manutenção de jardins.',
    basePrice: 25,
    subcategories: [
      ServiceSubcategory(
        id: 'garden_maint',
        name: 'Manutenção de Jardim',
        description: 'Corte de relva, poda e limpeza geral.',
        items: [
          ServiceItem(id: 'corte_relva', name: 'Corte de relva', price: 2.99, unit: 'm²'),
          ServiceItem(id: 'poda_arbustos', name: 'Poda de arbustos', price: 14.99),
          ServiceItem(id: 'poda_arvore', name: 'Poda de árvore', price: 34.99),
          ServiceItem(id: 'limpeza_jardim', name: 'Limpeza e recolha de resíduos', price: 19.99),
        ],
      ),
    ],
  ),

  ServiceCategory(
    id: 'FLOORING',
    name: 'Revestimentos',
    emoji: '🏠',
    description: 'Colocação de pavimentos, cerâmicos, azulejos e parquet.',
    basePrice: 20,
    subcategories: [
      ServiceSubcategory(
        id: 'floor_tiles',
        name: 'Cerâmicos e Azulejos',
        description: 'Colocação de pavimento cerâmico ou azulejos de parede.',
        items: [
          ServiceItem(id: 'ceramico_pav', name: 'Cerâmico de pavimento', price: 14.99, unit: 'm²'),
          ServiceItem(id: 'azulejo_parede', name: 'Azulejo de parede', price: 16.99, unit: 'm²'),
        ],
      ),
      ServiceSubcategory(
        id: 'floor_laminate',
        name: 'Parquet e Flutuante',
        description: 'Colocação de soalho de madeira, parquet ou flutuante.',
        items: [
          ServiceItem(id: 'parquet', name: 'Parquet / soalho', price: 12.99, unit: 'm²'),
          ServiceItem(id: 'flutuante', name: 'Pavimento flutuante', price: 9.99, unit: 'm²'),
        ],
      ),
    ],
  ),

  ServiceCategory(
    id: 'TV_ANTENNA',
    name: 'TV e Antenas',
    emoji: '📺',
    description: 'Instalação de TV, antenas, sistemas de som e domótica.',
    basePrice: 25,
    subcategories: [
      ServiceSubcategory(
        id: 'tv_install',
        name: 'Instalação de TV',
        description: 'Montagem de suporte, ligação de cabos e configuração.',
        items: [
          ServiceItem(id: 'suporte_tv_inst', name: 'Montagem de suporte de TV', price: 29.99),
          ServiceItem(id: 'cabo_hdmi', name: 'Passagem de cabo HDMI', price: 14.99),
          ServiceItem(id: 'config_smart', name: 'Configuração Smart TV', price: 19.99),
        ],
      ),
      ServiceSubcategory(
        id: 'antenna',
        name: 'Antenas',
        description: 'Instalação e alinhamento de antenas TDT e satélite.',
        items: [
          ServiceItem(id: 'antena_tdt', name: 'Antena TDT exterior', price: 59.99),
          ServiceItem(id: 'antena_sat', name: 'Antena de satélite', price: 89.99),
          ServiceItem(id: 'alinhamento', name: 'Alinhamento de antena', price: 34.99),
        ],
      ),
    ],
  ),
];
