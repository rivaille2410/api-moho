import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

import {
  VerifyEmailJobData,
  ResetPasswordJobData,
  OrderConfirmationJobData,
  OrderStatusUpdateJobData,
} from './interfaces/mail-job.interface';
import { mailLayout } from './templates/mail-layout';

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    this.from = this.configService.get<string>('MAIL_FROM')!;
  }

  async sendResetPassword({ to, resetUrl }: ResetPasswordJobData) {
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
      throw new Error(`Resend error: ${error.message}`);
    }
  }

  async sendVerification({ to, verifyUrl }: VerifyEmailJobData) {
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
      throw new Error(`Resend error: ${error.message}`);
    }
  }

  async sendOrderConfirmation({
    to,
    orderNumber,
    total,
    orderUrl,
  }: OrderConfirmationJobData) {
    const html = mailLayout({
      previewText: `Đơn hàng ${orderNumber} của bạn đã được ghi nhận.`,
      heading: 'Xác nhận đơn hàng',
      bodyHtml: `
      <p style="margin:0 0 12px 0;">Cảm ơn bạn đã đặt hàng tại MOHO!</p>
      <p style="margin:0;">
        Đơn <strong>${orderNumber}</strong> với tổng giá trị
        <strong>${total.toLocaleString('vi-VN')}đ</strong> đã được ghi nhận
        và đang chờ xác nhận.
      </p>
    `,
      ctaLabel: 'Xem chi tiết đơn hàng',
      ctaUrl: orderUrl,
      footerNote: 'Chúng tôi sẽ liên hệ nếu cần xác nhận thêm thông tin.',
    });

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: `[MOHO] Xác nhận đơn hàng ${orderNumber}`,
      html,
    });
    if (error) {
      this.logger.error(`Failed to send order confirmation to ${to}`, error);
      throw new Error(`Resend error: ${error.message}`);
    }
  }

  async sendOrderStatusUpdate({
    to,
    orderNumber,
    status,
    orderUrl,
  }: OrderStatusUpdateJobData) {
    const html = mailLayout({
      previewText: `Đơn hàng ${orderNumber} vừa được cập nhật trạng thái.`,
      heading: 'Cập nhật đơn hàng',
      bodyHtml: `
      <p style="margin:0;">
        Đơn <strong>${orderNumber}</strong> hiện đang ở trạng thái:
        <strong>${status}</strong>.
      </p>
    `,
      ctaLabel: 'Xem chi tiết đơn hàng',
      ctaUrl: orderUrl,
      footerNote: 'Cảm ơn bạn đã mua hàng tại MOHO.',
    });

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: `[MOHO] Đơn hàng ${orderNumber}: ${status}`,
      html,
    });
    if (error) {
      this.logger.error(`Failed to send status update to ${to}`, error);
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
