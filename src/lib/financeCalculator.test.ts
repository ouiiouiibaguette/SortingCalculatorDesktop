import { describe, it, expect } from 'vitest';
import { calculateFinanceProject, FinanceProjectInput } from './financeCalculator';

describe('financeCalculator', () => {

    const defaultInput: FinanceProjectInput = {
        qty_total: 1000,
        cadence_brute_per_h: 100,
        productivity_pct: 100,
        hours_per_day: 8,
        operators_count: 1,
        cadence_scope: 'per_operator',

        operator_rate_per_h: 20,
        cariste_rate_per_h: 0,
        cariste_hours: 0,
        cariste_mode: 'total_project',

        overhead_pct: 0,
        target_margin_pct: 0,
        billing_mode: 'per_piece',
        billing_price_per_piece: null,
        billing_price_total: null,

        allow_premium_overlap: false,
        premiums: []
    };

    it('cas nominal: 1000 pièces, 100/h, 100%, 8h/j, 1 op, 20€/h', () => {
        const res = calculateFinanceProject(defaultInput);
        // 1000 pieces @ 100/hr = 10 hrs.
        // 10 hrs * 20€/h = 200€ total.
        expect(res.cadence_nette_per_h).toBe(100);
        expect(res.total_hours).toBe(10);
        expect(res.total_days).toBeCloseTo(1.25);
        expect(res.labor_cost).toBe(200);
        expect(res.total_cost_full).toBe(200);
        expect(res.cost_per_piece).toBe(0.20);
        expect(res.margin_eur).toBe(0);
        expect(res.risk_score).toBe(0);
        expect(res.risk_level).toBe('low');

        // Sensitivity
        expect(res.sensitivity.length).toBe(4);
        expect(res.sensitivity.find(s => s.productivity === 100)?.cost_per_piece).toBe(0.20);
    });

    it('cas productivité 80%', () => {
        const input = { ...defaultInput, productivity_pct: 80 };
        const res = calculateFinanceProject(input);
        // cad nette = 80/hr
        // total hours = 1000 / 80 = 12.5 hrs
        // labor cost = 12.5 * 20 = 250€
        expect(res.cadence_nette_per_h).toBe(80);
        expect(res.total_hours).toBe(12.5);
        expect(res.labor_cost).toBe(250);
        expect(res.cost_per_piece).toBe(0.25);
        // Risk score: <90 adds 20. But <80 adds 35 instead of 20. Wait, <80 is 35. 
        // 12.5h / 8h = 1.56 days (no day risk)
        expect(res.risk_score).toBe(20); // wait, my logic was if < 80 += 35 else if < 90 += 20. So 80 is not <80, it's <=80? 
    });

    it('cas majoration nuit 25% sur X heures', () => {
        const input: FinanceProjectInput = {
            ...defaultInput,
            premiums: [{
                id: '1', type: 'nuit', hours: 4, pct: 25, base: 'operator_only'
            }]
        };
        const res = calculateFinanceProject(input);
        // Labor base = 200€
        // Premium = 4h * 20€ * 25% = 20€
        // Total = 220€
        expect(res.labor_cost).toBe(200);
        expect(res.majorations_cost).toBe(20);
        expect(res.total_cost_full).toBe(220);
        expect(res.cost_per_piece).toBe(0.22);
    });

    it('cas overhead 10%', () => {
        const input: FinanceProjectInput = {
            ...defaultInput,
            overhead_pct: 10
        };
        const res = calculateFinanceProject(input);
        // base = 200€
        // overhead = 20€
        // Total = 220€
        expect(res.overhead_cost).toBe(20);
        expect(res.total_cost_full).toBe(220);
        expect(res.cost_per_piece).toBe(0.22);
    });

    it('cas marge cible 15%', () => {
        const input: FinanceProjectInput = {
            ...defaultInput,
            target_margin_pct: 15
        };
        const res = calculateFinanceProject(input);
        // Base cost = 0.20€
        // Targeted piece price = 0.20 * 1.15 = 0.23€
        expect(res.price_per_piece_suggested).toBeCloseTo(0.23, 2);
        expect(res.margin_pct).toBe(15);
        expect(res.margin_eur).toBeCloseTo((0.23 - 0.20) * 1000, 2);
    });

    it('cas validation heures premium > total (doit échouer)', () => {
        const input: FinanceProjectInput = {
            ...defaultInput,
            allow_premium_overlap: false, // 10h total labor
            premiums: [
                { id: '1', type: 'nuit', hours: 8, pct: 25, base: 'operator_only' },
                { id: '2', type: 'samedi', hours: 4, pct: 25, base: 'operator_only' }
            ]
        };
        expect(() => calculateFinanceProject(input)).toThrow(/cannot exceed total labor hours/);
    });

    it('cas validation heures premium > total AVEC overlap permis (succès)', () => {
        const input: FinanceProjectInput = {
            ...defaultInput,
            allow_premium_overlap: true,
            premiums: [
                { id: '1', type: 'nuit', hours: 8, pct: 25, base: 'operator_only' },
                { id: '2', type: 'samedi', hours: 4, pct: 25, base: 'operator_only' }
            ]
        };
        const res = calculateFinanceProject(input);
        // Premium sum = (8*20*0.25) + (4*20*0.25) = 40 + 20 = 60
        expect(res.majorations_cost).toBe(60);
        expect(res.total_cost_full).toBe(260);
    });
});
