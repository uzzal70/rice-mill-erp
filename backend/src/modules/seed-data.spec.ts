import * as fs from 'fs';
import * as path from 'path';

describe('Seed Data Verification (#73 Realistic Bangladesh Demo Data)', () => {
  const seedFilePath = path.resolve(__dirname, '../../prisma/seed.cjs');
  let seedContent: string;

  beforeAll(() => {
    expect(fs.existsSync(seedFilePath)).toBe(true);
    seedContent = fs.readFileSync(seedFilePath, 'utf8');
  });

  describe('1. Company and Factory Hierarchy', () => {
    it('should define the primary enterprise company: ABC Rice Industries Ltd.', () => {
      expect(seedContent).toContain('ABC Rice Industries Ltd.');
      expect(seedContent).toContain('ABC-RICE');
    });

    it('should configure the two required factory locations: Bogura and Naogaon', () => {
      expect(seedContent).toContain('Bogura Factory');
      expect(seedContent).toContain('BOGURA');
      expect(seedContent).toContain('Naogaon Factory');
      expect(seedContent).toContain('NAOGAON');
    });

    it('should configure warehouse godowns: Godown A and Godown B', () => {
      expect(seedContent).toContain('Godown A');
      expect(seedContent).toContain('GODOWN-A');
      expect(seedContent).toContain('Godown B');
      expect(seedContent).toContain('GODOWN-B');
    });
  });

  describe('2. Item Masters (Paddy, Products, By-Products, Packaging)', () => {
    it('should define all 5 required Bangladesh paddy varieties', () => {
      const requiredPaddy = [
        'BRRI Dhan 28',
        'BRRI Dhan 29',
        'BRRI Dhan 49',
        'Miniket Paddy',
        'Najirshail Paddy',
      ];
      for (const paddy of requiredPaddy) {
        expect(seedContent).toContain(paddy);
      }
    });

    it('should define all 4 required finished rice products', () => {
      const requiredProducts = [
        'Miniket Rice',
        'Najirshail Rice',
        'Parboiled Rice',
        'Broken Rice',
      ];
      for (const product of requiredProducts) {
        expect(seedContent).toContain(product);
      }
    });

    it('should define all 3 required by-products', () => {
      expect(seedContent).toContain("'BRAN'");
      expect(seedContent).toContain("'HUSK'");
      expect(seedContent).toContain("'POLISH'");
    });

    it('should define standard packaging specifications (5KG to 50KG sacks)', () => {
      expect(seedContent).toContain('BAG-5KG');
      expect(seedContent).toContain('BAG-10KG');
      expect(seedContent).toContain('BAG-20KG');
      expect(seedContent).toContain('BAG-25KG');
      expect(seedContent).toContain('BAG-50KG');
    });
  });

  describe('3. Commercial Partners & Logistics Assets', () => {
    it('should seed realistic Bangladesh grain suppliers and farmers', () => {
      expect(seedContent).toContain('Bogura Agro Traders');
      expect(seedContent).toContain('Haji Shafiul Grain Traders');
      expect(seedContent).toContain('Rahima Begum');
      expect(seedContent).toContain('Mokbul Hossain');
    });

    it('should seed licensed grain brokers with commission rates', () => {
      expect(seedContent).toContain('North Bengal Grain Brokers');
      expect(seedContent).toContain('Al-Madina Grain Brokerage');
    });

    it('should seed wholesale rice customers with credit limits', () => {
      expect(seedContent).toContain('Bogura Wholesale Rice');
      expect(seedContent).toContain('North Bengal Distributors');
      expect(seedContent).toContain('Karwan Bazar Rice Wholesale');
    });

    it('should seed transport fleet vehicles with Bangladesh registration numbers', () => {
      expect(seedContent).toContain('BOGURA-METRO-T-11-0101');
      expect(seedContent).toContain('NAOGAON-METRO-T-11-0202');
    });
  });

  describe('4. Transactional Demo Records', () => {
    it('should seed realistic production milling batch', () => {
      expect(seedContent).toContain('BAT-2026-001');
      expect(seedContent).toContain('inputQuantityKg: 4000');
      expect(seedContent).toContain('totalOutputKg: 3900');
      expect(seedContent).toContain('headRiceRecoveryPct: 65');
    });

    it('should seed realistic wholesale sales order', () => {
      expect(seedContent).toContain('SO-2026-001');
      expect(seedContent).toContain('totalAmount: 176800');
    });

    it('should seed factory and operational expenses (Electricity, Fuel, Labor)', () => {
      expect(seedContent).toContain('EXP-2026-001');
      expect(seedContent).toContain('Monthly Mill Electricity Bill (NESCO)');
      expect(seedContent).toContain('EXP-2026-002');
      expect(seedContent).toContain('Boiler Diesel Fuel 400L (Padma Oil)');
      expect(seedContent).toContain('EXP-2026-003');
      expect(seedContent).toContain('Loading & Unloading Labor Wages');
    });

    it('should seed supplier payment voucher', () => {
      expect(seedContent).toContain('PMT-2026-001');
      expect(seedContent).toContain('totalAmount: 150000');
      expect(seedContent).toContain('SUPPLIER_PAYMENT');
    });
  });
});

