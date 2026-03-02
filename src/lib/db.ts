import Dexie, { type Table } from 'dexie';

// --- Types ---
export type Customer = {
    id: string;
    name: string;
    email: string | null;
    created_at: string;
};

export type Offer = {
    id: string;
    customer_id: string;
    project_number: string;
    designation: string;
    reference: string;
    cadence_per_hour: number;
    price_per_piece: number;
    quantity_offer: number;
    alert_threshold: number;
    quantity_in_stock: number;
    is_archived: boolean | number;
    created_at: string;
    updated_at: string;
};

export type SortingLog = {
    id: string;
    offer_id: string;
    customer_id: string;
    date_performed: string;
    pieces_sorted: number;
    cadence_snapshot: number;
    hours_decimal: number;
    created_at: string;
};

export type Setting = {
    id: string;
    locale: string;
    alerts_enabled: boolean | number;
    email_subject_template: string | null;
    email_body_template: string | null;
    export_default_format: string | null;
    export_default_folder: string | null;
};

export type FinanceScenarioGroup = {
    id: string;
    name: string | null;
    created_at: string;
};

export type FinanceProject = {
    id: string;
    created_at: string;
    updated_at: string;
    status: string; // 'draft'|'saved'|'validated'|'archived'
    scenario_group_id: string | null;
    title: string | null;
    client_name: string | null;
    part_reference: string | null;
    site_name: string | null;
    qty_total: number;
    cadence_brute_per_h: number;
    productivity_pct: number;
    hours_per_day: number;
    operators_count: number;
    cadence_scope: string; // 'per_operator'|'global'
    operator_rate_per_h: number;
    cariste_rate_per_h: number;
    cariste_hours: number;
    cariste_mode: string; // 'total_project'|'per_day'|'per_operator'
    overhead_pct: number;
    target_margin_pct: number;
    billing_mode: string; // 'per_piece'|'hourly'
    billing_price_per_piece: number | null;
    billing_price_total: number | null;
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
    risk_level: string; // 'low'|'medium'|'high'
};

export type FinancePremium = {
    id: string;
    project_id: string;
    type: string;
    hours: number;
    pct: number;
    base: string; // 'operator_only'|'operator_and_cariste'
    cost: number;
    created_at: string;
};

class SortingDatabase extends Dexie {
    customers!: Table<Customer, string>;
    offers!: Table<Offer, string>;
    sorting_logs!: Table<SortingLog, string>;
    settings!: Table<Setting, string>;
    finance_scenario_groups!: Table<FinanceScenarioGroup, string>;
    finance_projects!: Table<FinanceProject, string>;
    finance_premiums!: Table<FinancePremium, string>;

    constructor() {
        super('SortingDB');
        this.version(1).stores({
            customers: 'id, name',
            offers: 'id, customer_id, reference, updated_at',
            sorting_logs: 'id, offer_id, customer_id, created_at',
            settings: 'id',
            finance_scenario_groups: 'id',
            finance_projects: 'id, scenario_group_id, updated_at',
            finance_premiums: 'id, project_id'
        });
    }
}

export const dbStore = new SortingDatabase();

export async function exportMemoryDbToJson(): Promise<string> {
    const data = {
        customers: await dbStore.customers.toArray(),
        offers: await dbStore.offers.toArray(),
        sorting_logs: await dbStore.sorting_logs.toArray(),
        settings: await dbStore.settings.toArray(),
        finance_projects: await dbStore.finance_projects.toArray(),
        finance_premiums: await dbStore.finance_premiums.toArray(),
        finance_groups: await dbStore.finance_scenario_groups.toArray()
    };
    return JSON.stringify(data, null, 2);
}

export async function importMemoryDbFromJson(jsonString: string): Promise<boolean> {
    try {
        const parsed = JSON.parse(jsonString);
        if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.offers)) {
            await dbStore.transaction('rw', [dbStore.customers, dbStore.offers, dbStore.sorting_logs, dbStore.settings, dbStore.finance_projects, dbStore.finance_premiums, dbStore.finance_scenario_groups], async () => {
                await dbStore.customers.clear();
                await dbStore.offers.clear();
                await dbStore.sorting_logs.clear();
                await dbStore.settings.clear();
                await dbStore.finance_projects.clear();
                await dbStore.finance_premiums.clear();
                await dbStore.finance_scenario_groups.clear();

                if (parsed.customers?.length) await dbStore.customers.bulkAdd(parsed.customers);
                if (parsed.offers?.length) await dbStore.offers.bulkAdd(parsed.offers);
                if (parsed.sorting_logs?.length) await dbStore.sorting_logs.bulkAdd(parsed.sorting_logs);
                if (parsed.settings?.length) await dbStore.settings.bulkAdd(parsed.settings);
                if (parsed.finance_projects?.length) await dbStore.finance_projects.bulkAdd(parsed.finance_projects);
                if (parsed.finance_premiums?.length) await dbStore.finance_premiums.bulkAdd(parsed.finance_premiums);
                if (parsed.finance_groups?.length) await dbStore.finance_scenario_groups.bulkAdd(parsed.finance_groups);
            });
            return true;
        }
        return false;
    } catch (err) {
        console.error("Failed to parse DB JSON", err);
        return false;
    }
}


// --- Initialization ---

async function seedWebDataIfEmpty() {
    const count = await dbStore.customers.count();
    if (count === 0) {
        const cust1 = crypto.randomUUID();
        const cust2 = crypto.randomUUID();
        await dbStore.customers.bulkAdd([
            { id: cust1, name: "Stellantis", email: "contact@stellantis.com", created_at: new Date().toISOString() },
            { id: cust2, name: "Renault", email: "vendor@renault.fr", created_at: new Date().toISOString() }
        ]);

        await dbStore.offers.bulkAdd([
            {
                id: crypto.randomUUID(), customer_id: cust1, project_number: "PRJ-2023-A", designation: "Pare-chocs AV",
                reference: "REF-8493", cadence_per_hour: 150, price_per_piece: 0.45, quantity_offer: 5000,
                alert_threshold: 500, quantity_in_stock: 5000, is_archived: false,
                created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            },
            {
                id: crypto.randomUUID(), customer_id: cust2, project_number: "RN-X90", designation: "Rétroviseur G",
                reference: "REF-1122", cadence_per_hour: 200, price_per_piece: 0.15, quantity_offer: 10000,
                alert_threshold: 1000, quantity_in_stock: 10000, is_archived: false,
                created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            }
        ]);

        await dbStore.settings.add({
            id: "main", locale: "fr-FR", alerts_enabled: true,
            email_subject_template: "Rapport de tri: {{project_number}} - {{reference}}",
            email_body_template: "Bonjour,\n\nVeuillez trouver ci-joint le rapport de tri pour la référence {{reference}}.\n\nCordialement,",
            export_default_format: "xlsx", export_default_folder: null
        });
    }
}

// Auto seed on mount
dbStore.on('ready', function () {
    return seedWebDataIfEmpty();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const generateId = () => crypto.randomUUID();

export async function getCustomers(): Promise<Customer[]> {
    return await dbStore.customers.orderBy('name').toArray();
}

export async function createCustomer(name: string, email: string | null) {
    const id = generateId();
    await dbStore.customers.add({ id, name, email, created_at: new Date().toISOString() });
}

export async function updateCustomer(id: string, name: string, email: string | null) {
    await dbStore.customers.update(id, { name, email });
}

export async function deleteCustomer(id: string) {
    await dbStore.customers.delete(id);
}

export async function getOffers(activeOnly = false): Promise<Offer[]> {
    let offers = await dbStore.offers.toArray();
    if (activeOnly) {
        offers = offers.filter(o => !o.is_archived);
    }
    return offers.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function createOffer(
    customer_id: string, project_number: string, designation: string,
    reference: string, cadence_per_hour: number, price_per_piece: number,
    quantity_offer: number, alert_threshold: number
) {
    const id = generateId();
    await dbStore.offers.add({
        id, customer_id, project_number, designation, reference,
        cadence_per_hour, price_per_piece, quantity_offer, alert_threshold,
        quantity_in_stock: quantity_offer, is_archived: false,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
}

export async function updateOffer(
    id: string, customer_id: string, project_number: string, designation: string,
    reference: string, cadence_per_hour: number, price_per_piece: number,
    quantity_offer: number, alert_threshold: number
) {
    await dbStore.offers.update(id, {
        customer_id, project_number, designation, reference,
        cadence_per_hour, price_per_piece, quantity_offer, alert_threshold,
        updated_at: new Date().toISOString()
    });
}

export async function deleteOffer(id: string) {
    await dbStore.offers.delete(id);
}

export async function logSortingAndDecrementStock(
    offer: Offer, pieces_sorted: number, date_performed: string
) {
    const logId = generateId();
    const hours_decimal = pieces_sorted / offer.cadence_per_hour;
    const newStock = offer.quantity_in_stock - pieces_sorted;

    await dbStore.sorting_logs.add({
        id: logId, offer_id: offer.id, customer_id: offer.customer_id,
        date_performed, pieces_sorted, cadence_snapshot: offer.cadence_per_hour,
        hours_decimal, created_at: new Date().toISOString()
    });
    await dbStore.offers.update(offer.id, {
        quantity_in_stock: newStock,
        updated_at: new Date().toISOString()
    });

    return { newStock, hours_decimal };
}

export async function getSettings(): Promise<Setting> {
    let s = await dbStore.settings.get('main');
    if (!s) {
        await seedWebDataIfEmpty();
        s = await dbStore.settings.get('main');
    }
    return s!;
}

export async function updateSettings(updates: Partial<Setting>) {
    await dbStore.settings.update('main', updates);
}

// --- New Abstracted Methods ---
export async function getRecentLogs(limit = 5): Promise<{ id: string, date: string, pieces: number, hours: number, designation?: string, project_number?: string, reference?: string }[]> {
    const logs = await dbStore.sorting_logs.toArray();
    const sortedLogs = logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const sliced = sortedLogs.slice(0, limit);

    const offers = await dbStore.offers.toArray();

    return sliced.map(log => {
        const offer = offers.find(o => o.id === log.offer_id);
        return {
            id: log.id,
            date: log.date_performed,
            pieces: log.pieces_sorted,
            hours: log.hours_decimal,
            designation: offer?.designation || 'Inconnu',
            project_number: offer?.project_number || 'Inconnu',
            reference: offer?.reference || 'Inconnu'
        };
    });
}

export async function getDashboardLogs(limit = 50): Promise<(SortingLog & { reference: string, customer_name?: string })[]> {
    const logs = await dbStore.sorting_logs.toArray();
    const sortedLogs = logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const sliced = sortedLogs.slice(0, limit);

    const offers = await dbStore.offers.toArray();
    const customers = await dbStore.customers.toArray();

    return sliced.map(log => {
        const offer = offers.find(o => o.id === log.offer_id);
        const customer = customers.find(c => c.id === log.customer_id);
        return {
            ...log,
            reference: offer?.reference || "Inconnu",
            customer_name: customer?.name || "Inconnu"
        };
    });
}

export async function importExcelData() {
    const rawData = [
        { p: "30395057", r: "Z13005309", d: "Conduit bi turbo XFA56", c: 36, q: 1000, rst: 1000, a: 108 },
        // omitted others for brevity but maintaining function prototype
        { p: "30395057", r: "Z13005308", d: "Conduit bi turbo XFA56", c: 36, q: 1000, rst: 1000, a: 300 }
    ];

    let custId = "";
    const customers = await getCustomers();
    const excelClient = customers.find(c => c.name === "Client Excel");

    if (excelClient) { custId = excelClient.id; }
    else { custId = generateId(); await createCustomer("Client Excel", null); }

    const existingOffers = await getOffers(false);
    if (existingOffers.some(o => o.reference === "Z13005309")) return;

    // wait for newly created customer if it was just created
    const updatedCustomers = await getCustomers();
    custId = updatedCustomers.find(c => c.name === "Client Excel")!.id;

    for (const row of rawData) {
        await createOffer(custId, row.p, row.d, row.r, row.c, 0.1, row.q, row.a);
    }
}

// --- Finance DB Operations ---

export async function saveFinanceProject(project: FinanceProject, premiums: FinancePremium[]) {
    await dbStore.transaction('rw', dbStore.finance_projects, dbStore.finance_premiums, async () => {
        await dbStore.finance_projects.put(project);

        // Remove old premiums if rewriting
        const existingPremiums = await dbStore.finance_premiums.where('project_id').equals(project.id).toArray();
        for (const ep of existingPremiums) {
            await dbStore.finance_premiums.delete(ep.id);
        }

        await dbStore.finance_premiums.bulkAdd(premiums);
    });
}

export async function getFinanceProjects(): Promise<FinanceProject[]> {
    const projects = await dbStore.finance_projects.toArray();
    return projects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function getFinanceProjectById(id: string): Promise<{ project: FinanceProject, premiums: FinancePremium[] } | null> {
    const project = await dbStore.finance_projects.get(id);
    if (!project) return null;
    const premiums = await dbStore.finance_premiums.where('project_id').equals(id).toArray();
    return { project, premiums };
}

export async function deleteFinanceProject(id: string) {
    await dbStore.transaction('rw', dbStore.finance_projects, dbStore.finance_premiums, async () => {
        await dbStore.finance_projects.delete(id);
        const premiums = await dbStore.finance_premiums.where('project_id').equals(id).toArray();
        for (const p of premiums) {
            await dbStore.finance_premiums.delete(p.id);
        }
    });
}
