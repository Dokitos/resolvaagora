import { ValidateBy, buildMessage, type ValidationOptions } from 'class-validator';

/** Até quantos meses à frente um cliente pode marcar um serviço. */
export const BOOKING_WINDOW_MONTHS = 2;

/** Dia da semana em Portugal — o servidor corre em UTC. */
function weekdayInLisbon(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Lisbon', weekday: 'short' }).format(d);
}

/**
 * Data de um serviço marcada pelo cliente: no futuro, fora de domingo e no
 * máximo a {@link BOOKING_WINDOW_MONTHS} meses.
 *
 * A app e o site já só oferecem essas datas; isto é o que garante a regra a
 * quem chame a API diretamente, e a quem use uma versão antiga da app.
 */
export function IsBookableDate(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isBookableDate',
      validator: {
        validate: (value) => {
          if (typeof value !== 'string') return false;
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return false;
          const now = new Date();
          if (d.getTime() <= now.getTime()) return false;

          const limit = new Date(now);
          limit.setMonth(limit.getMonth() + BOOKING_WINDOW_MONTHS);
          // Um dia de folga: "dois meses" conta-se em dias de calendário no
          // fuso de Lisboa, e um horário ao fim do último dia pode passar
          // ligeiramente em UTC.
          limit.setDate(limit.getDate() + 1);
          if (d.getTime() > limit.getTime()) return false;

          return weekdayInLisbon(d) !== 'Sun';
        },
        defaultMessage: buildMessage(
          () =>
            `A data do serviço tem de ser futura, fora de domingo e no máximo a ${BOOKING_WINDOW_MONTHS} meses.`,
          options,
        ),
      },
    },
    options,
  );
}
