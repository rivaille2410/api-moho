import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

import { Resend } from 'resend';

import { mailLayout } from './templates/mail-layout';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.from = this.configService.get<string>('MAIL_FROM')!;
  }

  async sendResetPasswordEmail(to: string, resetUrl: string) {
    const html = mailLayout({
      previewText:
        'Nhấn vào liên kết bên dưới để đặt lại mật khẩu tài khoản MOHO của bạn.',
      heading: 'Đặt lại mật khẩu',
      bodyHtml: `
        <p style="margin:0 0 12px 0;">Xin chào,</p>
        <p style="margin:0;">
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
          Nhấn nút bên dưới để tạo mật khẩu mới. Liên kết này có hiệu lực trong
          <strong>15 phút</strong>.
        </p>
      `,
      ctaLabel: 'Đặt lại mật khẩu',
      ctaUrl: resetUrl,
      footerNote:
        'Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn và không có gì thay đổi.',
    });

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: '[MOHO] Yêu cầu đặt lại mật khẩu',
      html,
    });

    if (error) {
      this.logger.error(`Failed to send reset password email to ${to}`, error);
      throw new Error('Failed to send email');
    }
  }

  async sendVerificationEmail(to: string, verifyUrl: string) {
    const html = mailLayout({
      previewText:
        'Nhấn vào liên kết bên dưới để xác thực email và kích hoạt tài khoản MOHO.',
      heading: 'Xác thực email của bạn',
      bodyHtml: `
        <p style="margin:0 0 12px 0;">Xin chào,</p>
        <p style="margin:0;">
          Cảm ơn bạn đã đăng ký tài khoản MOHO. Nhấn nút bên dưới để xác thực
          địa chỉ email và kích hoạt tài khoản. Liên kết này có hiệu lực trong
          <strong>24 giờ</strong>.
        </p>
      `,
      ctaLabel: 'Xác thực tài khoản',
      ctaUrl: verifyUrl,
      footerNote:
        'Nếu bạn không tạo tài khoản này, bạn có thể bỏ qua email này một cách an toàn.',
    });

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: '[MOHO] Xác thực địa chỉ email của bạn',
      html,
    });

    if (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      throw new Error('Failed to send email');
    }
  }
}
