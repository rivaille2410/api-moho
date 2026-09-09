import { Module } from '@nestjs/common';

import { MailService } from './mail.service';
import { ResendService } from './resend.service';

@Module({
  providers: [MailService, ResendService],
  exports: [MailService],
})
export class MailModule {}
