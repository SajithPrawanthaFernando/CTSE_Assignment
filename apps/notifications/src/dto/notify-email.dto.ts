import { IsEmail, IsString } from 'class-validator';

export class NotifyEmailDto {
  email: string;
  subject?: string;
  text?: string;
  orderData?: any;
}
