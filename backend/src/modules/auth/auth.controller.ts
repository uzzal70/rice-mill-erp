import { Body, Controller, Delete, Get, Headers, Ip, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { EmailDto, EmailVerificationDto, LoginDto, OtpVerifyDto, PasswordResetDto, RefreshDto } from './login.dto';
import { AuthenticatedRequest, Public } from '../../common/authz';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Public() @Post('login') login(@Body() dto: LoginDto, @Ip() ip: string, @Headers('user-agent') ua?: string) { return this.auth.login(dto.email, dto.password, dto.deviceName, ip, ua); }
  @Public() @Post('refresh') refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }
  @Public() @Post('logout') logout(@Body() dto: RefreshDto) { return this.auth.logout(dto.refreshToken); }
  @Public() @Post('password-reset/request') requestPasswordReset(@Body() dto: EmailDto) { return this.auth.requestPasswordReset(dto.email); }
  @Public() @Post('password-reset/complete') completePasswordReset(@Body() dto: PasswordResetDto) { return this.auth.completePasswordReset(dto.token, dto.password); }
  @Post('email-verification/request') requestEmailVerification(@Req() req: AuthenticatedRequest) { return this.auth.requestEmailVerification(req.user!.id); }
  @Public() @Post('email-verification/complete') completeEmailVerification(@Body() dto: EmailVerificationDto) { return this.auth.completeEmailVerification(dto.token); }
  @Public() @Post('otp/request') requestOtp(@Body() dto: EmailDto) { return this.auth.requestOtp(dto.email); }
  @Public() @Post('otp/verify') verifyOtp(@Body() dto: OtpVerifyDto, @Ip() ip: string, @Headers('user-agent') ua?: string) {
    return this.auth.verifyOtp(dto.email, dto.code, dto.deviceName, ip, ua);
  }
  @Get('sessions') sessions(@Req() req: AuthenticatedRequest) { return this.auth.listSessions(req.user!.id); }
  @Get('login-history') loginHistory(@Req() req: AuthenticatedRequest) { return this.auth.listLoginHistory(req.user!.id); }
  @Delete('sessions/:sessionId') revokeSession(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    return this.auth.revokeSession(req.user!.id, sessionId);
  }
}
