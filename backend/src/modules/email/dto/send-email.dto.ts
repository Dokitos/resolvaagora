import { IsEmail, IsString, MaxLength } from 'class-validator';

/** Corpo do POST admin/emails/send — envio manual de email pelo admin. */
export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @MaxLength(50000)
  html: string;
}
