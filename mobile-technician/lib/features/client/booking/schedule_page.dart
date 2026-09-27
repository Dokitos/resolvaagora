import 'package:flutter/material.dart';
import 'package:moura_technician/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

/// Até quantos meses à frente se pode marcar. Igual ao
/// `BOOKING_WINDOW_MONTHS` do backend, que recusa datas fora da janela.
const _windowMonths = 2;

DateTime _day(DateTime d) => DateTime(d.year, d.month, d.day);

class SchedulePage extends ConsumerStatefulWidget {
  const SchedulePage({super.key});

  @override
  ConsumerState<SchedulePage> createState() => _SchedulePageState();
}

class _SchedulePageState extends ConsumerState<SchedulePage> {
  DateTime? _selectedDate;
  String? _selectedSlot;
  late DateTime _focusedDay;

  static DateTime get _firstDay => _day(DateTime.now()).add(const Duration(days: 1));

  static DateTime get _lastDay {
    final t = _day(DateTime.now());
    return DateTime(t.year, t.month + _windowMonths, t.day);
  }

  static bool _isBookable(DateTime d) {
    final day = _day(d);
    return !day.isBefore(_firstDay) && !day.isAfter(_lastDay) && day.weekday != DateTime.sunday;
  }

  static DateTime get _firstBookable {
    var d = _firstDay;
    while (d.weekday == DateTime.sunday) {
      d = d.add(const Duration(days: 1));
    }
    return d;
  }

  static const _slots = [
    '07:00 - 08:00', '08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00',
    '11:00 - 12:00', '13:00 - 14:00', '14:00 - 15:00', '15:00 - 16:00',
    '16:00 - 17:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00',
    '20:00 - 21:00',
  ];

  @override
  void initState() {
    super.initState();
    final prev = ref.read(bookingProvider);
    // Uma data guardada de uma reserva a meio pode já ter passado ou sair da
    // janela — nesse caso recomeça no primeiro dia disponível.
    final prevDate = prev.scheduledDate;
    final keep = prevDate != null && _isBookable(prevDate);
    _selectedDate = keep ? _day(prevDate) : _firstBookable;
    _selectedSlot = keep ? prev.scheduledSlot : null;
    _focusedDay = _selectedDate!;
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    // Só o pt tem dados de formatação carregados no arranque (ver main.dart).
    final locale = Localizations.localeOf(context).languageCode == 'pt' ? 'pt_PT' : 'en';
    final selected = _selectedDate;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: const Color(0xFF161616),
        foregroundColor: Colors.white,
        leading: const SizedBox.shrink(),
        title: const SizedBox.shrink(),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
              children: [
                Text(
                  l.scheduleTitle,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
                ),
                const SizedBox(height: 16),
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade200),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.only(bottom: 8),
                  child: TableCalendar<void>(
                    locale: locale,
                    firstDay: _firstDay,
                    lastDay: _lastDay,
                    focusedDay: _focusedDay,
                    startingDayOfWeek: StartingDayOfWeek.monday,
                    availableCalendarFormats: const {CalendarFormat.month: ''},
                    enabledDayPredicate: _isBookable,
                    // Compara a data inteira: comparar só o dia do mês marcava
                    // o dia 24 de setembro e o de outubro ao mesmo tempo.
                    selectedDayPredicate: (d) => selected != null && isSameDay(selected, d),
                    onDaySelected: (sel, foc) => setState(() {
                      _selectedDate = _day(sel);
                      _focusedDay = foc;
                      _selectedSlot = null;
                    }),
                    onPageChanged: (foc) => _focusedDay = foc,
                    headerStyle: HeaderStyle(
                      formatButtonVisible: false,
                      titleCentered: true,
                      titleTextStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      titleTextFormatter: (date, loc) {
                        final t = DateFormat.yMMMM(loc).format(date);
                        return t[0].toUpperCase() + t.substring(1);
                      },
                    ),
                    calendarStyle: CalendarStyle(
                      outsideDaysVisible: false,
                      selectedDecoration: const BoxDecoration(color: Colors.black, shape: BoxShape.circle),
                      todayDecoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.grey.shade400),
                      ),
                      todayTextStyle: const TextStyle(color: Colors.black54),
                      disabledTextStyle: TextStyle(color: Colors.grey.shade300),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l.scheduleWindowNote,
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
                if (selected != null) ...[
                  const SizedBox(height: 20),
                  Text(
                    _capitalise(DateFormat('EEEE, d MMMM', locale).format(selected)),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),
                  GridView.builder(
                    physics: const NeverScrollableScrollPhysics(),
                    shrinkWrap: true,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 3.5,
                      crossAxisSpacing: 10,
                      mainAxisSpacing: 10,
                    ),
                    itemCount: _slots.length,
                    itemBuilder: (_, i) {
                      final slot = _slots[i];
                      final on = _selectedSlot == slot;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedSlot = slot),
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: on ? Colors.black87 : Colors.grey.shade300,
                              width: on ? 2 : 1,
                            ),
                            borderRadius: BorderRadius.circular(8),
                            color: on ? Colors.black : Colors.white,
                          ),
                          child: Center(
                            child: Text(
                              slot,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: on ? FontWeight.bold : FontWeight.normal,
                                color: on ? Colors.white : Colors.black87,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF8E1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.access_time, size: 16, color: Colors.orange),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(l.guaranteeDateTime,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            const SizedBox(height: 2),
                            Text(
                              l.paymentAfter2h,
                              style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          BookingFooterBar(
            onBack: () => context.pop(),
            onNext: () {
              if (_selectedDate != null && _selectedSlot != null) {
                ref.read(bookingProvider.notifier).setSchedule(_selectedDate!, _selectedSlot!);
                context.push('/booking/contact');
              }
            },
            nextEnabled: _selectedDate != null && _selectedSlot != null,
          ),
        ],
      ),
    );
  }

  String _capitalise(String s) => s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}
