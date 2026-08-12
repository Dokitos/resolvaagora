import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

enum PasswordStrengthLevel { empty, weak, medium, strong }

class PasswordStrengthResult {
  final int score;
  final int maxScore;
  final PasswordStrengthLevel level;
  final String label;
  final List<String> missing;

  const PasswordStrengthResult({
    required this.score,
    required this.maxScore,
    required this.level,
    required this.label,
    required this.missing,
  });
}

/// Pontuação simples de força de password — mesma lógica (comprimento e
/// classes de caracteres) usada no site em
/// `frontend-web/src/components/ui/password-strength.tsx`, para manter a UX
/// consistente entre app e site.
///
/// Critérios (0-5 pontos):
///   - comprimento >= 8
///   - comprimento >= 12 (bónus)
///   - contém maiúscula
///   - contém número
///   - contém símbolo/carácter especial
///
/// 0-1 → Fraca · 2-3 → Média · 4-5 → Forte
PasswordStrengthResult scorePasswordStrength(String password) {
  const maxScore = 5;
  if (password.isEmpty) {
    return const PasswordStrengthResult(
      score: 0,
      maxScore: maxScore,
      level: PasswordStrengthLevel.empty,
      label: '',
      missing: [],
    );
  }

  final length8 = password.length >= 8;
  final length12 = password.length >= 12;
  final uppercase = RegExp(r'[A-Z]').hasMatch(password);
  final number = RegExp(r'[0-9]').hasMatch(password);
  final symbol = RegExp(r'[^A-Za-z0-9]').hasMatch(password);

  final score = [length8, length12, uppercase, number, symbol].where((c) => c).length;

  final missing = <String>[
    if (!length8) 'pelo menos 8 caracteres',
    if (!uppercase) 'uma letra maiúscula',
    if (!number) 'um número',
    if (!symbol) 'um símbolo (ex.: !@#\$)',
  ];

  final level = score <= 1
      ? PasswordStrengthLevel.weak
      : score <= 3
          ? PasswordStrengthLevel.medium
          : PasswordStrengthLevel.strong;
  final label = level == PasswordStrengthLevel.weak
      ? 'Fraca'
      : level == PasswordStrengthLevel.medium
          ? 'Média'
          : 'Forte';

  return PasswordStrengthResult(
    score: score,
    maxScore: maxScore,
    level: level,
    label: label,
    missing: missing,
  );
}

/// Barra de força de password (3 segmentos coloridos) + rótulo + dica do que
/// falta, atualizada a cada tecla. Fica escondida quando o campo está vazio.
class PasswordStrengthMeter extends StatelessWidget {
  final String password;
  const PasswordStrengthMeter({super.key, required this.password});

  Color _colorFor(PasswordStrengthLevel level) {
    switch (level) {
      case PasswordStrengthLevel.weak:
        return AppTheme.danger;
      case PasswordStrengthLevel.medium:
        return AppTheme.warning;
      case PasswordStrengthLevel.strong:
        return AppTheme.success;
      case PasswordStrengthLevel.empty:
        return AppTheme.border;
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = scorePasswordStrength(password);
    if (result.level == PasswordStrengthLevel.empty) return const SizedBox.shrink();

    final filledSegments = result.level == PasswordStrengthLevel.weak
        ? 1
        : result.level == PasswordStrengthLevel.medium
            ? 2
            : 3;
    final color = _colorFor(result.level);

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                  children: List.generate(3, (i) {
                    return Expanded(
                      child: Container(
                        margin: EdgeInsets.only(right: i < 2 ? 4 : 0),
                        height: 5,
                        decoration: BoxDecoration(
                          color: i < filledSegments ? color : AppTheme.border,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                result.label,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: color),
              ),
            ],
          ),
          if (result.missing.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Falta: ${result.missing.join(', ')}',
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
            ),
          ],
        ],
      ),
    );
  }
}
