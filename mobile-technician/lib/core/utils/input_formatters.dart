import 'package:flutter/services.dart';

/// Formatadores de entrada partilhados pelos formulários da app.
///
/// Espelham as regras que o servidor aplica (ver
/// `backend/src/shared/validation/text.validators.ts`). O servidor é quem
/// garante — isto é conforto: impede o caractere de entrar em vez de deixar
/// escrever tudo e só depois recusar o formulário inteiro.

/// Emoji, seletores de variação, "zero-width joiner" e caracteres de controlo.
final _emoji = RegExp(
  // O `valid_regexps` do analisador não conhece a propriedade
  // Extended_Pictographic e dá-a como inválida, mas o motor de expressões do
  // Dart suporta-a — os testes em test/input_formatters_test.dart provam que
  // os emojis (incluindo os compostos) são mesmo retirados.
  // ignore: valid_regexps
  r'[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{1F1E6}-\u{1F1FF}]',
  unicode: true,
);
final _controlExceptNewline = RegExp(r'[\u0000-\u0009\u000B-\u001F\u007F-\u009F]');

/// Remove emoji e caracteres de controlo; mantém letras, números, pontuação e
/// quebras de linha. Para descrições, mensagens e moradas.
class NoEmojiFormatter extends TextInputFormatter {
  const NoEmojiFormatter();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final cleaned = newValue.text.replaceAll(_emoji, '').replaceAll(_controlExceptNewline, '');
    return _keepCursor(newValue, cleaned);
  }
}

/// Nomes: só letras (com acentos), espaço, hífen, apóstrofo e ponto.
final nameFormatters = <TextInputFormatter>[
  FilteringTextInputFormatter.allow(RegExp(r"[\p{L}\p{M}' .-]", unicode: true)),
  LengthLimitingTextInputFormatter(60),
];

/// Email: só caracteres ASCII visíveis, sem espaços.
final emailFormatters = <TextInputFormatter>[
  FilteringTextInputFormatter.allow(RegExp(r'[\x21-\x7E]')),
  LengthLimitingTextInputFormatter(254),
];

/// Telefone: dígitos e o "+" do indicativo.
final phoneFormatters = <TextInputFormatter>[
  FilteringTextInputFormatter.allow(RegExp(r'[0-9+]')),
  LengthLimitingTextInputFormatter(16),
];

/// NIF: 9 dígitos.
final nifFormatters = <TextInputFormatter>[
  FilteringTextInputFormatter.digitsOnly,
  LengthLimitingTextInputFormatter(9),
];

/// Texto livre sem emoji, com limite de tamanho.
List<TextInputFormatter> cleanTextFormatters(int max) => [
      const NoEmojiFormatter(),
      LengthLimitingTextInputFormatter(max),
    ];

/// Código postal: escreve-se só números e o hífen aparece sozinho depois do
/// quarto dígito ("2890239" → "2890-239").
///
/// Resolve o caso do iOS, onde o teclado numérico não tem tecla de hífen e o
/// utilizador ficava sem forma de escrever um código postal completo.
class PostalCodeFormatter extends TextInputFormatter {
  const PostalCodeFormatter();

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 7) digits = digits.substring(0, 7);

    // A apagar: se o utilizador apagou o hífen, apaga-se também o dígito antes
    // dele — senão o hífen voltava a aparecer e o backspace parecia não fazer
    // nada.
    final deleting = newValue.text.length < oldValue.text.length;
    if (deleting && oldValue.text.endsWith('-') && digits.length == 4) {
      digits = digits.substring(0, 3);
    }

    final text = digits.length > 4 ? '${digits.substring(0, 4)}-${digits.substring(4)}' : digits;
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

final postalCodeFormatters = <TextInputFormatter>[const PostalCodeFormatter()];

/// Aplica o texto limpo tentando manter o cursor no mesmo sítio relativo.
TextEditingValue _keepCursor(TextEditingValue value, String cleaned) {
  if (cleaned == value.text) return value;
  final removed = value.text.length - cleaned.length;
  final offset = (value.selection.end - removed).clamp(0, cleaned.length);
  return TextEditingValue(
    text: cleaned,
    selection: TextSelection.collapsed(offset: offset),
  );
}

// ─── Validadores de formulário ──────────────────────────────────────────────

final _nameRe = RegExp(r"^\p{L}[\p{L}\p{M}' .-]*$", unicode: true);
final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');

String? validatePersonName(String? v, {String field = 'O nome'}) {
  final s = v?.trim() ?? '';
  if (s.isEmpty) return '$field é obrigatório.';
  if (!_nameRe.hasMatch(s)) return '$field só pode ter letras, espaços, hífen e apóstrofo.';
  return null;
}

String? validateEmail(String? v) {
  final s = v?.trim() ?? '';
  if (s.isEmpty) return 'O email é obrigatório.';
  if (!_emailRe.hasMatch(s) || RegExp(r'[^\x21-\x7E]').hasMatch(s)) return 'Email inválido.';
  return null;
}

String? validatePostalCode(String? v, {bool allowZoneOnly = false}) {
  final s = v?.trim() ?? '';
  if (RegExp(r'^\d{4}-\d{3}$').hasMatch(s)) return null;
  if (allowZoneOnly && RegExp(r'^\d{4}$').hasMatch(s)) return null;
  return 'Código postal inválido (0000-000).';
}

/// NIF opcional: vazio passa; preenchido tem de ter dígito de controlo válido.
String? validateNifOptional(String? v) {
  final s = v?.trim() ?? '';
  if (s.isEmpty) return null;
  return isValidNif(s) ? null : 'NIF inválido.';
}

bool isValidNif(String nif) {
  if (!RegExp(r'^[1-9]\d{8}$').hasMatch(nif)) return false;
  final d = nif.split('').map(int.parse).toList();
  var sum = 0;
  for (var i = 0; i < 8; i++) {
    sum += d[i] * (9 - i);
  }
  final check = 11 - (sum % 11);
  return d[8] == (check >= 10 ? 0 : check);
}
