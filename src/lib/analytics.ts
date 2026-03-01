import { SortingLog } from "./db";

export type CopilMetrics = {
    total_hours: number;
    total_pieces: number;
    weighted_cadence: number;
    incomplete_rows_count: number;
    top_customer_by_hours: string | null;
    top_reference_by_hours: string | null;
};

export type ChartDataPoint = {
    day: string;
    hours: number;
    pieces: number;
};

export type DashboardAnalytics = {
    chartData: ChartDataPoint[];
    metrics: CopilMetrics;
    tableLogs: (SortingLog & { reference: string, is_incomplete: boolean })[];
};

/**
 * Normalizes an array of logs, computing derived statistics, filling in missing days,
 * and identifying missing references.
 */
export function calculateDashboardAnalytics(
    logs: (SortingLog & { reference: string, customer_name?: string })[],
    startDate: Date,
    endDate: Date
): DashboardAnalytics {
    let total_hours = 0;
    let total_pieces = 0;
    let incomplete_rows_count = 0;

    const refHours: Record<string, number> = {};
    const customerHours: Record<string, number> = {};
    const agg: Record<string, { hours: number; pieces: number }> = {};

    // 1. Process Logs
    const tableLogs = logs.map(log => {
        const is_incomplete = !log.reference || log.reference === "N/A" || log.reference === "Inconnu";
        const displayRef = is_incomplete ? "—" : log.reference;

        // Count metrics only if it falls in the period (assuming logs are already pre-filtered, but doing safety check)
        const d = new Date(log.date_performed);
        if (d >= startDate && d <= endDate) {
            total_hours += log.hours_decimal;
            total_pieces += log.pieces_sorted;
            if (is_incomplete) incomplete_rows_count++;

            const dayString = log.date_performed;
            if (!agg[dayString]) agg[dayString] = { hours: 0, pieces: 0 };
            agg[dayString].hours += log.hours_decimal;
            agg[dayString].pieces += log.pieces_sorted;

            if (!is_incomplete) {
                refHours[displayRef] = (refHours[displayRef] || 0) + log.hours_decimal;
            }
            if (log.customer_name && typeof log.customer_name === 'string') {
                customerHours[log.customer_name] = (customerHours[log.customer_name] || 0) + log.hours_decimal;
            }
        }

        return { ...log, reference: displayRef, is_incomplete };
    });

    // 2. Generate exactly Last 7 Days (or periods spanning startDate to endDate) array
    const chartData: ChartDataPoint[] = [];
    const currentDate = new Date(startDate);

    // Safety break if difference is huge, but we expect ~7 days or specified period
    let maxDays = 30; // Protect loop
    while (currentDate <= endDate && maxDays > 0) {
        const yyyy = currentDate.getFullYear();
        const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dd = String(currentDate.getDate()).padStart(2, '0');
        const dStr = `${yyyy}-${mm}-${dd}`;

        chartData.push({
            day: dStr,
            hours: agg[dStr]?.hours || 0,
            pieces: agg[dStr]?.pieces || 0
        });

        currentDate.setDate(currentDate.getDate() + 1);
        maxDays--;
    }

    // 3. Compute Top Referrers
    const top_reference_by_hours = Object.keys(refHours).length > 0
        ? Object.entries(refHours).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : null;

    const top_customer_by_hours = Object.keys(customerHours).length > 0
        ? Object.entries(customerHours).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : null;

    // 4. Cadence (avoid div by zero)
    const weighted_cadence = total_hours > 0 ? (total_pieces / total_hours) : 0;

    return {
        chartData,
        metrics: {
            total_hours,
            total_pieces,
            weighted_cadence,
            incomplete_rows_count,
            top_reference_by_hours,
            top_customer_by_hours
        },
        tableLogs
    };
}
