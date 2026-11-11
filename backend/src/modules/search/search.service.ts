import { Injectable } from '@nestjs/common';
import { PartnerType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import {
  GlobalSearchQueryDto,
  GlobalSearchResponse,
  SearchEntityCategory,
  SearchResultItem,
} from './search.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  public async globalSearch(dto: GlobalSearchQueryDto): Promise<GlobalSearchResponse> {
    const { companyId, query, category } = dto;
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) {
      return { query: '', totalMatches: 0, categoryCounts: {}, results: [] };
    }

    const limit = Math.min(Number(dto.limit) || 10, 50);
    const results: SearchResultItem[] = [];

    // Helper checks if category should be included
    const shouldSearch = (cat: SearchEntityCategory) => !category || category === 'ALL' || category === cat;

    const tasks: Array<Promise<void>> = [];

    // 1. SUPPLIER
    if (shouldSearch('SUPPLIER')) {
      tasks.push(
        this.prisma.partner
          .findMany({
            where: {
              companyId,
              type: { in: [PartnerType.SUPPLIER, PartnerType.BROKER] },
              OR: [
                { name: { contains: cleanQuery, mode: 'insensitive' } },
                { code: { contains: cleanQuery, mode: 'insensitive' } },
                { phone: { contains: cleanQuery } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((p) => {
              results.push({
                id: p.id,
                category: 'SUPPLIER',
                categoryLabel: 'Supplier',
                categoryLabelBn: 'সরবরাহকারী',
                title: p.name,
                subtitle: `Code: ${p.code} | Phone: ${p.phone || 'N/A'} | Type: ${p.type}`,
                badge: p.active ? 'ACTIVE' : 'INACTIVE',
                navigationKey: 'partnerMaster',
                referenceId: p.id,
                metadata: { code: p.code, phone: p.phone, address: p.address },
              });
            });
          }),
      );
    }

    // 2. FARMER
    if (shouldSearch('FARMER')) {
      tasks.push(
        this.prisma.partner
          .findMany({
            where: {
              companyId,
              type: PartnerType.FARMER,
              OR: [
                { name: { contains: cleanQuery, mode: 'insensitive' } },
                { code: { contains: cleanQuery, mode: 'insensitive' } },
                { phone: { contains: cleanQuery } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((p) => {
              results.push({
                id: p.id,
                category: 'FARMER',
                categoryLabel: 'Farmer',
                categoryLabelBn: 'কৃষক',
                title: p.name,
                subtitle: `Farmer ID: ${p.code} | Village/Mobile: ${p.phone || p.address || 'N/A'}`,
                badge: 'FARMER',
                navigationKey: 'partnerMaster',
                referenceId: p.id,
                metadata: { code: p.code, phone: p.phone },
              });
            });
          }),
      );
    }

    // 3. CUSTOMER
    if (shouldSearch('CUSTOMER')) {
      tasks.push(
        this.prisma.partner
          .findMany({
            where: {
              companyId,
              type: PartnerType.CUSTOMER,
              OR: [
                { name: { contains: cleanQuery, mode: 'insensitive' } },
                { code: { contains: cleanQuery, mode: 'insensitive' } },
                { phone: { contains: cleanQuery } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((p) => {
              results.push({
                id: p.id,
                category: 'CUSTOMER',
                categoryLabel: 'Customer',
                categoryLabelBn: 'ক্রেতা',
                title: p.name,
                subtitle: `Customer Code: ${p.code} | Phone: ${p.phone || 'N/A'} | Area: ${p.address || 'Dhaka'}`,
                badge: p.active ? 'ACTIVE' : 'INACTIVE',
                navigationKey: 'partnerMaster',
                referenceId: p.id,
                metadata: { code: p.code, phone: p.phone },
              });
            });
          }),
      );
    }

    // 4. VEHICLE
    if (shouldSearch('VEHICLE')) {
      tasks.push(
        this.prisma.vehicle
          .findMany({
            where: {
              companyId,
              OR: [
                { vehicleNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { registrationNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { driverName: { contains: cleanQuery, mode: 'insensitive' } },
                { driverMobile: { contains: cleanQuery } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((v) => {
              results.push({
                id: v.id,
                category: 'VEHICLE',
                categoryLabel: 'Vehicle',
                categoryLabelBn: 'যানবাহন',
                title: v.vehicleNumber,
                subtitle: `Type: ${v.vehicleType} | Driver: ${v.driverName || 'N/A'} (${v.driverMobile || 'N/A'})`,
                badge: v.active ? 'REGISTERED' : 'DEACTIVATED',
                navigationKey: 'vehicleMaster',
                referenceId: v.id,
                metadata: { driverName: v.driverName, mobile: v.driverMobile },
              });
            });
          }),
      );
    }

    // 5. INVOICE (Purchase Invoices & Sales Invoices)
    if (shouldSearch('INVOICE')) {
      tasks.push(
        this.prisma.purchaseInvoice
          .findMany({
            where: {
              companyId,
              OR: [
                { invoiceNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { remarks: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((inv) => {
              results.push({
                id: inv.id,
                category: 'INVOICE',
                categoryLabel: 'Purchase Invoice',
                categoryLabelBn: 'ক্রয় ইনভয়েস',
                title: inv.invoiceNumber,
                subtitle: `Net: ৳${Number(inv.netSupplierPayable).toLocaleString()} | Physical: ${Number(inv.physicalQuantityKg).toLocaleString()} KG`,
                badge: inv.status,
                navigationKey: 'purchaseInvoices',
                referenceId: inv.id,
                metadata: { gross: inv.grossAmount, net: inv.netSupplierPayable },
              });
            });
          }),
      );
    }

    // 6. PURCHASE (Purchase Orders)
    if (shouldSearch('PURCHASE')) {
      tasks.push(
        this.prisma.purchaseOrder
          .findMany({
            where: {
              companyId,
              OR: [
                { orderNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { remarks: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((po) => {
              results.push({
                id: po.id,
                category: 'PURCHASE',
                categoryLabel: 'Purchase Order',
                categoryLabelBn: 'ধান ক্রয় চুক্তি',
                title: po.orderNumber,
                subtitle: `Status: ${po.status} | Contracted Paddy Purchase`,
                badge: po.status,
                navigationKey: 'procurement',
                referenceId: po.id,
                metadata: { status: po.status },
              });
            });
          }),
      );
    }

    // 7. SALES (Sales Orders)
    if (shouldSearch('SALES')) {
      tasks.push(
        this.prisma.salesOrder
          .findMany({
            where: {
              companyId,
              OR: [
                { orderNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { remarks: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((so) => {
              results.push({
                id: so.id,
                category: 'SALES',
                categoryLabel: 'Sales Order',
                categoryLabelBn: 'বিক্রয় আদেশ',
                title: so.orderNumber,
                subtitle: `Status: ${so.status} | Total Amount: ৳${Number(so.totalAmount).toLocaleString()}`,
                badge: so.status,
                navigationKey: 'sales',
                referenceId: so.id,
                metadata: { totalAmount: so.totalAmount },
              });
            });
          }),
      );
    }

    // 8. BATCH (Production Batches)
    if (shouldSearch('BATCH')) {
      tasks.push(
        this.prisma.productionBatch
          .findMany({
            where: {
              companyId,
              OR: [
                { batchNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { remarks: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((b) => {
              results.push({
                id: b.id,
                category: 'BATCH',
                categoryLabel: 'Production Batch',
                categoryLabelBn: 'মাড়াই ব্যাচ',
                title: b.batchNumber,
                subtitle: `Input: ${Number(b.inputQuantityKg).toLocaleString()} KG | Rice Output: ${Number(b.totalOutputKg).toLocaleString()} KG | Recovery: ${Number(b.totalRiceRecoveryPct)}%`,
                badge: b.status,
                navigationKey: 'production',
                referenceId: b.id,
                metadata: { inputKg: b.inputQuantityKg, recoveryPct: b.totalRiceRecoveryPct },
              });
            });
          }),
      );
    }

    // 9. STOCK (Items & Stacks)
    if (shouldSearch('STOCK')) {
      tasks.push(
        this.prisma.item
          .findMany({
            where: {
              companyId,
              OR: [
                { name: { contains: cleanQuery, mode: 'insensitive' } },
                { code: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((item) => {
              results.push({
                id: item.id,
                category: 'STOCK',
                categoryLabel: 'Stock Item',
                categoryLabelBn: 'মজুদ পণ্য',
                title: `${item.name} (${item.code})`,
                subtitle: `Commodity Kind: ${item.kind} | Base Unit: ${item.baseUnit}`,
                badge: item.kind,
                navigationKey: 'inventory',
                referenceId: item.id,
                metadata: { kind: item.kind, unit: item.baseUnit },
              });
            });
          }),
      );
    }

    // 10. GATE PASS (Gate Entries)
    if (shouldSearch('GATE_PASS')) {
      tasks.push(
        this.prisma.gateEntry
          .findMany({
            where: {
              companyId,
              OR: [
                { gateNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { vehicleNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { driverName: { contains: cleanQuery, mode: 'insensitive' } },
                { challanNumber: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((gate) => {
              results.push({
                id: gate.id,
                category: 'GATE_PASS',
                categoryLabel: 'Gate Pass',
                categoryLabelBn: 'গেট পাস',
                title: `Gate #${gate.gateNumber} · ${gate.vehicleNumber}`,
                subtitle: `Driver: ${gate.driverName || 'N/A'} | Purpose: ${gate.purpose} | Status: ${gate.status}`,
                badge: gate.status,
                navigationKey: 'gate',
                referenceId: gate.id,
                metadata: { vehicle: gate.vehicleNumber, purpose: gate.purpose },
              });
            });
          }),
      );
    }

    // 11. WEIGHBRIDGE TICKET
    if (shouldSearch('WEIGHBRIDGE_TICKET')) {
      tasks.push(
        this.prisma.weighbridgeTicket
          .findMany({
            where: {
              companyId,
              OR: [
                { ticketNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { remarks: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((t) => {
              results.push({
                id: t.id,
                category: 'WEIGHBRIDGE_TICKET',
                categoryLabel: 'Weighbridge Ticket',
                categoryLabelBn: 'ওজন স্কেল টিকিট',
                title: `Ticket #${t.ticketNumber}`,
                subtitle: `Gross: ${Number(t.grossWeight).toLocaleString()} KG | Tare: ${Number(t.tareWeight).toLocaleString()} KG | Net: ${Number(t.netWeight).toLocaleString()} KG`,
                badge: 'CERTIFIED',
                navigationKey: 'gate',
                referenceId: t.id,
                metadata: { netWeightKg: t.netWeight },
              });
            });
          }),
      );
    }

    // 12. PAYMENT (Expenses & Vouchers)
    if (shouldSearch('PAYMENT')) {
      tasks.push(
        this.prisma.expense
          .findMany({
            where: {
              companyId,
              OR: [
                { voucherNumber: { contains: cleanQuery, mode: 'insensitive' } },
                { title: { contains: cleanQuery, mode: 'insensitive' } },
                { payeeName: { contains: cleanQuery, mode: 'insensitive' } },
              ],
            },
            take: limit,
          })
          .then((rows) => {
            rows.forEach((exp) => {
              results.push({
                id: exp.id,
                category: 'PAYMENT',
                categoryLabel: 'Payment Voucher',
                categoryLabelBn: 'পেমেন্ট ভাউচার',
                title: `${exp.voucherNumber} · ${exp.title}`,
                subtitle: `Payee: ${exp.payeeName || 'N/A'} | Category: ${exp.category} | Mode: ${exp.paymentMode}`,
                badge: exp.status,
                navigationKey: 'expenses',
                referenceId: exp.id,
                metadata: { category: exp.category, mode: exp.paymentMode },
              });
            });
          }),
      );
    }

    // Execute all queries in parallel
    await Promise.all(tasks);

    // Compute category counts
    const categoryCounts: Record<string, number> = {};
    results.forEach((item) => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    return {
      query: cleanQuery,
      totalMatches: results.length,
      categoryCounts,
      results,
    };
  }
}
