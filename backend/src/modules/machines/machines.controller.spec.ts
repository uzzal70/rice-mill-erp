import { Test, TestingModule } from '@nestjs/testing';
import { AccessGuard } from '../../common/access.guard';
import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

describe('MachinesController', () => {
  let controller: MachinesController;
  let service: any;

  beforeEach(async () => {
    service = {
      createMachine: jest.fn().mockResolvedValue({ id: 'm-1' }),
      listMachines: jest.fn().mockResolvedValue([{ id: 'm-1' }]),
      getMachine: jest.fn().mockResolvedValue({ id: 'm-1' }),
      recordMachineLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
      createMaintenanceTicket: jest.fn().mockResolvedValue({ id: 'ticket-1' }),
      completeMaintenanceTicket: jest.fn().mockResolvedValue({ id: 'ticket-1', status: 'COMPLETED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MachinesController],
      providers: [{ provide: MachinesService, useValue: service }],
    })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MachinesController>(MachinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates createMachine to service', async () => {
    const dto: any = { companyId: 'comp-1', factoryId: 'fact-1', code: 'BOIL-01', name: 'Boiler 1' };
    const res = await controller.createMachine(dto);
    expect(service.createMachine).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 'm-1' });
  });

  it('delegates recordMachineLog to service', async () => {
    const dto: any = { companyId: 'comp-1', factoryId: 'fact-1', machineId: 'm-1', startHours: 10, endHours: 15 };
    const res = await controller.recordMachineLog(dto);
    expect(service.recordMachineLog).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 'log-1' });
  });
});

