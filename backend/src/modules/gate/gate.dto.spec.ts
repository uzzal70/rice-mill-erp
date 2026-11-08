import 'reflect-metadata';
import { validate } from 'class-validator';
import { SubmitQualityResultsDto } from './gate.dto';

describe('quality result validation', () => {
  const results = () => Object.assign(new SubmitQualityResultsDto(), {
    companyId: 'company-1',
    factoryId: 'factory-1',
    moisturePct: 0,
    foreignMatterPct: 1.25,
    brokenPct: 2,
    damagedPct: 3,
    discoloredPct: 4,
    immaturePct: 5,
    chalkyPct: 6,
    purityPct: 97,
    otherPct: 0,
  });

  it('accepts all incoming paddy laboratory parameters, including measured zero', async () => {
    await expect(validate(results())).resolves.toHaveLength(0);
  });

  it('rejects measurements outside the percentage range', async () => {
    await expect(validate(Object.assign(results(), { discoloredPct: 100.01 }))).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'discoloredPct' })]),
    );
  });
});
