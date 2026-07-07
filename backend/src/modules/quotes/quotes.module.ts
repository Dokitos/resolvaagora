import { Module } from '@nestjs/common';
import { QuotesController } from './presentation/quotes.controller';
import { SendQuoteUseCase } from './application/use-cases/send-quote.use-case';
import { RespondQuoteUseCase } from './application/use-cases/respond-quote.use-case';
import { ExpireQuotesUseCase } from './application/use-cases/expire-quotes.use-case';

@Module({
  controllers: [QuotesController],
  providers: [SendQuoteUseCase, RespondQuoteUseCase, ExpireQuotesUseCase],
})
export class QuotesModule {}
