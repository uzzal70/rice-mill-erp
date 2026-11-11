import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TraceQueryDto, TraceGraph, TraceNode, TraceLink } from './trace.dto';

@Injectable()
export class TraceService {
  constructor(private readonly prisma: PrismaService) {}

  async traceTransaction(companyId: string, queryDto: TraceQueryDto): Promise<TraceGraph> {
    const rawTerm = queryDto.query?.trim() || '';
    if (!rawTerm) {
      return {
        query: rawTerm,
        found: false,
        rootStage: 'UNKNOWN',
        nodes: [],
        links: [],
        summary: { overallIntegrity: 'DISCREPANCY' },
      };
    }

    const nodes: TraceNode[] = [];
    const links: TraceLink[] = [];
    const addedNodeIds = new Set<string>();

    const addNode = (node: TraceNode) => {
      if (!addedNodeIds.has(node.id)) {
        addedNodeIds.add(node.id);
        nodes.push(node);
      }
    };

    const addLink = (from: string, to: string, label: string) => {
      if (addedNodeIds.has(from) && addedNodeIds.has(to)) {
        const linkKey = `${from}->${to}`;
        if (!links.some(l => `${l.from}->${l.to}` === linkKey)) {
          links.push({ from, to, label });
        }
      }
    };

    // 1. Search GateEntry
    const gateEntry = await this.prisma.gateEntry.findFirst({
      where: {
        companyId,
        OR: [
          { gateNumber: { equals: rawTerm, mode: 'insensitive' } },
          { vehicleNumber: { contains: rawTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        partner: true,
        weighbridgeTicket: true,
        qualitySamples: true,
        purchaseOrder: {
          include: {
            goodsReceipts: true,
            supplier: true,
          },
        },
      },
    });

    // 2. Search PurchaseOrder
    const purchaseOrder = gateEntry?.purchaseOrder || await this.prisma.purchaseOrder.findFirst({
      where: {
        companyId,
        orderNumber: { equals: rawTerm, mode: 'insensitive' },
      },
      include: {
        supplier: true,
        gateEntry: {
          include: {
            partner: true,
            weighbridgeTicket: true,
            qualitySamples: true,
          },
        },
        goodsReceipts: true,
      },
    });

    // 3. Search GoodsReceipt
    const goodsReceipt = purchaseOrder?.goodsReceipts?.[0] || await this.prisma.goodsReceipt.findFirst({
      where: {
        companyId,
        receiptNumber: { equals: rawTerm, mode: 'insensitive' },
      },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            gateEntry: {
              include: {
                partner: true,
                weighbridgeTicket: true,
                qualitySamples: true,
              },
            },
          },
        },
      },
    });

    // 4. Search ProductionBatch
    const productionBatch = await this.prisma.productionBatch.findFirst({
      where: {
        companyId,
        batchNumber: { equals: rawTerm, mode: 'insensitive' },
      },
      include: {
        inputItem: true,
        inputStack: { include: { godown: true } },
        outputs: { include: { item: true, stack: { include: { godown: true } } } },
      },
    });

    // 5. Search SalesOrder
    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: {
        companyId,
        orderNumber: { equals: rawTerm, mode: 'insensitive' },
      },
      include: {
        customer: true,
        dispatches: true,
        lines: { include: { item: true } },
      },
    });

    // 6. Search Journal / Payment
    const journal = await this.prisma.journal.findFirst({
      where: {
        companyId,
        number: { equals: rawTerm, mode: 'insensitive' },
      },
      include: {
        partner: true,
        lines: { include: { account: true } },
      },
    });

    // Assemble Graph from resolved references
    let rootStage = 'UNKNOWN';

    // A. Supplier Node
    const supplierPartner = purchaseOrder?.supplier || gateEntry?.partner;
    if (supplierPartner) {
      const suppId = `supp-${supplierPartner.id}`;
      const partnerAny = supplierPartner as any;
      addNode({
        id: suppId,
        stage: 'SUPPLIER',
        title: supplierPartner.name,
        code: supplierPartner.code,
        status: partnerAny.active !== undefined ? (partnerAny.active ? 'ACTIVE' : 'INACTIVE') : 'ACTIVE',
        timestamp: supplierPartner.createdAt.toISOString(),
        details: {
          type: supplierPartner.type,
          mobile: partnerAny.phone || 'N/A',
          district: partnerAny.address || 'N/A',
        },
        verified: true,
      });
      if (rawTerm.toLowerCase() === supplierPartner.code.toLowerCase()) rootStage = 'SUPPLIER';
    }

    // B. Gate Entry Node
    const resolvedGate = gateEntry || (purchaseOrder as any)?.gateEntry;
    if (resolvedGate) {
      const gateId = `gate-${resolvedGate.id}`;
      addNode({
        id: gateId,
        stage: 'GATE_ENTRY',
        title: `Gate Entry: ${resolvedGate.gateNumber}`,
        code: resolvedGate.gateNumber,
        status: resolvedGate.status,
        timestamp: resolvedGate.enteredAt.toISOString(),
        details: {
          vehicleNumber: resolvedGate.vehicleNumber,
          driverName: resolvedGate.driverName || 'N/A',
          direction: resolvedGate.direction,
          purpose: resolvedGate.purpose,
        },
        verified: true,
      });
      if (supplierPartner) addLink(`supp-${supplierPartner.id}`, gateId, 'DISPATCHED_TO_MILL');
      if (rawTerm.toLowerCase() === resolvedGate.gateNumber.toLowerCase() || rawTerm.toLowerCase() === resolvedGate.vehicleNumber.toLowerCase()) {
        rootStage = 'GATE_ENTRY';
      }
    }

    // C. Weighbridge Node
    const ticket = resolvedGate?.weighbridgeTicket;
    if (ticket && resolvedGate) {
      const weighId = `weigh-${ticket.id}`;
      const gross = Number(ticket.grossWeight || 0);
      const tare = Number(ticket.tareWeight || 0);
      const net = Number(ticket.netWeight || gross - tare);
      addNode({
        id: weighId,
        stage: 'WEIGHBRIDGE',
        title: `Weighbridge Scale Ticket: ${ticket.ticketNumber}`,
        code: ticket.ticketNumber,
        status: 'VERIFIED',
        timestamp: (ticket.secondWeightAt || ticket.firstWeightAt || resolvedGate.enteredAt).toISOString(),
        details: {
          grossWeightKg: gross,
          tareWeightKg: tare,
          netWeightKg: net,
        },
        verified: gross > tare && tare > 0,
      });
      addLink(`gate-${resolvedGate.id}`, weighId, 'SCALED_NET_WEIGHT');
    }

    // D. Quality Test Node
    const quality = resolvedGate?.qualitySamples?.[0];
    if (quality && resolvedGate) {
      const qualId = `qual-${quality.id}`;
      addNode({
        id: qualId,
        stage: 'QUALITY',
        title: `Lab Quality Sample: ${quality.sampleNumber}`,
        code: quality.sampleNumber,
        status: quality.status,
        timestamp: quality.sampledAt.toISOString(),
        details: {
          decision: quality.decision || 'PENDING',
          moisturePct: (quality.measurements as any)?.moisturePct ?? 14.0,
        },
        verified: quality.decision === 'ACCEPT' || quality.status === 'APPROVED',
      });
      addLink(`gate-${resolvedGate.id}`, qualId, 'LAB_INSPECTION');
    }

    // E. Purchase Order Node
    const po = purchaseOrder;
    if (po) {
      const poId = `po-${po.id}`;
      addNode({
        id: poId,
        stage: 'PURCHASE',
        title: `Procurement Contract: ${po.orderNumber}`,
        code: po.orderNumber,
        status: po.status,
        timestamp: po.createdAt.toISOString(),
        details: {
          orderedQuantityKg: Number(po.orderedQuantity || 0),
          payableQuantityKg: Number(po.payableQuantityKg || po.orderedQuantity || 0),
          unitRateBdt: Number(po.unitRate || 0),
        },
        verified: po.status === 'APPROVED' || po.status === 'POSTED',
      });
      if (resolvedGate) addLink(`gate-${resolvedGate.id}`, poId, 'COMMERCIAL_CONTRACT');
      if (rawTerm.toLowerCase() === po.orderNumber.toLowerCase()) rootStage = 'PURCHASE';
    }

    // F. Goods Receipt Node (GRN)
    const grn = goodsReceipt || (po as any)?.goodsReceipts?.[0];
    if (grn && po) {
      const grnId = `grn-${grn.id}`;
      addNode({
        id: grnId,
        stage: 'GRN',
        title: `Goods Receipt Note: ${grn.receiptNumber}`,
        code: grn.receiptNumber,
        status: grn.status,
        timestamp: grn.receivedAt.toISOString(),
        details: {
          receivedQuantityKg: Number(grn.quantity || 0),
        },
        verified: grn.status === 'POSTED',
      });
      addLink(`po-${po.id}`, grnId, 'PHYSICAL_RECEIPT');
      if (rawTerm.toLowerCase() === grn.receiptNumber.toLowerCase()) rootStage = 'GRN';
    }

    // G. Production Batch Node
    if (productionBatch) {
      const batchId = `batch-${productionBatch.id}`;
      addNode({
        id: batchId,
        stage: 'PRODUCTION',
        title: `Milling Batch: ${productionBatch.batchNumber}`,
        code: productionBatch.batchNumber,
        status: productionBatch.status,
        timestamp: productionBatch.startedAt.toISOString(),
        details: {
          inputItem: productionBatch.inputItem?.name || 'Raw Paddy',
          inputKg: Number(productionBatch.inputQuantityKg),
          outputKg: Number(productionBatch.totalOutputKg),
          headRiceRecoveryPct: Number(productionBatch.headRiceRecoveryPct),
          processLossKg: Number(productionBatch.processLossKg),
        },
        verified: productionBatch.status === 'POSTED' || productionBatch.status === 'APPROVED',
      });
      rootStage = 'PRODUCTION';

      // Outputs (Finished Goods)
      for (const out of productionBatch.outputs) {
        const outId = `out-${out.id}`;
        addNode({
          id: outId,
          stage: 'FINISHED_GOODS',
          title: `${out.item.name}: ${Number(out.quantityKg)} KG`,
          code: out.item.code,
          status: 'ON_HAND',
          timestamp: productionBatch.completedAt.toISOString(),
          details: {
            itemName: out.item.name,
            quantityKg: Number(out.quantityKg),
            godown: out.stack?.godown?.name || 'Main Godown',
            stack: out.stack?.code || 'PAD-01',
          },
          verified: true,
        });
        addLink(batchId, outId, 'MILLED_OUTPUT');
      }
    }

    // H. Sales Order Node
    if (salesOrder) {
      const soId = `so-${salesOrder.id}`;
      addNode({
        id: soId,
        stage: 'SALES',
        title: `Sales Order: ${salesOrder.orderNumber}`,
        code: salesOrder.orderNumber,
        status: salesOrder.status,
        timestamp: salesOrder.createdAt.toISOString(),
        details: {
          customerName: salesOrder.customer?.name || 'Wholesale Buyer',
          totalAmountBdt: Number(salesOrder.totalAmount),
        },
        verified: salesOrder.status === 'APPROVED' || salesOrder.status === 'POSTED',
      });
      rootStage = 'SALES';
    }

    // I. Journal / Payment Node
    if (journal) {
      const jrnId = `jrn-${journal.id}`;
      addNode({
        id: jrnId,
        stage: 'ACCOUNTING',
        title: `General Ledger Voucher: ${journal.number}`,
        code: journal.number,
        status: journal.status,
        timestamp: journal.voucherDate.toISOString(),
        details: {
          voucherType: journal.voucherType,
          totalAmountBdt: Number(journal.totalAmount),
          lineCount: journal.lines.length,
        },
        verified: journal.status === 'POSTED',
      });
      rootStage = 'ACCOUNTING';
    }

    // Compute Summary
    const totalPhysicalKg = nodes
      .filter(n => n.details?.netWeightKg || n.details?.receivedQuantityKg || n.details?.inputKg)
      .map(n => Number(n.details?.netWeightKg || n.details?.receivedQuantityKg || n.details?.inputKg || 0))
      .find(val => val > 0);

    const totalAmountBdt = nodes
      .filter(n => n.details?.totalAmountBdt)
      .map(n => Number(n.details?.totalAmountBdt || 0))[0];

    const recoveryPct = productionBatch ? Number(productionBatch.headRiceRecoveryPct) : undefined;

    return {
      query: rawTerm,
      found: nodes.length > 0,
      rootStage: rootStage !== 'UNKNOWN' ? rootStage : (nodes[0]?.stage || 'UNKNOWN'),
      nodes,
      links,
      summary: {
        totalPhysicalKg,
        totalAmountBdt,
        recoveryPct,
        overallIntegrity: nodes.every(n => n.verified) ? 'VERIFIED' : 'DISCREPANCY',
      },
    };
  }
}
