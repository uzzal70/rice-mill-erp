import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateCompanyDocumentDto, UpdateCompanyDocumentDto } from './documents.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDocument(companyId: string, dto: CreateCompanyDocumentDto, uploadedById?: string) {
    if (!dto.title || !dto.category) {
      throw new BadRequestException('Document title and category are required.');
    }

    return this.prisma.companyDocument.create({
      data: {
        companyId,
        factoryId: dto.factoryId || null,
        category: dto.category.toUpperCase(),
        title: dto.title,
        documentNumber: dto.documentNumber || null,
        issuingAuthority: dto.issuingAuthority || null,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        fileUrl: dto.fileUrl || null,
        fileName: dto.fileName || null,
        fileSize: dto.fileSize || null,
        mimeType: dto.mimeType || null,
        status: dto.status || 'ACTIVE',
        reminderDaysBefore: dto.reminderDaysBefore ?? 30,
        remarks: dto.remarks || null,
        uploadedById: uploadedById || null,
      },
    });
  }

  async updateDocument(companyId: string, id: string, dto: UpdateCompanyDocumentDto) {
    const doc = await this.prisma.companyDocument.findFirst({
      where: { companyId, id },
    });

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found.`);
    }

    return this.prisma.companyDocument.update({
      where: { id },
      data: {
        category: dto.category ? dto.category.toUpperCase() : undefined,
        title: dto.title !== undefined ? dto.title : undefined,
        documentNumber: dto.documentNumber !== undefined ? dto.documentNumber : undefined,
        issuingAuthority: dto.issuingAuthority !== undefined ? dto.issuingAuthority : undefined,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : dto.issueDate === null ? null : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : dto.expiryDate === null ? null : undefined,
        fileUrl: dto.fileUrl !== undefined ? dto.fileUrl : undefined,
        fileName: dto.fileName !== undefined ? dto.fileName : undefined,
        fileSize: dto.fileSize !== undefined ? dto.fileSize : undefined,
        mimeType: dto.mimeType !== undefined ? dto.mimeType : undefined,
        status: dto.status !== undefined ? dto.status : undefined,
        reminderDaysBefore: dto.reminderDaysBefore !== undefined ? dto.reminderDaysBefore : undefined,
        remarks: dto.remarks !== undefined ? dto.remarks : undefined,
        factoryId: dto.factoryId !== undefined ? dto.factoryId : undefined,
      },
    });
  }

  async deleteDocument(companyId: string, id: string) {
    const doc = await this.prisma.companyDocument.findFirst({
      where: { companyId, id },
    });

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found.`);
    }

    return this.prisma.companyDocument.delete({
      where: { id },
    });
  }

  async getDocument(companyId: string, id: string) {
    const doc = await this.prisma.companyDocument.findFirst({
      where: { companyId, id },
    });

    if (!doc) {
      throw new NotFoundException(`Document with id ${id} not found.`);
    }

    return doc;
  }

  async listDocuments(companyId: string, category?: string, status?: string, search?: string) {
    const where: Prisma.CompanyDocumentWhereInput = { companyId };

    if (category && category !== 'ALL') {
      where.category = category.toUpperCase();
    }

    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { documentNumber: { contains: q, mode: 'insensitive' } },
        { issuingAuthority: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.companyDocument.findMany({
      where,
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getExpiryNotifications(companyId: string) {
    const documents = await this.prisma.companyDocument.findMany({
      where: { companyId },
    });

    const now = new Date();
    const todayTimestamp = now.getTime();

    let expiredCount = 0;
    let expiringSoonCount = 0;
    let validCount = 0;

    const alerts: Array<{
      id: string;
      title: string;
      category: string;
      documentNumber: string | null;
      expiryDate: Date;
      daysRemaining: number;
      urgency: 'EXPIRED' | 'CRITICAL' | 'WARNING';
    }> = [];

    for (const doc of documents) {
      if (!doc.expiryDate) {
        validCount++;
        continue;
      }

      const expiryTimestamp = new Date(doc.expiryDate).getTime();
      const diffMs = expiryTimestamp - todayTimestamp;
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const reminderThreshold = doc.reminderDaysBefore || 30;

      if (daysRemaining < 0) {
        expiredCount++;
        alerts.push({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          documentNumber: doc.documentNumber,
          expiryDate: doc.expiryDate,
          daysRemaining,
          urgency: 'EXPIRED',
        });
      } else if (daysRemaining <= reminderThreshold) {
        expiringSoonCount++;
        alerts.push({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          documentNumber: doc.documentNumber,
          expiryDate: doc.expiryDate,
          daysRemaining,
          urgency: daysRemaining <= 7 ? 'CRITICAL' : 'WARNING',
        });
      } else {
        validCount++;
      }
    }

    // Sort alerts: expired first, then lowest days remaining
    alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return {
      totalDocuments: documents.length,
      expiredCount,
      expiringSoonCount,
      validCount,
      alerts,
    };
  }
}

