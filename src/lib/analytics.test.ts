import { describe, it, expect } from 'vitest';
import { calculateDashboardAnalytics } from './analytics';

describe('calculateDashboardAnalytics', () => {
    it('handles empty logs missing days filling naturally (0 values)', () => {
        const start = new Date('2026-03-01T00:00:00.000Z');
        const end = new Date('2026-03-07T23:59:59.999Z');

        const result = calculateDashboardAnalytics([], start, end);

        expect(result.metrics.total_hours).toBe(0);
        expect(result.metrics.total_pieces).toBe(0);
        expect(result.metrics.weighted_cadence).toBe(0);
        expect(result.metrics.incomplete_rows_count).toBe(0);

        // Chart should have 7 days
        expect(result.chartData.length).toBe(7);
        expect(result.chartData[0].day).toBe('2026-03-01');
        expect(result.chartData[6].day).toBe('2026-03-07');
    });

    it('calculates totals, weighted cadence, top entities and incomplete counts correctly', () => {
        const start = new Date('2026-03-01T00:00:00.000Z');
        const end = new Date('2026-03-07T23:59:59.999Z');

        const logs = [
            {
                id: '1', offer_id: 'o1', customer_id: 'c1', customer_name: 'Renault',
                reference: 'REF-1', date_performed: '2026-03-02',
                pieces_sorted: 100, cadence_snapshot: 50, hours_decimal: 2, created_at: ''
            },
            {
                id: '2', offer_id: 'o1', customer_id: 'c1', customer_name: 'Renault',
                reference: 'REF-1', date_performed: '2026-03-03',
                pieces_sorted: 250, cadence_snapshot: 50, hours_decimal: 5, created_at: ''
            },
            {
                id: '3', offer_id: 'o2', customer_id: 'c2', customer_name: 'Peugeot',
                reference: 'REF-2', date_performed: '2026-03-02',
                pieces_sorted: 100, cadence_snapshot: 100, hours_decimal: 1, created_at: ''
            },
            {
                id: '4', offer_id: 'o3', customer_id: 'c3', customer_name: 'Inconnu',
                reference: 'Inconnu', date_performed: '2026-03-05', // Missing ref
                pieces_sorted: 50, cadence_snapshot: 50, hours_decimal: 1, created_at: ''
            }
        ];

        const result = calculateDashboardAnalytics(logs, start, end);

        expect(result.metrics.total_hours).toBe(9); // 2 + 5 + 1 + 1
        expect(result.metrics.total_pieces).toBe(500); // 100 + 250 + 100 + 50
        expect(Math.floor(result.metrics.weighted_cadence)).toBe(55); // 500 / 9 = 55.55
        expect(result.metrics.incomplete_rows_count).toBe(1); // One `Inconnu`

        expect(result.metrics.top_reference_by_hours).toBe('REF-1'); // 7 hours
        expect(result.metrics.top_customer_by_hours).toBe('Renault'); // 7 hours

        // Check the table logs injection
        const missingLog = result.tableLogs.find(l => l.id === '4');
        expect(missingLog?.reference).toBe('—');
        expect(missingLog?.is_incomplete).toBe(true);

        const goodLog = result.tableLogs.find(l => l.id === '1');
        expect(goodLog?.reference).toBe('REF-1');
        expect(goodLog?.is_incomplete).toBe(false);
    });

    it('filters out data outside the date range', () => {
        const start = new Date('2026-03-05T00:00:00.000Z');
        const end = new Date('2026-03-07T23:59:59.999Z');

        const logs = [
            {
                id: '1', offer_id: 'o1', customer_id: 'c1', customer_name: 'Renault',
                reference: 'REF-1', date_performed: '2026-03-02', // Out of range!
                pieces_sorted: 100, cadence_snapshot: 50, hours_decimal: 2, created_at: ''
            },
            {
                id: '4', offer_id: 'o3', customer_id: 'c3', customer_name: 'Inconnu',
                reference: 'Inconnu', date_performed: '2026-03-05', // In range
                pieces_sorted: 50, cadence_snapshot: 50, hours_decimal: 1, created_at: ''
            }
        ];

        const result = calculateDashboardAnalytics(logs, start, end);

        expect(result.metrics.total_hours).toBe(1);
        expect(result.chartData.length).toBe(3); // 5th, 6th, 7th
    });
});
