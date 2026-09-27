import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moura_technician/core/utils/input_formatters.dart';

/// Aplica uma lista de formatadores como o TextField faria ao escrever `text`
/// de uma vez sobre um campo vazio.
String type(List<TextInputFormatter> formatters, String text, {String before = ''}) {
  var oldValue = TextEditingValue(text: before, selection: TextSelection.collapsed(offset: before.length));
  var value = TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  for (final f in formatters) {
    value = f.formatEditUpdate(oldValue, value);
  }
  return value.text;
}

void main() {
  group('nomes', () {
    test('mantém acentos, hífen e apóstrofo', () {
      expect(type(nameFormatters, "Ana-María d'Almeida"), "Ana-María d'Almeida");
    });
    test('tira emoji simples e composto', () {
      expect(type(nameFormatters, 'Douglas😀'), 'Douglas');
      expect(type(nameFormatters, 'Silva👨‍🔧'), 'Silva');
    });
    test('tira números e símbolos', () {
      expect(type(nameFormatters, r'João2$'), 'João');
    });
    test('validador recusa o que o formatador deixaria passar colado', () {
      expect(validatePersonName('Douglas😀'), isNotNull);
      expect(validatePersonName('  '), isNotNull);
      expect(validatePersonName('Conceição'), isNull);
    });
  });

  group('email', () {
    test('tira emoji e espaços', () {
      expect(type(emailFormatters, 'ana 😀@gmail.com'), 'ana@gmail.com');
    });
    test('validador', () {
      expect(validateEmail('ana@gmail.com'), isNull);
      expect(validateEmail('joão@gmail.com'), isNotNull);
      expect(validateEmail('ana@gmail'), isNotNull);
    });
  });

  group('código postal', () {
    test('insere o hífen sozinho (teclado numérico do iOS)', () {
      expect(type(postalCodeFormatters, '2890239'), '2890-239');
    });
    test('aceita o hífen se o teclado o tiver', () {
      expect(type(postalCodeFormatters, '2890-239'), '2890-239');
    });
    test('corta dígitos a mais', () {
      expect(type(postalCodeFormatters, '289023999'), '2890-239');
    });
    test('apagar o hífen apaga também o dígito anterior', () {
      expect(type(postalCodeFormatters, '2890', before: '2890-'), '289');
    });
    test('validador', () {
      expect(validatePostalCode('2890-239'), isNull);
      expect(validatePostalCode('2890'), isNotNull);
      expect(validatePostalCode('2890', allowZoneOnly: true), isNull);
    });
  });

  group('texto livre', () {
    test('tira emoji mas mantém pontuação, € e quebras de linha', () {
      expect(
        type(cleanTextFormatters(2000), 'Fuga na torneira 🚿\nCusto até 50€, 100%!'),
        'Fuga na torneira \nCusto até 50€, 100%!',
      );
    });
  });

  group('NIF', () {
    test('só dígitos, máximo 9', () {
      expect(type(nifFormatters, '25556878A9x0'), '255568789');
    });
    test('dígito de controlo', () {
      expect(isValidNif('255568789'), isTrue);
      expect(isValidNif('255568788'), isFalse);
      expect(validateNifOptional(''), isNull);
    });
  });
}
