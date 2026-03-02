/// <reference lib="webworker" />

import { calculateFinanceProject, FinanceProjectInput } from '../lib/financeCalculator';
import { calculateMajorations, CalculationInputs } from '../lib/majorationsCalculator';

self.onmessage = (e: MessageEvent) => {
    const { type, payload, id } = e.data;

    try {
        if (type === 'CALCULATE_FINANCE') {
            const result = calculateFinanceProject(payload as FinanceProjectInput);
            self.postMessage({ id, result, error: null });
        } else if (type === 'CALCULATE_MAJORATIONS') {
            const result = calculateMajorations(payload as CalculationInputs);
            self.postMessage({ id, result, error: null });
        } else {
            self.postMessage({ id, result: null, error: `Unknown calculation type: ${type}` });
        }
    } catch (err: any) {
        self.postMessage({ id, result: null, error: err.message || 'Unknown error in worker' });
    }
};
