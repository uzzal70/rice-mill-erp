import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceName?: string;
}
export class RefreshDto { @IsString() @MinLength(32) refreshToken!: string; }
export class EmailDto { @IsEmail() email!: string; }
export class PasswordResetDto {
  @IsString() @Length(32, 128) token!: string;
  @IsString() @MinLength(12) password!: string;
}
export class EmailVerificationDto { @IsString() @Length(32, 128) token!: string; }
export class OtpVerifyDto {
  @IsEmail() email!: string;
  @IsString() @Matches(/^\d{6}$/) code!: string;
  @IsOptional() @IsString() @MaxLength(120) deviceName?: string;
}
