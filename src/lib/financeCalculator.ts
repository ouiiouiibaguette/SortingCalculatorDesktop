export type CadenceScope = 'per_operator' | 'global';
export type CaristeMode = 'total_project' | 'per_day' | 'per_operator';
export type PremiumBase = 'operator_only' | 'operator_and_cariste';
export type BillingMode = 'per_piece' | 'hourly';

export interface FinancePremiumInput {
    id: string;
    type: string;
    hours: number;
    pct: number;
    base: PremiumBase;
}

export interface FinanceProjectInput {
    qty_total: number;
    cadence_brute_per_h: number;
    productivity_pct: number;
    hours_per_day: number;
    operators_count: number;
    cadence_scope: CadenceScope;

    operator_rate_per_h: number;
    cariste_rate_per_h: number;
    cariste_hours: number;
    cariste_mode: CaristeMode;

    overhead_pct: number;
    target_margin_pct: number;
    billing_mode: BillingMode;
    billing_price_per_piece: number | null;
    billing_price_total: number | null;

    allow_premium_overlap: boolean;
    premiums: FinancePremiumInput[];
}

export interface FinanceResults {
    cadence_nette_per_h: number;
    total_hours: number;
    total_days: number;
    labor_cost: number;
    majorations_cost: number;
    cariste_cost: number;
    overhead_cost: number;
    total_cost_full: number;
    cost_per_piece: number;
    price_per_piece_suggested: number;
    margin_eur: number;
    margin_pct: number;
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high';

    // Detailed output needed for db saving
    premiums_calculated: (FinancePremiumInput & { cost: number })[];

    // Sensitivity
    sensitivity: { productivity: number; cost_per_piece: number; margin_pct: number; total_cost: number }[];
}

export function calculateFinanceProject(input: FinanceProjectInput): FinanceResults {
    if (input.qty_total <= 0 || input.cadence_brute_per_h <= 0 || input.hours_per_day <= 0 || input.operators_count <= 0) {
        throw new Error("Invalid base inputs (qty, cadence, hours/day or operators > 0 required).");
    }

    // 1. Production timings
    const cadence_nette_per_h = input.cadence_brute_per_h * (input.productivity_pct / 100);
    if (cadence_nette_per_h === 0) throw new Error("Cadence nette cannot be zero.");

    const total_global_hours = input.qty_total / cadence_nette_per_h;
    const total_days = total_global_hours / input.hours_per_day;

    let total_labor_hours = total_global_hours;
    if (input.cadence_scope === 'per_operator') {
        total_labor_hours = total_global_hours * input.operators_count;
    }

    // 2. Direct Costs
    const labor_cost = total_labor_hours * input.operator_rate_per_h;

    let cariste_total_hours = input.cariste_hours;
    if (input.cariste_mode === 'per_day') {
        cariste_total_hours = input.cariste_hours * total_days;
    } else if (input.cariste_mode === 'per_operator') {
        cariste_total_hours = input.cariste_hours * input.operators_count;
    }
    const cariste_cost = cariste_total_hours * input.cariste_rate_per_h;

    // 3. Premiums (Majorations)
    let majorations_cost = 0;
    let total_premium_hours_sum = 0;

    const premiums_calculated = input.premiums.map(p => {
        const op_mult = input.cadence_scope === 'per_operator' ? input.operators_count : 1;

        let base_rate = input.operator_rate_per_h;
        if (p.base === 'operator_and_cariste') {
            base_rate = input.operator_rate_per_h + input.cariste_rate_per_h;
        }

        const cost = p.hours * op_mult * base_rate * (p.pct / 100);
        majorations_cost += cost;
        total_premium_hours_sum += p.hours * op_mult;

        return { ...p, cost };
    });

    if (!input.allow_premium_overlap && total_premium_hours_sum > total_labor_hours + 0.01) {
        throw new Error(`Total premium hours (${total_premium_hours_sum}) cannot exceed total labor hours (${total_labor_hours}) without overlap allowed.`);
    }

    // 4. Overhead & Total
    const overhead_cost = (labor_cost + majorations_cost + cariste_cost) * (input.overhead_pct / 100);
    const total_cost_full = labor_cost + majorations_cost + cariste_cost + overhead_cost;
    const cost_per_piece = total_cost_full / input.qty_total;

    // 5. Margin & Pricing
    const price_per_piece_suggested = cost_per_piece * (1 + input.target_margin_pct / 100);

    let margin_eur = 0;
    let margin_pct_actual = 0;

    if (input.billing_mode === 'per_piece' && input.billing_price_per_piece !== null) {
        margin_eur = (input.billing_price_per_piece - cost_per_piece) * input.qty_total;
        margin_pct_actual = input.billing_price_per_piece > 0 ? (margin_eur / (input.billing_price_per_piece * input.qty_total)) * 100 : 0;
    } else if (input.billing_mode === 'hourly' && input.billing_price_total !== null) {
        margin_eur = input.billing_price_total - total_cost_full;
        margin_pct_actual = input.billing_price_total > 0 ? (margin_eur / input.billing_price_total) * 100 : 0;
    } else {
        // Fallback to target pricing if no actual billing set
        margin_eur = (price_per_piece_suggested - cost_per_piece) * input.qty_total;
        margin_pct_actual = input.target_margin_pct;
    }

    // 6. Risk Scoring
    let risk_score = 0;
    if (input.productivity_pct < 80) risk_score += 35;
    else if (input.productivity_pct < 90) risk_score += 20;

    if (labor_cost > 0) {
        const prem_ratio = majorations_cost / labor_cost;
        if (prem_ratio > 0.4) risk_score += 35;
        else if (prem_ratio > 0.25) risk_score += 20;
    }

    if (total_days > 10) risk_score += 20;
    else if (total_days > 5) risk_score += 10;

    if (input.operators_count > 6) risk_score += 10;

    let risk_level: 'low' | 'medium' | 'high' = 'low';
    if (risk_score >= 60) risk_level = 'high';
    else if (risk_score >= 30) risk_level = 'medium';

    const results: FinanceResults = {
        cadence_nette_per_h,
        total_hours: total_global_hours,
        total_days,
        labor_cost,
        majorations_cost,
        cariste_cost,
        overhead_cost,
        total_cost_full,
        cost_per_piece,
        price_per_piece_suggested,
        margin_eur,
        margin_pct: margin_pct_actual,
        risk_score,
        risk_level,
        premiums_calculated,
        sensitivity: [] // filled below
    };

    // Integration of sensitivity directly
    const sensitivity = generateSensitivity(input);
    results.sensitivity = sensitivity;

    return results;
}

export function generateSensitivity(input: FinanceProjectInput): { productivity: number; cost_per_piece: number; margin_pct: number; total_cost: number }[] {
    const levels = [100, 95, 90, 85];
    const rawData = [];

    for (const prod of levels) {
        try {
            // Overridden productivity
            const simInput = { ...input, productivity_pct: prod, allow_premium_overlap: true };

            // Skip sensitivity recursion!
            const simRes = calculateFinanceProjectBase(simInput);
            rawData.push({
                productivity: prod,
                cost_per_piece: simRes.cost_per_piece,
                margin_pct: simRes.margin_pct,
                total_cost: simRes.total_cost_full
            });
        } catch (e) {
            // Ignore
        }
    }
    return rawData;
}

// Split the pure math from the sensitivity generation to avoid infinite recursion
function calculateFinanceProjectBase(input: FinanceProjectInput): Omit<FinanceResults, 'sensitivity'> {
    if (input.qty_total <= 0 || input.cadence_brute_per_h <= 0 || input.hours_per_day <= 0 || input.operators_count <= 0) {
        throw new Error("Invalid base inputs (qty, cadence, hours/day or operators > 0 required).");
    }

    const cadence_nette_per_h = input.cadence_brute_per_h * (input.productivity_pct / 100);
    if (cadence_nette_per_h === 0) throw new Error("Cadence nette cannot be zero.");
    const total_global_hours = input.qty_total / cadence_nette_per_h;
    const total_days = total_global_hours / input.hours_per_day;

    let total_labor_hours = total_global_hours;
    if (input.cadence_scope === 'per_operator') {
        total_labor_hours = total_global_hours * input.operators_count;
    }

    const labor_cost = total_labor_hours * input.operator_rate_per_h;

    let cariste_total_hours = input.cariste_hours;
    if (input.cariste_mode === 'per_day') {
        cariste_total_hours = input.cariste_hours * total_days;
    } else if (input.cariste_mode === 'per_operator') {
        cariste_total_hours = input.cariste_hours * input.operators_count;
    }
    const cariste_cost = cariste_total_hours * input.cariste_rate_per_h;

    let majorations_cost = 0;
    let total_premium_hours_sum = 0;

    const premiums_calculated = input.premiums.map(p => {
        const op_mult = input.cadence_scope === 'per_operator' ? input.operators_count : 1;
        let base_rate = input.operator_rate_per_h;
        if (p.base === 'operator_and_cariste') {
            base_rate = input.operator_rate_per_h + input.cariste_rate_per_h;
        }
        const cost = p.hours * op_mult * base_rate * (p.pct / 100);
        majorations_cost += cost;
        total_premium_hours_sum += p.hours * op_mult;
        return { ...p, cost };
    });

    if (!input.allow_premium_overlap && total_premium_hours_sum > total_labor_hours + 0.01) {
        throw new Error(`Total premium hours (${total_premium_hours_sum}) cannot exceed total labor hours (${total_labor_hours}) without overlap allowed.`);
    }

    const overhead_cost = (labor_cost + majorations_cost + cariste_cost) * (input.overhead_pct / 100);
    const total_cost_full = labor_cost + majorations_cost + cariste_cost + overhead_cost;
    const cost_per_piece = total_cost_full / input.qty_total;

    const price_per_piece_suggested = cost_per_piece * (1 + input.target_margin_pct / 100);

    let margin_eur = 0;
    let margin_pct_actual = 0;

    if (input.billing_mode === 'per_piece' && input.billing_price_per_piece !== null) {
        margin_eur = (input.billing_price_per_piece - cost_per_piece) * input.qty_total;
        margin_pct_actual = input.billing_price_per_piece > 0 ? (margin_eur / (input.billing_price_per_piece * input.qty_total)) * 100 : 0;
    } else if (input.billing_mode === 'hourly' && input.billing_price_total !== null) {
        margin_eur = input.billing_price_total - total_cost_full;
        margin_pct_actual = input.billing_price_total > 0 ? (margin_eur / input.billing_price_total) * 100 : 0;
    } else {
        margin_eur = (price_per_piece_suggested - cost_per_piece) * input.qty_total;
        margin_pct_actual = input.target_margin_pct;
    }

    let risk_score = 0;
    if (input.productivity_pct < 80) risk_score += 35;
    else if (input.productivity_pct < 90) risk_score += 20;

    if (labor_cost > 0) {
        const prem_ratio = majorations_cost / labor_cost;
        if (prem_ratio > 0.4) risk_score += 35;
        else if (prem_ratio > 0.25) risk_score += 20;
    }
    if (total_days > 10) risk_score += 20;
    else if (total_days > 5) risk_score += 10;
    if (input.operators_count > 6) risk_score += 10;

    let risk_level: 'low' | 'medium' | 'high' = 'low';
    if (risk_score >= 60) risk_level = 'high';
    else if (risk_score >= 30) risk_level = 'medium';

    return {
        cadence_nette_per_h, total_hours: total_global_hours, total_days, labor_cost, majorations_cost,
        cariste_cost, overhead_cost, total_cost_full, cost_per_piece, price_per_piece_suggested,
        margin_eur, margin_pct: margin_pct_actual, risk_score, risk_level, premiums_calculated
    };
}
