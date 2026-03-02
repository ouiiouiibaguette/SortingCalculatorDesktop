import { FinanceProjectInput, FinanceResults } from './financeCalculator';
import { CalculationInputs, CalculationResults } from './majorationsCalculator';

const worker = new Worker(new URL('../workers/calculator.worker.ts', import.meta.url), {
    type: 'module'
});

let messageId = 0;
const pendingResolvers = new Map<number, { resolve: (val: any) => void, reject: (err: any) => void }>();

worker.onmessage = (e: MessageEvent) => {
    const { id, result, error } = e.data;
    const resolver = pendingResolvers.get(id);
    if (resolver) {
        if (error) {
            resolver.reject(new Error(error));
        } else {
            resolver.resolve(result);
        }
        pendingResolvers.delete(id);
    }
};

export function calculateFinanceProjectAsync(input: FinanceProjectInput): Promise<FinanceResults> {
    const id = messageId++;
    return new Promise((resolve, reject) => {
        pendingResolvers.set(id, { resolve, reject });
        worker.postMessage({ type: 'CALCULATE_FINANCE', payload: input, id });
    });
}

export function calculateMajorationsAsync(input: CalculationInputs): Promise<CalculationResults> {
    const id = messageId++;
    return new Promise((resolve, reject) => {
        pendingResolvers.set(id, { resolve, reject });
        worker.postMessage({ type: 'CALCULATE_MAJORATIONS', payload: input, id });
    });
}
