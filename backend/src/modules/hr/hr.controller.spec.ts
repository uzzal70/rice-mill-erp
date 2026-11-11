import { Test, TestingModule } from '@nestjs/testing';
import { AccessGuard } from '../../common/access.guard';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';

describe('HrController', () => {
  let controller: HrController;
  let service: any;

  beforeEach(async () => {
    service = {
      createEmployee: jest.fn().mockResolvedValue({ id: 'emp-1' }),
      updateEmployee: jest.fn().mockResolvedValue({ id: 'emp-1' }),
      listEmployees: jest.fn().mockResolvedValue([{ id: 'emp-1' }]),
      getEmployee: jest.fn().mockResolvedValue({ id: 'emp-1' }),
      recordAttendance: jest.fn().mockResolvedValue({ id: 'att-1' }),
      createLoanAdvance: jest.fn().mockResolvedValue({ id: 'loan-1' }),
      generatePayroll: jest.fn().mockResolvedValue({ id: 'pay-1' }),
      postPayroll: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'POSTED' }),
      listPayrolls: jest.fn().mockResolvedValue([{ id: 'pay-1' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HrController],
      providers: [{ provide: HrService, useValue: service }],
    })
      .overrideGuard(AccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HrController>(HrController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates createEmployee to service', async () => {
    const dto: any = { companyId: 'comp-1', employeeCode: 'EMP-01', fullName: 'Karim', baseSalary: 25000 };
    const res = await controller.createEmployee(dto);
    expect(service.createEmployee).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 'emp-1' });
  });

  it('delegates generatePayroll to service', async () => {
    const dto: any = { companyId: 'comp-1', monthYear: '2026-11' };
    const req: any = { user: { id: 'user-1' } };
    const res = await controller.generatePayroll(dto, req);
    expect(service.generatePayroll).toHaveBeenCalledWith(dto, 'user-1');
    expect(res).toEqual({ id: 'pay-1' });
  });
});

