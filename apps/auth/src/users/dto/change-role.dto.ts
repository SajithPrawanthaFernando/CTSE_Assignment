import { IsString } from 'class-validator';

export class ChangeRoleDto {
  @IsString()
  role: string;
}
