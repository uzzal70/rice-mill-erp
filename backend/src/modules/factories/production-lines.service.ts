import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { CreateProductionLineDto, ListProductionLinesDto } from './production-lines.dto';

@Injectable()
export class ProductionLinesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductionLinesDto) {
    const factory = await this.prisma.factory.findFirst({
      where: { id: query.factoryId, companyId: query.companyId, active: true },
      select: { id: true },
    });
    if (!factory) throw new BadRequestException('Factory does not belong to this company or is inactive.');
    return this.prisma.productionLine.findMany({
      where: { companyId: query.companyId, factoryId: query.factoryId, active: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateProductionLineDto, userId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const factory = await tx.factory.findFirst({
          where: { id: dto.factoryId, companyId: dto.companyId, active: true },
          select: { id: true },
        });
        if (!factory) throw new BadRequestException('Select an active factory belonging to this company.');
        const line = await tx.productionLine.create({
          data: {
            companyId: dto.companyId,
            factoryId: dto.factoryId,
            name: dto.name.trim(),
            code: dto.code.trim().toUpperCase(),
          },
        });
        const snapshot = JSON.parse(JSON.stringify(line)) as Prisma.InputJsonValue;
        await tx.auditEvent.create({
          data: {
            companyId: dto.companyId,
            userId,
            resource: 'production-lines',
            action: 'CREATE',
            resourceId: line.id,
            after: snapshot,
          },
        });
        return line;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A production line with this code already exists in the factory.');
      }
      throw error;
    }
  }
}
