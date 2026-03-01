import { Injectable, Logger } from '@nestjs/common';
import { AbstractRepository, UserDocument } from '@app/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class UsersRepository extends AbstractRepository<UserDocument> {
  protected readonly logger = new Logger(UsersRepository.name);

  constructor(@InjectModel(UserDocument.name) userModel: Model<UserDocument>) {
    super(userModel);
  }

  async getAllUsers(): Promise<UserDocument[]> {
    return this.find({});
  }

  async deleteUserById(userId: string): Promise<UserDocument> {
    const user = await this.findOneAndDelete({ _id: userId });
    return user;
  }

  async changeUserRole(userId: string, newRole: string): Promise<UserDocument> {
    return this.findOneAndUpdate(
      { _id: userId },
      { $set: { roles: [newRole] } },
    );
  }

  async updateUserDetails(
    userId: string,
    updateFields: Partial<UserDocument>,
  ): Promise<UserDocument> {
    return this.findOneAndUpdate({ _id: userId }, updateFields);
  }
}
