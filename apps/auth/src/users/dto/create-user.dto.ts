import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  roles?: string[];

  @IsOptional()
  @IsString({ each: true })
  @IsPhoneNumber('LK')
  phone?: string;

  @IsOptional()
  @IsString({ each: true })
  address?: string;

  @IsOptional()
  @IsString({ each: true })
  fullname?: string;

  @IsOptional()
  @IsString({ each: true })
  firstname?: string;

  @IsOptional()
  @IsString({ each: true })
  lastname?: string;
}
