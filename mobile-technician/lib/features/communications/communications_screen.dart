import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/services/communications_service.dart';
import '../messages/conversations_list.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';

/// Os dois lados da aba: o que a plataforma comunica ao técnico, e o que ele
/// troca com os clientes.
enum _Segment { notices, messages }

/// Aba "Comunicação". Junta num só sítio os avisos, emails e pagamentos
/// (separador "Avisos") e as conversas com clientes (separador "Mensagens") —
/// preferido a duas abas separadas para a barra inferior não passar de quatro.
class CommunicationsScreen extends ConsumerStatefulWidget {
  const CommunicationsScreen({super.key});

  @override
  ConsumerState<CommunicationsScreen> createState() => _CommunicationsScreenState();
}

class _CommunicationsScreenState extends ConsumerState<CommunicationsScreen> {
  final _scroll = ScrollController();
  _Segment _segment = _Segment.notices;

  /// Páginas seguintes, acumuladas à medida que se desce. A primeira vem do
  /// provider, para aproveitar o refresh e o tratamento de erro dele.
  final _extra = <Communication>[];
  String? _cursor;
  bool _loadingMore = false;
  bool _exhausted = false;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_loadingMore || _exhausted) return;
    if (_scroll.position.pixels < _scroll.position.maxScrollExtent - 300) return;
    _loadMore();
  }

  Future<void> _loadMore() async {
    final cursor = _cursor;
    if (cursor == null) return;

    setState(() => _loadingMore = true);
    try {
      final page = await ref.read(communicationsServiceProvider).fetch(before: cursor);
      if (!mounted) return;
      setState(() {
        _extra.addAll(page.items);
        _cursor = page.nextCursor;
        _exhausted = page.nextCursor == null;
      });
    } catch (_) {
      // Sem rede: mantém o que já está e volta a tentar na próxima rolagem.
      if (mounted) setState(() => _exhausted = false);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final firstPage = ref.watch(communicationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Comunicação')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SegmentedButton<_Segment>(
              segments: const [
                ButtonSegment(
                  value: _Segment.notices,
                  icon: Icon(Icons.campaign_outlined, size: 18),
                  label: Text('Avisos'),
                ),
                ButtonSegment(
                  value: _Segment.messages,
                  icon: Icon(Icons.chat_bubble_outline, size: 18),
                  label: Text('Mensagens'),
                ),
              ],
              selected: {_segment},
              onSelectionChanged: (sel) => setState(() => _segment = sel.first),
            ),
          ),
          Expanded(
            child: _segment == _Segment.messages
                ? const ConversationsList(isTechnician: true)
                : _buildNotices(firstPage),
          ),
        ],
      ),
    );
  }

  Widget _buildNotices(AsyncValue<CommunicationsPage> firstPage) {
    return firstPage.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(e.toString(), textAlign: TextAlign.center),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(communicationsProvider),
                child: const Text('Tentar de novo'),
              ),
            ],
          ),
        ),
        data: (page) {
          // O cursor inicial vem daqui; guardá-lo no build evita um estado
          // duplicado que teria de ser sincronizado à mão.
          _cursor ??= page.nextCursor;

          final items = [...page.items, ..._extra];
          if (items.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.forum_outlined, size: 56, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  const Text(
                    'Sem comunicações',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Avisos, emails e pagamentos aparecem aqui.',
                    style: TextStyle(color: Colors.grey[500], fontSize: 14),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _extra.clear();
                _cursor = null;
                _exhausted = false;
              });
              ref.invalidate(communicationsProvider);
            },
            child: ListView.separated(
              controller: _scroll,
              padding: const EdgeInsets.all(16),
              itemCount: items.length + (_loadingMore ? 1 : 0),
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, i) {
                if (i >= items.length) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                return _CommunicationCard(item: items[i]);
              },
            ),
          );
        },
    );
  }
}

class _CommunicationCard extends StatelessWidget {
  final Communication item;
  const _CommunicationCard({required this.item});

  ({IconData icon, Color color, String label}) get _style {
    switch (item.kind) {
      case CommunicationKind.email:
        return (icon: Icons.mail_outline, color: const Color(0xFF7C3AED), label: 'Email');
      case CommunicationKind.payment:
        return (icon: Icons.euro, color: AppTheme.success, label: 'Pagamento');
      case CommunicationKind.notice:
        return (icon: Icons.campaign_outlined, color: AppTheme.primary, label: 'Aviso');
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = _style;
    final hasLink = item.serviceRequestId != null;

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: hasLink ? () => context.push('/jobs/${item.serviceRequestId}') : null,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: s.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(s.icon, size: 20, color: s.color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.title,
                            style: TextStyle(
                              fontWeight: item.read ? FontWeight.w500 : FontWeight.w700,
                              fontSize: 15,
                            ),
                          ),
                        ),
                        if (item.amount != null)
                          Text(
                            formatCurrency(item.amount!),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: AppTheme.success,
                            ),
                          ),
                      ],
                    ),
                    if (item.body != null && item.body!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        item.body!,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: Colors.grey[600], fontSize: 13),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: s.color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            s.label,
                            style: TextStyle(color: s.color, fontSize: 11, fontWeight: FontWeight.w500),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${formatDateShort(item.createdAt)} • ${formatTime(item.createdAt)}',
                          style: TextStyle(color: Colors.grey[500], fontSize: 12),
                        ),
                        if (hasLink) ...[
                          const Spacer(),
                          const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
