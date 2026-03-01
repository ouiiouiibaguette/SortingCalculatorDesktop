import Database from "@tauri-apps/plugin-sql";

export const isDesktop = '__TAURI_INTERNALS__' in window;

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

let memoryDb = {
    customers: [] as Customer[],
    offers: [] as Offer[],
    sorting_logs: [] as SortingLog[],
    settings: [] as Setting[],
    finance_projects: [] as FinanceProject[],
    finance_premiums: [] as FinancePremium[],
    finance_groups: [] as FinanceScenarioGroup[]
};

export function exportMemoryDbToJson(): string {
    return JSON.stringify(memoryDb, null, 2);
}

export function importMemoryDbFromJson(jsonString: string): boolean {
    try {
        const parsed = JSON.parse(jsonString);
        if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.offers)) {
            memoryDb.customers = parsed.customers || [];
            memoryDb.offers = parsed.offers || [];
            memoryDb.sorting_logs = parsed.sorting_logs || [];
            memoryDb.settings = parsed.settings || [];
            memoryDb.finance_projects = parsed.finance_projects || [];
            memoryDb.finance_premiums = parsed.finance_premiums || [];
            memoryDb.finance_groups = parsed.finance_groups || [];
            return true;
        }
        return false;
    } catch (err) {
        console.error("Failed to parse DB JSON", err);
        return false;
    }
}

// --- Tauri (Desktop) Database ---
let desktopDbInstance: Database | null = null;

export async function getDb(): Promise<Database | null> {
    if (!isDesktop) return null;
    if (!desktopDbInstance) {
        desktopDbInstance = await Database.load("sqlite:sorting.db");
        await initializeDesktopDefaults(desktopDbInstance);
        await seedDesktopDataIfEmpty(desktopDbInstance);
    }
    return desktopDbInstance;
}

// --- Initialization ---

async function initializeDesktopDefaults(db: Database) {
    const settings: Setting[] = await db.select("SELECT * FROM settings WHERE id = $1", ["main"]);
    if (settings.length === 0) {
        await db.execute(
            `INSERT INTO settings (id, locale, alerts_enabled, email_subject_template, email_body_template, export_default_format) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ["main", "fr-FR", 1, "Rapport de tri: {{project_number}} - {{reference}}",
                "Bonjour,\n\nVeuillez trouver ci-joint le rapport de tri pour la référence {{reference}}.\n\nCordialement,", "xlsx"]
        );
    }
    await db.execute(`
        CREATE TABLE IF NOT EXISTS finance_scenario_groups (
            id TEXT PRIMARY KEY, 
            name TEXT, 
            created_at TEXT NOT NULL
        )`);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS finance_projects (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            status TEXT DEFAULT 'saved',
            scenario_group_id TEXT,
            title TEXT,
            client_name TEXT,
            part_reference TEXT,
            site_name TEXT,
            
            qty_total INTEGER NOT NULL,
            cadence_brute_per_h REAL NOT NULL,
            productivity_pct REAL NOT NULL,
            hours_per_day REAL NOT NULL,
            operators_count INTEGER NOT NULL DEFAULT 1,
            cadence_scope TEXT DEFAULT 'per_operator',
            
            operator_rate_per_h REAL NOT NULL,
            cariste_rate_per_h REAL NOT NULL DEFAULT 0,
            cariste_hours REAL NOT NULL DEFAULT 0,
            cariste_mode TEXT DEFAULT 'total_project',
            
            overhead_pct REAL NOT NULL DEFAULT 0,
            target_margin_pct REAL NOT NULL DEFAULT 0,
            billing_mode TEXT DEFAULT 'per_piece',
            billing_price_per_piece REAL,
            billing_price_total REAL,
            
            cadence_nette_per_h REAL NOT NULL,
            total_hours REAL NOT NULL,
            total_days REAL NOT NULL,
            labor_cost REAL NOT NULL,
            majorations_cost REAL NOT NULL,
            cariste_cost REAL NOT NULL,
            overhead_cost REAL NOT NULL,
            total_cost_full REAL NOT NULL,
            cost_per_piece REAL NOT NULL,
            price_per_piece_suggested REAL NOT NULL,
            margin_eur REAL NOT NULL,
            margin_pct REAL NOT NULL,
            risk_score INTEGER NOT NULL DEFAULT 0,
            risk_level TEXT DEFAULT 'low',
            
            FOREIGN KEY(scenario_group_id) REFERENCES finance_scenario_groups(id) ON DELETE SET NULL
        )`);

    await db.execute(`
        CREATE TABLE IF NOT EXISTS finance_premiums (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            type TEXT NOT NULL,
            hours REAL NOT NULL DEFAULT 0,
            pct REAL NOT NULL,
            base TEXT DEFAULT 'operator_only',
            cost REAL NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES finance_projects(id) ON DELETE CASCADE
        )`);
}

async function seedDesktopDataIfEmpty(db: Database) {
    const customers = await db.select("SELECT id FROM customers LIMIT 1");
    if ((customers as any[]).length === 0) {
        const cust1 = crypto.randomUUID();
        const cust2 = crypto.randomUUID();
        await db.execute("INSERT INTO customers (id, name, email) VALUES ($1, $2, $3)", [cust1, "Stellantis", "contact@stellantis.com"]);
        await db.execute("INSERT INTO customers (id, name, email) VALUES ($1, $2, $3)", [cust2, "Renault", "vendor@renault.fr"]);

        const offer1 = crypto.randomUUID();
        await db.execute(
            `INSERT INTO offers (id, customer_id, project_number, designation, reference, cadence_per_hour, price_per_piece, quantity_offer, alert_threshold, quantity_in_stock, is_archived) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0)`,
            [offer1, cust1, "PRJ-2023-A", "Pare-chocs AV", "REF-8493", 150, 0.45, 5000, 500, 5000]
        );

        const offer2 = crypto.randomUUID();
        await db.execute(
            `INSERT INTO offers (id, customer_id, project_number, designation, reference, cadence_per_hour, price_per_piece, quantity_offer, alert_threshold, quantity_in_stock, is_archived) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0)`,
            [offer2, cust2, "RN-X90", "Rétroviseur G", "REF-1122", 200, 0.15, 10000, 1000, 10000]
        );
    }
}

async function seedWebDataIfEmpty() {
    if (isDesktop) return;
    if (memoryDb.customers.length === 0) {
        const cust1 = crypto.randomUUID();
        const cust2 = crypto.randomUUID();
        memoryDb.customers.push(
            { id: cust1, name: "Stellantis", email: "contact@stellantis.com", created_at: new Date().toISOString() },
            { id: cust2, name: "Renault", email: "vendor@renault.fr", created_at: new Date().toISOString() }
        );

        memoryDb.offers.push(
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
        );

        memoryDb.settings.push({
            id: "main", locale: "fr-FR", alerts_enabled: true,
            email_subject_template: "Rapport de tri: {{project_number}} - {{reference}}",
            email_body_template: "Bonjour,\n\nVeuillez trouver ci-joint le rapport de tri pour la référence {{reference}}.\n\nCordialement,",
            export_default_format: "xlsx", export_default_folder: null
        });
    }
}

if (!isDesktop) {
    seedWebDataIfEmpty();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const generateId = () => crypto.randomUUID();

export async function getCustomers(): Promise<Customer[]> {
    if (isDesktop) {
        const db = await getDb();
        return db!.select("SELECT * FROM customers ORDER BY name ASC");
    }
    return [...memoryDb.customers].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCustomer(name: string, email: string | null) {
    const id = generateId();
    if (isDesktop) {
        const db = await getDb();
        await db!.execute("INSERT INTO customers (id, name, email) VALUES ($1, $2, $3)", [id, name, email]);
        return;
    }
    memoryDb.customers.push({ id, name, email, created_at: new Date().toISOString() });
}

export async function updateCustomer(id: string, name: string, email: string | null) {
    if (isDesktop) {
        const db = await getDb();
        await db!.execute("UPDATE customers SET name = $1, email = $2 WHERE id = $3", [name, email, id]);
        return;
    }
    const idx = memoryDb.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
        memoryDb.customers[idx] = { ...memoryDb.customers[idx], name, email };
    }
}

export async function deleteCustomer(id: string) {
    if (isDesktop) {
        const db = await getDb();
        await db!.execute("DELETE FROM customers WHERE id = $1", [id]);
        return;
    }
    memoryDb.customers = memoryDb.customers.filter(c => c.id !== id);
}

export async function getOffers(activeOnly = false): Promise<Offer[]> {
    if (isDesktop) {
        const db = await getDb();
        let query = "SELECT * FROM offers";
        if (activeOnly) {
            query += " WHERE is_archived = 0";
        }
        query += " ORDER BY updated_at DESC";
        return db!.select(query);
    }
    let offers = [...memoryDb.offers];
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
    if (isDesktop) {
        const db = await getDb();
        await db!.execute(
            `INSERT INTO offers (
      id, customer_id, project_number, designation, reference, 
      cadence_per_hour, price_per_piece, quantity_offer, alert_threshold, 
      quantity_in_stock
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                id, customer_id, project_number, designation, reference,
                cadence_per_hour, price_per_piece, quantity_offer, alert_threshold,
                quantity_offer
            ]
        );
        return;
    }
    memoryDb.offers.push({
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
    if (isDesktop) {
        const db = await getDb();
        await db!.execute(
            `UPDATE offers SET 
      customer_id = $1, project_number = $2, designation = $3, reference = $4, 
      cadence_per_hour = $5, price_per_piece = $6, quantity_offer = $7, alert_threshold = $8,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $9`,
            [customer_id, project_number, designation, reference, cadence_per_hour, price_per_piece, quantity_offer, alert_threshold, id]
        );
        return;
    }
    const idx = memoryDb.offers.findIndex(o => o.id === id);
    if (idx !== -1) {
        memoryDb.offers[idx] = {
            ...memoryDb.offers[idx],
            customer_id, project_number, designation, reference,
            cadence_per_hour, price_per_piece, quantity_offer, alert_threshold,
            updated_at: new Date().toISOString()
        };
    }
}

export async function deleteOffer(id: string) {
    if (isDesktop) {
        const db = await getDb();
        await db!.execute("DELETE FROM offers WHERE id = $1", [id]);
        return;
    }
    memoryDb.offers = memoryDb.offers.filter(o => o.id !== id);
}

export async function logSortingAndDecrementStock(
    offer: Offer, pieces_sorted: number, date_performed: string
) {
    const logId = generateId();
    const hours_decimal = pieces_sorted / offer.cadence_per_hour;
    const newStock = offer.quantity_in_stock - pieces_sorted;

    if (isDesktop) {
        const db = await getDb();
        await db!.execute(
            `INSERT INTO sorting_logs (
      id, offer_id, customer_id, date_performed, pieces_sorted, cadence_snapshot, hours_decimal
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                logId, offer.id, offer.customer_id, date_performed, pieces_sorted, offer.cadence_per_hour, hours_decimal
            ]
        );

        await db!.execute(
            `UPDATE offers SET quantity_in_stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [newStock, offer.id]
        );
    } else {
        memoryDb.sorting_logs.push({
            id: logId, offer_id: offer.id, customer_id: offer.customer_id,
            date_performed, pieces_sorted, cadence_snapshot: offer.cadence_per_hour,
            hours_decimal, created_at: new Date().toISOString()
        });
        const idx = memoryDb.offers.findIndex(o => o.id === offer.id);
        if (idx !== -1) {
            memoryDb.offers[idx].quantity_in_stock = newStock;
            memoryDb.offers[idx].updated_at = new Date().toISOString();
        }
    }

    return { newStock, hours_decimal };
}

export async function getSettings(): Promise<Setting> {
    if (isDesktop) {
        const db = await getDb();
        let settings: Setting[] = await db!.select("SELECT * FROM settings WHERE id = $1", ["main"]);

        // This block ensures settings are initialized if not found in desktop DB
        if (settings.length === 0) {
            await initializeDesktopDefaults(db!);
            settings = await db!.select("SELECT * FROM settings WHERE id = $1", ["main"]);
        }
        return settings[0];
    }
    let s = memoryDb.settings.find(s => s.id === 'main');
    if (!s) {
        await seedWebDataIfEmpty();
        s = memoryDb.settings.find(s => s.id === 'main');
    }
    return s!;
}

export async function updateSettings(updates: Partial<Setting>) {
    if (isDesktop) {
        const db = await getDb();
        let updateParts = [];
        let values = [];
        let index = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (key !== "id") {
                updateParts.push(`${key} = $${index}`);
                values.push(value);
                index++;
            }
        }

        if (updateParts.length === 0) return;

        values.push("main");
        await db!.execute(
            `UPDATE settings SET ${updateParts.join(", ")} WHERE id = $${index}`,
            values
        );
        return;
    }
    const idx = memoryDb.settings.findIndex(s => s.id === 'main');
    if (idx !== -1) {
        memoryDb.settings[idx] = { ...memoryDb.settings[idx], ...updates };
    }
}

// --- New Abstracted Methods ---
export async function getRecentLogs(limit = 5): Promise<{ id: string, date: string, pieces: number, hours: number, designation?: string, project_number?: string, reference?: string }[]> {
    if (isDesktop) {
        const db = await getDb();
        const result: any[] = await db!.select(`
            SELECT l.id, l.date_performed as date, l.pieces_sorted as pieces, l.hours_decimal as hours,
                   o.designation, o.project_number, o.reference
            FROM sorting_logs l
            LEFT JOIN offers o ON l.offer_id = o.id
            ORDER BY l.created_at DESC
            LIMIT $1
        `, [limit]);
        return result;
    }

    // Sort memory logs by created_at descending
    const sortedLogs = [...memoryDb.sorting_logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const sliced = sortedLogs.slice(0, limit);

    return sliced.map(log => {
        const offer = memoryDb.offers.find(o => o.id === log.offer_id);
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
    if (isDesktop) {
        const db = await getDb();
        const result: (SortingLog & { reference: string, customer_name?: string })[] = await db!.select(`
            SELECT l.*, o.reference, c.name as customer_name
            FROM sorting_logs l
            JOIN offers o ON l.offer_id = o.id
            LEFT JOIN customers c ON l.customer_id = c.id
            ORDER BY l.created_at DESC
            LIMIT $1
        `, [limit]);
        return result;
    }

    const sortedLogs = [...memoryDb.sorting_logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const sliced = sortedLogs.slice(0, limit);

    return sliced.map(log => {
        const offer = memoryDb.offers.find(o => o.id === log.offer_id);
        const customer = memoryDb.customers.find(c => c.id === log.customer_id);
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
        { p: "30395057", r: "Z13005308", d: "Conduit bi turbo XFA56", c: 36, q: 1000, rst: 1000, a: 300 },
        { p: "30395053", r: "Z13005310", d: "Conduit Bend XFA568", c: 41, q: 1000, rst: 100, a: 300 },
        { p: "30395053", r: "Z13005311", d: "Conduit Bend XFA568", c: 41, q: 1000, rst: 1000, a: 300 },
        { p: "30395341", r: "Z13004721", d: "XFA 469 Raccor", c: 128, q: 1000, rst: 1000, a: 300 },
        { p: "30397520", r: "Z12017091", d: "Capsule moteur XEM", c: 180, q: 1000, rst: 1000, a: 300 },
        { p: "30396497", r: "Z16006865", d: "Tube EGR 4572pcs", c: 80, q: 1000, rst: 1000, a: 0 },
        { p: "30395337", r: "Z13005246", d: "CP3", c: 32, q: 1000, rst: 1000, a: 0 },
        { p: "30395336", r: "Z13004280", d: "Répartiteur B38T42", c: 30, q: 1000, rst: 1000, a: 0 },
        { p: "30395052", r: "Z13004758", d: "Conduit Entrée Turbo", c: 24, q: 1000, rst: 1000, a: 0 },
        { p: "30395052", r: "Z13004842", d: "Conduit Entrée Turbo", c: 24, q: 1000, rst: 1000, a: 0 },
        { p: "30395045", r: "Z13004759", d: "Conduit Bend XFA521", c: 24, q: 1000, rst: 1000, a: 0 },
        { p: "30394896", r: "Z130005135", d: "Blowby Cover XC13", c: 235, q: 1000, rst: 1000, a: 0 },
        { p: "30394890", r: "Z13004322", d: "XEM 135", c: 24, q: 1000, rst: 1000, a: 0 },
        { p: "30394732", r: "Z13004602", d: "XEM 126 Retouche", c: 18, q: 1000, rst: 100, a: 360 },
        { p: "30397521", r: "FZ13004323", d: "XEM 127 Firewall", c: 100, q: 1000, rst: 1000, a: 0 },
        { p: "30394706", r: "RZ13004323", d: "XEM 127 Retouche", c: 24, q: 1000, rst: 1000, a: 0 },
        { p: "30394892", r: "N/A", d: "XEM 129 Retouche", c: 24, q: 1000, rst: 1000, a: 0 },
        { p: "N/A", r: "Z13005515", d: "SPIDER HAHN", c: 224, q: 1000, rst: 1000, a: 0 },
        { p: "N/A", r: "Y2640", d: "COND. K", c: 50, q: 1000, rst: 1000, a: 0 },
        { p: "N/A", r: "z13003538", d: "REPARTI", c: 50, q: 1000, rst: 1000, a: 0 },
        { p: "30396222", r: "Z16007325", d: "XEM 126 CORP ALU", c: 50, q: 1000, rst: 1000, a: 0 },
    ];

    let custId = "";
    const customers = await getCustomers();
    const excelClient = customers.find(c => c.name === "Client Excel");

    if (excelClient) { custId = excelClient.id; }
    else { custId = generateId(); await createCustomer("Client Excel", null); }

    const existingOffers = await getOffers(false);
    if (existingOffers.some(o => o.reference === "Z13005309")) return;

    for (const row of rawData) {
        await createOffer(custId, row.p, row.d, row.r, row.c, 0.1, row.q, row.a);
    }
}

// --- Finance DB Operations ---

export async function saveFinanceProject(project: FinanceProject, premiums: FinancePremium[]) {
    // Delete if already exists (update scenario)
    if (isDesktop) {
        const db = await getDb();
        await db!.execute("DELETE FROM finance_projects WHERE id = $1", [project.id]);

        await db!.execute(`
            INSERT INTO finance_projects (
                id, created_at, updated_at, status, scenario_group_id, title, client_name, part_reference, site_name,
                qty_total, cadence_brute_per_h, productivity_pct, hours_per_day, operators_count, cadence_scope,
                operator_rate_per_h, cariste_rate_per_h, cariste_hours, cariste_mode,
                overhead_pct, target_margin_pct, billing_mode, billing_price_per_piece, billing_price_total,
                cadence_nette_per_h, total_hours, total_days, labor_cost, majorations_cost, cariste_cost, overhead_cost,
                total_cost_full, cost_per_piece, price_per_piece_suggested, margin_eur, margin_pct, risk_score, risk_level
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19,
                $20, $21, $22, $23, $24,
                $25, $26, $27, $28, $29, $30, $31,
                $32, $33, $34, $35, $36, $37, $38
            )`,
            [
                project.id, project.created_at, project.updated_at, project.status, project.scenario_group_id, project.title, project.client_name, project.part_reference, project.site_name,
                project.qty_total, project.cadence_brute_per_h, project.productivity_pct, project.hours_per_day, project.operators_count, project.cadence_scope,
                project.operator_rate_per_h, project.cariste_rate_per_h, project.cariste_hours, project.cariste_mode,
                project.overhead_pct, project.target_margin_pct, project.billing_mode, project.billing_price_per_piece, project.billing_price_total,
                project.cadence_nette_per_h, project.total_hours, project.total_days, project.labor_cost, project.majorations_cost, project.cariste_cost, project.overhead_cost,
                project.total_cost_full, project.cost_per_piece, project.price_per_piece_suggested, project.margin_eur, project.margin_pct, project.risk_score, project.risk_level
            ]
        );

        for (const p of premiums) {
            await db!.execute(`
                INSERT INTO finance_premiums (id, project_id, type, hours, pct, base, cost, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [p.id, project.id, p.type, p.hours, p.pct, p.base, p.cost, p.created_at]);
        }
        return;
    }

    // Memory DB logic
    memoryDb.finance_projects = memoryDb.finance_projects.filter(p => p.id !== project.id);
    memoryDb.finance_premiums = memoryDb.finance_premiums.filter(p => p.project_id !== project.id);

    memoryDb.finance_projects.push({ ...project });
    memoryDb.finance_premiums.push(...premiums.map(p => ({ ...p })));
}

export async function getFinanceProjects(): Promise<FinanceProject[]> {
    if (isDesktop) {
        const db = await getDb();
        return db!.select("SELECT * FROM finance_projects ORDER BY updated_at DESC");
    }
    return [...memoryDb.finance_projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function getFinanceProjectById(id: string): Promise<{ project: FinanceProject, premiums: FinancePremium[] } | null> {
    if (isDesktop) {
        const db = await getDb();
        const projects: FinanceProject[] = await db!.select("SELECT * FROM finance_projects WHERE id = $1", [id]);
        if (projects.length === 0) return null;

        const premiums: FinancePremium[] = await db!.select("SELECT * FROM finance_premiums WHERE project_id = $1", [id]);

        return { project: projects[0], premiums };
    }

    const project = memoryDb.finance_projects.find(p => p.id === id);
    if (!project) return null;
    const premiums = memoryDb.finance_premiums.filter(p => p.project_id === id);
    return { project: { ...project }, premiums: premiums.map(p => ({ ...p })) };
}

export async function deleteFinanceProject(id: string) {
    if (isDesktop) {
        const db = await getDb();
        await db!.execute("DELETE FROM finance_projects WHERE id = $1", [id]);
        // Corresponding premiums deleted via ON DELETE CASCADE (or just orphaned if memory, let's delete them)
        return;
    }
    memoryDb.finance_projects = memoryDb.finance_projects.filter(p => p.id !== id);
    memoryDb.finance_premiums = memoryDb.finance_premiums.filter(p => p.project_id !== id);
}
