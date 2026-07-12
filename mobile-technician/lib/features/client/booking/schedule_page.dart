import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

class SchedulePage extends ConsumerStatefulWidget {
  const SchedulePage({super.key});

  @override
  ConsumerState<SchedulePage> createState() => _SchedulePageState();
}

class _SchedulePageState extends ConsumerState<SchedulePage> {
  DateTime? _selectedDate;
  String? _selectedSlot;

  static List<DateTime> get _availableDays {
    final days = <DateTime>[];
    var d = DateTime.now().add(const Duration(days: 1));
    while (days.length < 4) {
      if (d.weekday != DateTime.sunday) days.add(d);
      d = d.add(const Duration(days: 1));
    }
    return days;
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
    _selectedDate = prev.scheduledDate;
    _selectedSlot = prev.scheduledSlot;
    _selectedDate ??= _availableDays.first;
  }

  String _dayLabel(DateTime d, AppLocalizations l) {
    final diff = d.difference(DateTime.now()).inDays;
    if (diff == 1) return l.tomorrow;
    final fmt = DateFormat('EEE', 'pt_PT');
    return fmt.format(d).replaceFirst(fmt.format(d)[0], fmt.format(d)[0].toUpperCase());
  }

  @override
  Widget build(BuildContext context) {
    final days = _availableDays;
    final l = AppLocalizations.of(context);

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
                const SizedBox(height: 24),
                // Day picker
                Row(
                  children: days.map((d) {
                    final selected = _selectedDate?.day == d.day;
                    return Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() { _selectedDate = d; _selectedSlot = null; }),
                        child: Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: selected ? Colors.black : Colors.grey.shade300, width: selected ? 2 : 1),
                            borderRadius: BorderRadius.circular(8),
                            color: selected ? Colors.white : Colors.grey[50],
                          ),
                          child: Column(
                            children: [
                              Text(_dayLabel(d, l), style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                              const SizedBox(height: 2),
                              Text('${d.day}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: selected ? Colors.black : Colors.grey[600])),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 24),
                // Time slots grid
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
                    final selected = _selectedSlot == slot;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedSlot = slot),
                      child: Container(
                        decoration: BoxDecoration(
                          border: Border.all(
                            color: selected ? Colors.black87 : Colors.grey.shade300,
                            width: selected ? 2 : 1,
                          ),
                          borderRadius: BorderRadius.circular(8),
                          color: selected ? Colors.black : Colors.white,
                        ),
                        child: Center(
                          child: Text(
                            slot,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: selected ? FontWeight.bold : FontWeight.normal,
                              color: selected ? Colors.white : Colors.black87,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
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
                            Text(l.guaranteeDateTime, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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
}
