import { ExportFormat, ReportType } from './reports.dto';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: jest.Mocked<ReportsService>;

  beforeEach(() => {
    service = {
      getFilterOptions: jest.fn(),
      generateReport: jest.fn(),
    } as unknown as jest.Mocked<ReportsService>;
    controller = new ReportsController(service);
  });

  it('delegates getFilterOptions to service', async () => {
    service.getFilterOptions.mockResolvedValue({ factories: [] } as any);
    const res = await controller.getFilterOptions('c1');
    expect(service.getFilterOptions).toHaveBeenCalledWith('c1');
    expect(res).toBeDefined();
  });

  it('delegates generateReport to service', async () => {
    service.generateReport.mockResolvedValue({ rows: [], summary: {} } as any);
    const res = await controller.generateReport({ companyId: 'c1', reportType: ReportType.PROCUREMENT_REGISTER });
    expect(service.generateReport).toHaveBeenCalledWith({ companyId: 'c1', reportType: ReportType.PROCUREMENT_REGISTER });
    expect(res).toBeDefined();
  });

  it('handles CSV export download response', async () => {
    service.generateReport.mockResolvedValue({
      format: ExportFormat.CSV,
      mimeType: 'text/csv',
      fileName: 'report.csv',
      content: 'header1,header2\nval1,val2',
    } as any);

    const mockRes = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;

    await controller.exportReport({ companyId: 'c1', reportType: ReportType.PROCUREMENT_REGISTER, format: ExportFormat.CSV }, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockRes.send).toHaveBeenCalledWith('header1,header2\nval1,val2');
  });
});

