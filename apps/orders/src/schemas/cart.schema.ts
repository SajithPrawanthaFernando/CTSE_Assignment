import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';

@Schema({ _id: false })
export class CartItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ default: 0 })
  subtotal: number;

  @Prop()
  name?: string;

  @Prop()
  image?: string;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ versionKey: false, timestamps: true })
export class CartDocument extends AbstractDocument {
  @Prop({ required: true, unique: true }) // ← one cart per user
  userId: string;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ default: 0 })
  totalAmount: number;
}

export const CartSchema = SchemaFactory.createForClass(CartDocument);