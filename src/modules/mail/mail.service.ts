import { Injectable, Logger } from '@nestjs/common';

import {
  OrderConfirmationJobData,
  OrderStatusUpdateJobData,
} from './interfaces/mail-job.interface';
import { ResendService } from './resend.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly resendService: ResendService) {}

  async sendResetPasswordEmail(to: string, resetUrl: string) {
    await this.safeSend(() =>
      this.resendService.sendResetPassword({ to, resetUrl }),
    );
  }

  async sendVerificationEmail(to: string, verifyUrl: string) {
    await this.safeSend(() =>
      this.resendService.sendVerification({ to, verifyUrl }),
    );
  }

  async sendOrderConfirmationEmail(data: OrderConfirmationJobData) {
    await this.safeSend(() => this.resendService.sendOrderConfirmation(data));
  }

  async sendOrderStatusUpdateEmail(data: OrderStatusUpdateJobData) {
    await this.safeSend(() => this.resendService.sendOrderStatusUpdate(data));
  }

  private async safeSend(fn: () => Promise<void>) {
    try {
      await fn();
    } catch (err) {
      this.logger.error('Failed to send mail', err);
    }
  }
}
