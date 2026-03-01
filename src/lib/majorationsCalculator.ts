export type MajorationType = 'nuit' | 'hs25' | 'hs50' | 'samedi' | 'dimanche' | 'ferie';

export interface MajorationInput {
    type: MajorationType;
    label: string;
    hours: number;
    rate_pct: number;
    apply_to_cariste: boolean;
}

export interface CalculationInputs {
    // Production
    q_total: number;
    cadence_brut: number;
    prod_pct: number; // 0-100
    h_par_jour: number;

    // Costs
    rate_op: number;
    rate_cariste: number;
    h_cariste: number;
    cariste_mode: 'total' | 'par_jour';

    // Majorations
    majorations: MajorationInput[];
}

export interface CalculationResults {
    // Base
    cadence_nette: number;
    heures_total_op: number;
    jours_total: number;

    heures_cariste_total: number;
    cout_op_base: number;
    cout_cariste_base: number;
    cout_base_total: number;
    prix_piece_base: number;

    // Surcouts
    surcouts_details: {
        type: MajorationType;
        label: string;
        hours: number;
        surcout_op: number;
        surcout_cariste: number;
        surcout_total: number;
    }[];
    surcout_total: number;

    // Final
    cout_total_final: number;
    prix_piece_final: number;
    delta_piece: number;
}

export function calculateMajorations(inputs: CalculationInputs): CalculationResults {
    // Validations
    if (inputs.q_total <= 0) throw new Error("Quantité de pièces doit être > 0");
    if (inputs.cadence_brut <= 0) throw new Error("Cadence brute doit être > 0");
    if (inputs.h_par_jour <= 0) throw new Error("Heures par jour doit être > 0");
    if (inputs.prod_pct < 0 || inputs.prod_pct > 100) throw new Error("Productivité doit être entre 0 et 100%");
    if (inputs.rate_op <= 0) throw new Error("Taux horaire opérateur doit être > 0");
    if (inputs.rate_cariste < 0) throw new Error("Taux horaire cariste ne peut pas être négatif");
    if (inputs.h_cariste < 0) throw new Error("Heures cariste ne peut pas être négatif");

    const prod_ratio = inputs.prod_pct / 100;
    const cadence_nette = inputs.cadence_brut * prod_ratio;
    const heures_total_op = inputs.q_total / cadence_nette;
    const jours_total = heures_total_op / inputs.h_par_jour;

    const cout_op_base = heures_total_op * inputs.rate_op;

    const heures_cariste_total = inputs.cariste_mode === 'total'
        ? inputs.h_cariste
        : inputs.h_cariste * jours_total;

    const cout_cariste_base = heures_cariste_total * inputs.rate_cariste;

    const cout_base_total = cout_op_base + cout_cariste_base;
    const prix_piece_base = cout_base_total / inputs.q_total;

    let surcout_total = 0;
    const surcouts_details = [];

    for (const maj of inputs.majorations) {
        if (maj.hours <= 0) continue;

        const rate_ratio = maj.rate_pct / 100;
        const surcout_op = maj.hours * inputs.rate_op * rate_ratio;
        const surcout_cariste = maj.apply_to_cariste ? (maj.hours * inputs.rate_cariste * rate_ratio) : 0;

        const surcout_X = surcout_op + surcout_cariste;
        surcout_total += surcout_X;

        surcouts_details.push({
            type: maj.type,
            label: maj.label,
            hours: maj.hours,
            surcout_op,
            surcout_cariste,
            surcout_total: surcout_X
        });
    }

    const cout_total_final = cout_base_total + surcout_total;
    const prix_piece_final = cout_total_final / inputs.q_total;
    const delta_piece = prix_piece_final - prix_piece_base;

    return {
        cadence_nette,
        heures_total_op,
        jours_total,
        heures_cariste_total,
        cout_op_base,
        cout_cariste_base,
        cout_base_total,
        prix_piece_base,
        surcouts_details,
        surcout_total,
        cout_total_final,
        prix_piece_final,
        delta_piece
    };
}
