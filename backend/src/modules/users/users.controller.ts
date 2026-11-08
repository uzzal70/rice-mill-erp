import { Body, Controller, ForbiddenException, Get, Post, Query, Req } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../common/prisma.service';
import { AuthenticatedRequest, RequirePermission } from '../../common/authz';
import { PermissionAction } from '@prisma/client';
class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @Length(2, 120) fullName!: string;
  @IsString() @MinLength(12) temporaryPassword!: string;
  @IsString() companyId!: string;
  @IsOptional() @IsString() factoryId?: string;
}
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() @RequirePermission('users', PermissionAction.READ) list(@Req() req: AuthenticatedRequest, @Query('companyId') companyId?: string) { return this.prisma.user.findMany({ where: { memberships: { some: { companyId: companyId ?? { in: req.user!.companyIds }, active: true } } }, select: { id: true, email: true, fullName: true, status: true, memberships: true }, orderBy: { fullName: 'asc' } }); }
  @Post() @RequirePermission('users', PermissionAction.CREATE) async create(@Body() dto: CreateUserDto) {
    if (dto.factoryId && !await this.prisma.factory.findFirst({ where: { id: dto.factoryId, companyId: dto.companyId } })) throw new ForbiddenException('Factory does not belong to this company.');
    const passwordHash = await bcrypt.hash(dto.temporaryPassword, 12);
    return this.prisma.user.create({ data: { email: dto.email.toLowerCase(), fullName: dto.fullName, passwordHash, status: 'ACTIVE', memberships: { create: { companyId: dto.companyId, factoryId: dto.factoryId } } }, select: { id: true, email: true, fullName: true, status: true } });
  }
}
