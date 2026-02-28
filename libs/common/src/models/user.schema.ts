import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';

@Schema({ versionKey: false })
export class UserDocument extends AbstractDocument {
  @Prop()
  email: string;

  @Prop()
  password: string;

  @Prop()
  roles?: string[];

  @Prop()
  phone?: string;

  @Prop()
  address?: string;

  @Prop()
  fullname?: string;

  @Prop()
  firstname?: string;

  @Prop()
  lastname?: string;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
