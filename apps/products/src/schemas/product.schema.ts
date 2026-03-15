import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';

@Schema({ versionKey: false, timestamps: true, collection: 'products' })
export class ProductDocument extends AbstractDocument {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: 0 })
  stock: number;

  @Prop()
  category: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  imageUrl: string;
}

export const ProductSchema = SchemaFactory.createForClass(ProductDocument);
