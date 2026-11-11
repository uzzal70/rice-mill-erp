import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: jest.Mocked<DashboardService>;

  beforeEach(() => {
    service = {
      compareFactories: jest.fn(),
      getOwnerDashboard: jest.fn(),
      getManagementAnalytics: jest.fn(),
    } as unknown as jest.Mocked<DashboardService>;
    controller = new DashboardController(service);
  });

  it('delegates factory comparison to service', async () => {
    const mockRes = [{ id: 'f1', name: 'Factory 1' }] as any;
    service.compareFactories.mockResolvedValue(mockRes);

    const result = await controller.compareFactories({ companyId: 'c1' });
    expect(service.compareFactories).toHaveBeenCalledWith({ companyId: 'c1' });
    expect(result).toBe(mockRes);
  });

  it('delegates owner dashboard to service', async () => {
    const mockRes = { today: {}, stock: {}, finance: {}, operations: {} } as any;
    service.getOwnerDashboard.mockResolvedValue(mockRes);

    const result = await controller.getOwnerDashboard({ companyId: 'c1' });
    expect(service.getOwnerDashboard).toHaveBeenCalledWith({ companyId: 'c1' });
    expect(result).toBe(mockRes);
  });

  it('delegates management analytics to service', async () => {
    const mockRes = { kpis: {}, charts: {} } as any;
    service.getManagementAnalytics.mockResolvedValue(mockRes);

    const result = await controller.getManagementAnalytics({ companyId: 'c1', days: '30' });
    expect(service.getManagementAnalytics).toHaveBeenCalledWith({ companyId: 'c1', days: '30' });
    expect(result).toBe(mockRes);
  });
});
