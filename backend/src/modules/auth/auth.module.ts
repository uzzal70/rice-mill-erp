import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailerService } from './mailer.service';
@Module({ controllers: [AuthController], providers: [AuthService, MailerService], exports: [AuthService] })
export class AuthModule {}
