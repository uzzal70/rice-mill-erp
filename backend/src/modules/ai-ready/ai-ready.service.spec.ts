import { NotFoundException } from '@nestjs/common';
import { AiDomain, AiModelStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AiReadyService } from './ai-ready.service';

describe('AiReadyService', () => {
  let service: AiReadyService;
  const prisma = {
    aiModelRegistry: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    aiFeatureDataset: {
      groupBy: jest.fn(),
      create: jest.fn(),
    },
    aiPredictionLog: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    salesOrder: {
      findMany: jest.fn(),
    },
    purchaseOrder: {
      findMany: jest.fn(),
    },
    productionBatch: {
      findMany: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
    journalLine: {
      findMany: jest.fn(),
    },
    weighbridgeTicket: {
      findMany: jest.fn(),
    },
    stockMovement: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiReadyService(prisma);
  });

  it('returns domain overview for all 9 AI feature areas', async () => {
    (prisma.aiModelRegistry.findMany as jest.Mock).mockResolvedValue([
      { id: 'm1', domain: AiDomain.DEMAND_FORECASTING, modelName: 'Demand-XGBoost', version: '1.0', framework: 'ONNX', deployedAt: new Date() },
    ]);
    (prisma.aiFeatureDataset.groupBy as jest.Mock).mockResolvedValue([
      { domain: AiDomain.DEMAND_FORECASTING, _count: { _all: 3 } },
    ]);

    const res = await service.getDomainOverview('c1');
    expect(res.domains.length).toBe(9);
    const demand = res.domains.find(d => d.domain === AiDomain.DEMAND_FORECASTING);
    expect(demand?.status).toBe('MODEL_ACTIVE');
    expect(demand?.activeModel?.name).toBe('Demand-XGBoost');
    expect(demand?.datasetSnapshotCount).toBe(3);

    const price = res.domains.find(d => d.domain === AiDomain.RICE_PRICE_PREDICTION);
    expect(price?.status).toBe('DATA_PIPELINE_READY');
    expect(price?.activeModel).toBeNull();
  });

  it('extracts real historical feature dataset and snapshots it', async () => {
    (prisma.salesOrder.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'so-1',
        customerId: 'cust-1',
        createdAt: new Date(),
        customer: { name: 'Super Rice Co' },
        lines: [
          { item: { kind: 'RICE', name: 'Miniket Rice' }, quantityKg: new Prisma.Decimal(5000), unitRate: new Prisma.Decimal(65), lineAmount: new Prisma.Decimal(325000) },
        ],
      },
    ]);
    (prisma.aiFeatureDataset.create as jest.Mock).mockResolvedValue({
      id: 'ds-1',
      datasetName: 'Rice Demand Forecasting Dataset',
    });

    const res = await service.extractFeatureDataset({
      companyId: 'c1',
      domain: AiDomain.DEMAND_FORECASTING,
      days: 30,
    });

    expect(res.recordCount).toBe(1);
    expect(res.sampleRecords[0].volumeKg).toBe(5000);
    expect(res.sampleRecords[0].unitRateBDT).toBe(65);
    expect(prisma.aiFeatureDataset.create).toHaveBeenCalled();
  });

  it('registers an AI model and deactivates prior models when active', async () => {
    (prisma.aiModelRegistry.upsert as jest.Mock).mockResolvedValue({
      id: 'm1',
      domain: AiDomain.RICE_PRICE_PREDICTION,
      modelName: 'RicePrice-LSTM',
      version: '1.0',
      isActive: true,
    });

    const res = await service.registerModel({
      companyId: 'c1',
      domain: AiDomain.RICE_PRICE_PREDICTION,
      modelName: 'RicePrice-LSTM',
      version: '1.0',
      isActive: true,
    });

    expect(prisma.aiModelRegistry.updateMany).toHaveBeenCalledWith({
      where: { companyId: 'c1', domain: AiDomain.RICE_PRICE_PREDICTION, isActive: true },
      data: { isActive: false },
    });
    expect(res.modelName).toBe('RicePrice-LSTM');
  });

  it('returns NO_ACTIVE_MODEL when predicting without a registered model (no fake AI)', async () => {
    (prisma.aiModelRegistry.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await service.predict({
      companyId: 'c1',
      domain: AiDomain.PADDY_PRICE_PREDICTION,
      inputFeatures: { arrivalVolumeKg: 20000, moistureContent: 13.5 },
    });

    expect(res.status).toBe('NO_ACTIVE_MODEL');
    expect(res.message).toContain('No active AI model is registered');
    expect(prisma.aiPredictionLog.create).not.toHaveBeenCalled();
  });

  it('executes real inference contract and logs prediction when model is active', async () => {
    (prisma.aiModelRegistry.findFirst as jest.Mock).mockResolvedValue({
      id: 'm1',
      modelName: 'PaddyPrice-Regressor',
      version: '2.1',
      framework: 'ONNX',
      endpointUrl: 'http://ml-inference.internal:8000/predict',
    });
    (prisma.aiPredictionLog.create as jest.Mock).mockResolvedValue({
      id: 'pred-1',
    });

    const res = await service.predict({
      companyId: 'c1',
      domain: AiDomain.PADDY_PRICE_PREDICTION,
      inputFeatures: { arrivalVolumeKg: 20000, moistureContent: 13.5 },
    });

    expect(res.status).toBe('SUCCESS');
    expect(res.predictionId).toBe('pred-1');
    expect(prisma.aiPredictionLog.create).toHaveBeenCalled();
  });

  it('records ground truth feedback for model drift evaluation', async () => {
    (prisma.aiPredictionLog.findUnique as jest.Mock).mockResolvedValue({ id: 'pred-1' });
    (prisma.aiPredictionLog.update as jest.Mock).mockResolvedValue({ id: 'pred-1', wasAccurate: true });

    const res = await service.recordFeedback({
      predictionId: 'pred-1',
      actualValue: { actualPrice: 42.0 },
      wasAccurate: true,
    });

    expect(prisma.aiPredictionLog.update).toHaveBeenCalledWith({
      where: { id: 'pred-1' },
      data: { feedbackActual: { actualPrice: 42.0 }, wasAccurate: true },
    });
    expect(res.wasAccurate).toBe(true);
  });
});

