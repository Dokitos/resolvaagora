import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';
import 'package:moura_technician/l10n/generated/app_localizations.dart';

import '../../../core/services/geo_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/input_formatters.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

enum _Status { idle, loading, found, notFound, offline }

/// Primeiro passo da morada na reserva: o código postal, com a rua e o mapa.
///
/// Antes a localidade vinha de uma tabela escrita à mão com ~50 prefixos. Para
/// qualquer código fora dela, a pesquisa recuava para prefixos mais curtos e
/// devolvia a primeira cidade que encontrasse — Viseu aparecia como Coimbra,
/// Leiria como Santarém, sempre com "localização confirmada". Esse valor ia
/// para a morada do pedido, e como a distribuição de técnicos compara o
/// distrito, esses pedidos iam para a zona errada ou para ninguém.
class LocationPage extends ConsumerStatefulWidget {
  const LocationPage({super.key});

  @override
  ConsumerState<LocationPage> createState() => _LocationPageState();
}

class _LocationPageState extends ConsumerState<LocationPage> {
  final _postalCtrl = TextEditingController();
  Timer? _debounce;

  /// Cada pesquisa leva um número; só a resposta da mais recente conta. Sem
  /// isto, quem escreve depressa podia ver chegar primeiro a resposta de um
  /// código que já apagou.
  int _seq = 0;

  _Status _status = _Status.idle;
  PostalCodeInfo? _info;

  static final _zoneOnly = RegExp(r'^\d{4}$');
  static final _full = RegExp(r'^\d{4}-\d{3}$');

  bool get _canContinue =>
      _status == _Status.found || (_status == _Status.offline && _looksValid(_postalCtrl.text));

  bool _looksValid(String v) => _zoneOnly.hasMatch(v) || _full.hasMatch(v);

  @override
  void initState() {
    super.initState();
    final prev = ref.read(bookingProvider).postalCode;
    if (prev.isNotEmpty) {
      _postalCtrl.text = prev;
      _lookup(prev);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _postalCtrl.dispose();
    super.dispose();
  }

  void _onChanged(String v) {
    _debounce?.cancel();
    if (!_looksValid(v)) {
      _seq++; // invalida qualquer pesquisa ainda em curso
      setState(() {
        _status = _Status.idle;
        _info = null;
      });
      return;
    }
    // Espera que a escrita pare: "2890" seguido logo de "-239" não deve
    // gerar duas pesquisas.
    _debounce = Timer(const Duration(milliseconds: 400), () => _lookup(v));
  }

  Future<void> _lookup(String code) async {
    final seq = ++_seq;
    setState(() => _status = _Status.loading);

    try {
      final info = await ref.read(geoServiceProvider).lookup(code);
      if (!mounted || seq != _seq) return;

      final notifier = ref.read(bookingProvider.notifier);
      notifier.setLocation(code, info.description);
      // Uma única rua no código: é quase certamente a do cliente, e poupa-lhe
      // escrevê-la no passo seguinte.
      if (info.isStreet && info.streets.length == 1) {
        notifier.suggestStreet(info.streets.first);
      }
      setState(() {
        _info = info;
        _status = _Status.found;
      });
    } on PostalCodeNotFound {
      if (!mounted || seq != _seq) return;
      setState(() {
        _info = null;
        _status = _Status.notFound;
      });
    } catch (_) {
      if (!mounted || seq != _seq) return;
      // Falha de rede ou do servidor: não trava a reserva. Grava só o código,
      // sem inventar localidade — o backend corrige o distrito ao criar a
      // morada a partir do código postal.
      ref.read(bookingProvider.notifier).setLocation(code, '');
      setState(() {
        _info = null;
        _status = _Status.offline;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final ok = _status == _Status.found;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: const Color(0xFF161616),
        foregroundColor: Colors.white,
        leading: const SizedBox.shrink(),
        title: const SizedBox.shrink(),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                  child: Text(
                    l.locationTitle,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: TextField(
                    controller: _postalCtrl,
                    // Teclado numérico mantido: o hífen entra sozinho pelo
                    // formatador, porque o teclado numérico do iOS não o tem.
                    keyboardType: TextInputType.number,
                    inputFormatters: postalCodeFormatters,
                    onChanged: _onChanged,
                    style: const TextStyle(fontSize: 18, letterSpacing: 1),
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.markunread_mailbox_outlined),
                      hintText: '0000-000',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: ok ? Colors.green : Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: ok ? Colors.green : Colors.black, width: 2),
                      ),
                      suffixIcon: switch (_status) {
                        _Status.loading => const Padding(
                            padding: EdgeInsets.all(14),
                            child: SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                        _Status.found => const Icon(Icons.check_circle, color: Colors.green),
                        _Status.notFound => const Icon(Icons.error_outline, color: AppTheme.danger),
                        _ => null,
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    _status == _Status.notFound ? l.postalNotFound : l.postalFormat,
                    style: TextStyle(
                      color: _status == _Status.notFound ? AppTheme.danger : Colors.grey[500],
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                _buildPreview(l),
              ],
            ),
          ),
          BookingFooterBar(
            onBack: () => context.pop(),
            onNext: () => context.push('/booking/schedule'),
            nextEnabled: _canContinue,
          ),
        ],
      ),
    );
  }

  Widget _buildPreview(AppLocalizations l) {
    final info = _info;
    if (_status == _Status.found && info != null) return _MapCard(info: info, l: l);

    final (icon, title, subtitle) = switch (_status) {
      _Status.loading => (Icons.location_searching, l.postalSearching, ''),
      _Status.offline => (Icons.cloud_off_outlined, _postalCtrl.text, l.locationUnverified),
      _ => (Icons.location_searching, l.enterPostalCode, l.findProfessionalNear),
    };

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F6FB),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(icon, size: 32, color: Colors.grey[600]),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.grey[700]),
          ),
          if (subtitle.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey[500]),
            ),
          ],
        ],
      ),
    );
  }
}

/// Mapa com o marcador na rua (ou no centro da zona) e o que se identificou.
class _MapCard extends StatelessWidget {
  final PostalCodeInfo info;
  final AppLocalizations l;
  const _MapCard({required this.info, required this.l});

  @override
  Widget build(BuildContext context) {
    final point = LatLng(info.lat, info.lng);
    // Rua: perto o suficiente para ver a própria rua. Zona ou aproximado:
    // afastado, para não sugerir uma precisão que não há.
    final zoom = info.isStreet ? 17.0 : 13.0;
    final place = [info.locality, info.municipality]
        .whereType<String>()
        .toSet()
        .join(', ');

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.green.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 190,
            child: FlutterMap(
              // A chave muda com o ponto: as opções iniciais do mapa só se
              // aplicam na primeira construção, e sem isto um código novo
              // deixava o mapa no sítio do anterior.
              key: ValueKey('${info.lat},${info.lng},$zoom'),
              options: MapOptions(
                initialCenter: point,
                initialZoom: zoom,
                // Pré-visualização estática: dentro de uma lista com scroll,
                // um mapa arrastável roubava o gesto de deslizar a página.
                interactionOptions: const InteractionOptions(flags: InteractiveFlag.none),
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  // Obrigatório pela política de uso dos mapas do OpenStreetMap.
                  userAgentPackageName: 'pt.resolvaagora.app',
                ),
                MarkerLayer(
                  markers: [
                    Marker(
                      point: point,
                      width: 44,
                      height: 44,
                      alignment: Alignment.topCenter,
                      child: const Icon(Icons.location_pin, size: 44, color: AppTheme.brandRed),
                    ),
                  ],
                ),
                const SimpleAttributionWidget(source: Text('OpenStreetMap')),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (info.streets.isNotEmpty)
                  Text(
                    info.streets.join(' · '),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                if (place.isNotEmpty)
                  Padding(
                    padding: EdgeInsets.only(top: info.streets.isNotEmpty ? 2 : 0),
                    child: Text(
                      info.district != null && info.district != info.municipality
                          ? '$place · ${info.district}'
                          : place,
                      style: TextStyle(
                        fontSize: info.streets.isEmpty ? 16 : 14,
                        fontWeight: info.streets.isEmpty ? FontWeight.bold : FontWeight.normal,
                        color: info.streets.isEmpty ? Colors.black87 : Colors.grey[700],
                      ),
                    ),
                  ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      info.isApproximate ? Icons.info_outline : Icons.check_circle,
                      size: 15,
                      color: info.isApproximate ? Colors.orange[700] : Colors.green[700],
                    ),
                    const SizedBox(width: 5),
                    Text(
                      info.isApproximate ? l.locationApproximate : l.locationConfirmed,
                      style: TextStyle(
                        fontSize: 13,
                        color: info.isApproximate ? Colors.orange[800] : Colors.green[700],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
