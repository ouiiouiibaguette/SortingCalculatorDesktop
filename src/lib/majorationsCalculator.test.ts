import { describe, it, expect } from 'vitest';
import { calculateMajorations, CalculationInputs } from './majorationsCalculator';

describe('majorationsCalculator', () => {

    const defaultInputs: CalculationInputs = {
        q_total: 1000,
        cadence_brut: 100,
        prod_pct: 100, // 100 pieces per hour
        h_par_jour: 8,
        rate_op: 20,
        rate_cariste: 25,
        h_cariste: 0,
        cariste_mode: 'total',
        majorations: []
    };

    it('1) prod 100%, sans majorations => prix_piece_final == prix_piece_base', () => {
        const res = calculateMajorations(defaultInputs);
        // 1000 pieces @ 100/hr = 10 hrs.
        // 10 hrs * 20€/hr = 200€ total.
        // 200€ / 1000 pieces = 0.20€ / piece.
        expect(res.cadence_nette).toBe(100);
        expect(res.heures_total_op).toBe(10);
        expect(res.cout_base_total).toBe(200);
        expect(res.prix_piece_base).toBe(0.20);
        expect(res.surcout_total).toBe(0);
        expect(res.prix_piece_final).toBe(res.prix_piece_base);
        expect(res.delta_piece).toBe(0);
    });

    it('2) nuit 50% sur X heures => surcout ok', () => {
        const inputs = {
            ...defaultInputs,
            // operator 10 hrs base, let's say 4 hours are at night (50% bonus)
            majorations: [{
                type: 'nuit' as const,
                label: 'Majoration Nuit',
                hours: 4,
                rate_pct: 50,
                apply_to_cariste: false
            }]
        };

        const res = calculateMajorations(inputs);

        // Normal base op cost = 200€
        // Night bonus for 4 hrs = 4 hrs * 20€ * 50% = 40€
        expect(res.surcout_total).toBe(40);
        expect(res.surcouts_details.length).toBe(1);
        expect(res.surcouts_details[0].surcout_op).toBe(40);
        expect(res.cout_total_final).toBe(240);
        expect(res.prix_piece_final).toBeCloseTo(0.24, 4); // 240 / 1000
        expect(res.delta_piece).toBeCloseTo(0.04, 4);
    });

    it('3) cariste par jour => heures_cariste_total ok', () => {
        const inputs = {
            ...defaultInputs,
            // 10 operator hours = 1.25 days (8h/day)
            h_cariste: 2, // 2 hours of cariste per DAY
            cariste_mode: 'par_jour' as const,
            majorations: []
        };

        const res = calculateMajorations(inputs);
        // 1.25 days * 2 hrs/day = 2.5 hrs cariste total.
        expect(res.jours_total).toBe(1.25);
        expect(res.heures_cariste_total).toBe(2.5);
        // Cariste cost = 2.5 * 25€ = 62.5€
        expect(res.cout_cariste_base).toBe(62.5);
        // Total base = 200 + 62.5 = 262.5
        expect(res.cout_base_total).toBe(262.5);
    });

    it('4) cariste + majorations (apply_to_cariste: true) => should scale', () => {
        const inputs = {
            ...defaultInputs,
            q_total: 1000,
            cadence_brut: 100, // 10h total
            h_cariste: 10,   // cariste total
            cariste_mode: 'total' as const,
            majorations: [
                {
                    type: 'dimanche' as const,
                    label: 'Dimanche',
                    hours: 10,
                    rate_pct: 100, // 100% bonus
                    apply_to_cariste: true
                }
            ]
        };
        const res = calculateMajorations(inputs);

        // base op = 200
        // base cariste = 10 * 25 = 250
        // base total = 450

        // surcout op = 10 * 20 * 1 = 200
        // surcout cariste = 10 * 25 * 1 = 250
        // surcout total = 450

        expect(res.cout_base_total).toBe(450);
        expect(res.surcout_total).toBe(450);
        expect(res.cout_total_final).toBe(900);
    });
});
