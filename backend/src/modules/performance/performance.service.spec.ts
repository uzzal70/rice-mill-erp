import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService } from './performance.service';

describe('PerformanceService (#68 Performance & Caching)', () => {
  let service: PerformanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceService],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
  });

  it('should enforce safe pagination bounds (page >= 1, 1 <= limit <= 100)', () => {
    const defaultPage = service.buildPagination();
    expect(defaultPage.page).toBe(1);
    expect(defaultPage.limit).toBe(25);
    expect(defaultPage.take).toBe(25);
    expect(defaultPage.skip).toBe(0);

    const customPage = service.buildPagination(3, 50);
    expect(customPage.skip).toBe(100);
    expect(customPage.take).toBe(50);

    // Hard cap at 100 to prevent unbounded queries
    const capped = service.buildPagination(1, 5000);
    expect(capped.take).toBe(100);
  });

  it('should store and retrieve cached values within TTL and record hits/misses', () => {
    expect(service.getCache('item:1')).toBeNull(); // Miss

    service.setCache('item:1', { name: 'BR-28 Paddy' }, 60);
    const cached = service.getCache('item:1'); // Hit
    expect(cached).toEqual({ name: 'BR-28 Paddy' });

    const stats = service.getCacheStats();
    expect(stats.hitCount).toBe(1);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRatePercent).toBe(50);
  });

  it('should expire cached items when TTL elapses', () => {
    // Set 0 second TTL for instant expiration
    service.setCache('temp:1', 'value', -1);
    expect(service.getCache('temp:1')).toBeNull();
  });

  it('should invalidate cache entries by prefix', () => {
    service.setCache('tax:vat', { rate: 0.15 }, 60);
    service.setCache('tax:ait', { rate: 0.02 }, 60);
    service.setCache('item:paddy', { code: 'P01' }, 60);

    const deleted = service.invalidateCache('tax:');
    expect(deleted).toBe(2);
    expect(service.getCache('tax:vat')).toBeNull();
    expect(service.getCache('item:paddy')).not.toBeNull();
  });

  it('should enqueue and manage asynchronous background worker jobs', async () => {
    const job = service.enqueueJob('BULK_IMPORT', { rowsCount: 500 });
    expect(job.id).toBeDefined();
    expect(job.status).toBe('QUEUED');

    const fetched = service.getJob(job.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.type).toBe('BULK_IMPORT');
  });
});

