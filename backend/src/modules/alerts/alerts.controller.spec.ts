import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

describe('AlertsController', () => {
  let controller: AlertsController;
  let service: jest.Mocked<AlertsService>;

  beforeEach(() => {
    service = {
      listAlerts: jest.fn(),
      dismissAlert: jest.fn(),
      acknowledgeAlert: jest.fn(),
      listRules: jest.fn(),
      updateRule: jest.fn(),
      runDiagnosticScan: jest.fn(),
    } as unknown as jest.Mocked<AlertsService>;
    controller = new AlertsController(service);
  });

  it('delegates listAlerts to service', async () => {
    service.listAlerts.mockResolvedValue({ alerts: [], summary: {} } as any);
    const res = await controller.listAlerts({ companyId: 'c1' });
    expect(service.listAlerts).toHaveBeenCalledWith({ companyId: 'c1' });
    expect(res).toBeDefined();
  });

  it('delegates dismissAlert to service', async () => {
    service.dismissAlert.mockResolvedValue({ id: 'a1' } as any);
    await controller.dismissAlert('a1', { companyId: 'c1' }, { id: 'u1' });
    expect(service.dismissAlert).toHaveBeenCalledWith('a1', { companyId: 'c1' }, 'u1');
  });

  it('delegates runDiagnosticScan to service', async () => {
    service.runDiagnosticScan.mockResolvedValue({ message: 'done' } as any);
    await controller.runDiagnosticScan({ companyId: 'c1' });
    expect(service.runDiagnosticScan).toHaveBeenCalledWith({ companyId: 'c1' });
  });
});

