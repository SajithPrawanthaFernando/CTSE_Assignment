import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { NotifyEmailDto } from './dto/notify-email.dto';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: this.configService.get('SMTP_USER'),
      clientId: this.configService.get('GOOGLE_OAUTH_CLIENT_ID'),
      clientSecret: this.configService.get('GOOGLE_OAUTH_CLIENT_SECRET'),
      refreshToken: this.configService.get('GOOGLE_OAUTH_REFRESH_TOKEN'),
    },
  });

  async notifyEmail({ email, subject, text, orderData }: NotifyEmailDto) {
    let htmlContent = '';

    if (orderData) {
      htmlContent = this.generateOrderEmail(orderData);
    }

    try {
      await this.transporter.sendMail({
        from: `GustoBistro <${this.configService.get('SMTP_USER')}>`,
        to: email,
        subject: subject || 'GustoBistro Notification',
        text: text,
        html: htmlContent,
      });
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Failed to send email:', error.message);
    }
  }

  private generateOrderEmail(data: any) {
    const itemsHtml = data.items
      .map(
        (item) => `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 16px 0;">
          <p style="margin: 0; font-weight: 700; color: #111827; font-size: 15px;">Product ID: ${item.productId}</p>
          <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Quantity: ${item.quantity}</p>
        </td>
        <td style="padding: 16px 0; text-align: right; vertical-align: top;">
          <p style="margin: 0; font-weight: 700; color: #111827; font-size: 15px;">$${item.subtotal.toFixed(2)}</p>
        </td>
      </tr>
    `,
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 30px 15px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 40px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
          
          <tr>
            <td style="background-color: #111827; padding: 50px 40px; text-align: center;">
              <div style="background: rgba(249, 115, 22, 0.2); display: inline-block; padding: 8px 16px; border-radius: 100px; margin-bottom: 20px;">
                <span style="color: #f97316; font-weight: 800; letter-spacing: 2px; font-size: 11px;">ORDER CONFIRMED</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 900;">Taste the <span style="color: #f97316;">Extraordinary.</span></h1>
              <p style="color: #9ca3af; margin-top: 12px; font-size: 15px;">Hi ${data.customerName}, your order is being prepared!</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <h3 style="margin: 0 0 20px; font-size: 18px; font-weight: 800; color: #111827; border-bottom: 2px solid #f97316; display: inline-block;">Your Order Summary</h3>
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                ${itemsHtml}
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                <tr>
                  <td><p style="color: #6b7280; font-size: 16px; font-weight: 600;">Grand Total</p></td>
                  <td style="text-align: right;"><p style="color: #f97316; font-size: 26px; font-weight: 900; margin: 0;">$${data.totalAmount.toFixed(2)}</p></td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 40px;">
              <div style="background-color: #f8fafc; border-radius: 24px; padding: 24px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Shipping to:</p>
                <p style="margin: 8px 0 0; color: #111827; font-weight: 700; font-size: 15px;">${data.fullname}</p>
                <p style="margin: 4px 0 0; color: #475569; font-size: 14px; line-height: 1.5;">${data.address}</p>
                <p style="margin: 8px 0 0; color: #f97316; font-size: 14px; font-weight: 600;">📞 ${data.phone}</p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f1f5f9; padding: 25px; text-align: center;">
              <p style="margin: 0; color: #111827; font-weight: 900; font-size: 16px;">GustoBistro.</p>
              <p style="margin: 5px 0 0; color: #94a3b8; font-size: 11px;">30 Min Delivery Guarantee in Colombo</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  async createInAppNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
  }) {
    return this.notificationModel.create(data);
  }

  async getUserNotifications(userId: string) {

    console.log("user id", userId);
    
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true } },
    );
  }

  async deleteNotification(id: string) {
    return this.notificationModel.findByIdAndDelete(id);
  }
}
