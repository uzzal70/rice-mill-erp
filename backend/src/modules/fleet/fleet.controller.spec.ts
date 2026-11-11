import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';

describe('FleetController', () => {
  let controller: FleetController;
  let service: any;

  beforeEach(() => {
    service = {
      createVehicle: jest.fn(),
      listVehicles: jest.fn(),
      createTrip: jest.fn(),
      listTrips: jest.fn(),
      createFuelLog: jest.fn(),
      listFuelLogs: jest.fn(),
      createMaintenance: jest.fn(),
      listMaintenance: jest.fn(),
      getFleetAnalytics: jest.fn(),
    };

    controller = new FleetController(service as FleetService);
  });

  it('delegates createTrip to service', async () => {
    const dto = {
      vehicleId: 'v-1',
      tripNumber: 'TRIP-101',
      driverName: 'Abdul',
      tripDate: '2026-11-10',
      origin: 'A',
      destination: 'B',
      startOdometer: 100,
      endOdometer: 200,
    };
    await controller.createTrip('comp-1', dto);
    expect(service.createTrip).toHaveBeenCalledWith('comp-1', dto);
  });

  it('delegates getFleetAnalytics to service', async () => {
    await controller.getFleetAnalytics('comp-1');
    expect(service.getFleetAnalytics).toHaveBeenCalledWith('comp-1');
  });
});

