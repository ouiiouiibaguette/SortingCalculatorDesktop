import { useEffect, useState } from "react";
import { getDashboardLogs, SortingLog, isDesktop } from "../lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Download, Filter } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../lib/theme-context";
import * as ExcelJS from "exceljs";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { calculateDashboardAnalytics, CopilMetrics } from "../lib/analytics";
import { getCustomers, Customer } from "../lib/db";

export default function DashboardPage() {
    const [data, setData] = useState<{ day: string; hours: number; pieces: number }[]>([]);
    const [logs, setLogs] = useState<(SortingLog & { reference: string, is_incomplete: boolean })[]>([]);
    const [metrics, setMetrics] = useState<CopilMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState("xlsx");

    // Filters state
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [period, setPeriod] = useState("7days");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");
    const [customerId, setCustomerId] = useState("all");
    const [customersList, setCustomersList] = useState<Customer[]>([]);

    // Default to last 7 days
    const defaultEnd = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 6);

    const [exportStartDate, setExportStartDate] = useState(defaultStart.toISOString().split('T')[0]);
    const [exportEndDate, setExportEndDate] = useState(defaultEnd.toISOString().split('T')[0]);

    useEffect(() => {
        getCustomers().then(setCustomersList);
        loadData();
    }, []);

    async function loadData(
        currentPeriod = period,
        currentCustomStart = customStart,
        currentCustomEnd = customEnd,
        currentCustomerId = customerId
    ) {
        setLoading(true);
        try {
            const result = await getDashboardLogs(500); // Fetch enough logs for the period

            // Wait, we need to respect the correct filters
            const end = new Date();
            const start = new Date();

            if (currentPeriod === "today") {
                start.setHours(0, 0, 0, 0);
            } else if (currentPeriod === "7days") {
                start.setDate(start.getDate() - 6);
                start.setHours(0, 0, 0, 0);
            } else if (currentPeriod === "thisMonth") {
                start.setDate(1);
                start.setHours(0, 0, 0, 0);
            } else if (currentPeriod === "thisYear") {
                start.setMonth(0, 1);
                start.setHours(0, 0, 0, 0);
            } else if (currentPeriod === "custom") {
                if (currentCustomStart) start.setTime(new Date(currentCustomStart).getTime());
                if (currentCustomEnd) end.setTime(new Date(currentCustomEnd).getTime());
                start.setHours(0, 0, 0, 0);
            }
            end.setHours(23, 59, 59, 999);

            let filteredResult = result;
            if (currentCustomerId !== "all") {
                filteredResult = filteredResult.filter(log => log.customer_id === currentCustomerId);
            }

            const analytics = calculateDashboardAnalytics(filteredResult, start, end);

            setLogs(analytics.tableLogs);
            setData(analytics.chartData);
            setMetrics(analytics.metrics);

        } catch (err) {
            console.error("Dashboard error:", err);
        } finally {
            setLoading(false);
        }
    }

    const exportData = async () => {
        try {
            // Filter logs based on selected dates
            const start = exportStartDate ? new Date(exportStartDate) : new Date(0);
            const end = exportEndDate ? new Date(exportEndDate) : new Date();
            // set end time to end of day
            end.setHours(23, 59, 59, 999);

            const filteredLogs = logs.filter(log => {
                const d = new Date(log.date_performed);
                return d >= start && d <= end;
            });

            if (filteredLogs.length === 0) {
                alert("Aucune donnée à exporter pour cette période.");
                return;
            }

            if (exportFormat === "csv") {
                const header = "Date,Référence,Cadence,Pièces Triées,Heures\n";
                const rows = filteredLogs.map(l => `${l.date_performed},${l.reference},${l.cadence_snapshot},${l.pieces_sorted},${l.hours_decimal}`).join("\n");
                const content = header + rows;

                if (isDesktop) {
                    const filePath = await save({
                        filters: [{ name: "CSV", extensions: ["csv"] }],
                        defaultPath: `TriSuite_Dashboard_${exportStartDate}_to_${exportEndDate}.csv`
                    });

                    if (filePath) {
                        const encoder = new TextEncoder();
                        await writeFile(filePath, encoder.encode(content));
                        alert("Fichier CSV exporté avec succès !");
                        setExportModalOpen(false);
                    }
                } else {
                    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `TriSuite_Dashboard_${exportStartDate}_to_${exportEndDate}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    alert("Fichier CSV exporté avec succès !");
                    setExportModalOpen(false);
                }
            } else {
                // Calculate COPIL metrics for the export period specifically
                const allLogs = await getDashboardLogs(5000);

                let logsToExport = allLogs;
                if (customerId !== "all") {
                    logsToExport = logsToExport.filter(log => log.customer_id === customerId);
                }

                const copilAnalytics = calculateDashboardAnalytics(logsToExport, start, end);

                const workbook = new ExcelJS.Workbook();

                // SHEET 1: SYNTHESE
                const sheetSynthese = workbook.addWorksheet("Dashboard_Synthese");
                sheetSynthese.columns = [
                    { header: "Métrique", key: "metric", width: 30 },
                    { header: "Valeur", key: "value", width: 30 }
                ];
                sheetSynthese.addRow({ metric: "Période Début", value: exportStartDate });
                sheetSynthese.addRow({ metric: "Période Fin", value: exportEndDate });
                sheetSynthese.addRow({ metric: "Heures Totales", value: copilAnalytics.metrics.total_hours });
                sheetSynthese.addRow({ metric: "Pièces Totales", value: copilAnalytics.metrics.total_pieces });
                sheetSynthese.addRow({ metric: "Cadence Pondérée (p/h)", value: copilAnalytics.metrics.weighted_cadence });
                sheetSynthese.addRow({ metric: "Données Incomplètes (Sans Ref)", value: copilAnalytics.metrics.incomplete_rows_count });
                sheetSynthese.addRow({ metric: "Top Référence (Heures)", value: copilAnalytics.metrics.top_reference_by_hours || "N/A" });
                sheetSynthese.addRow({ metric: "Top Client (Heures)", value: copilAnalytics.metrics.top_customer_by_hours || "N/A" });

                // Stylize Synthèse
                sheetSynthese.getRow(1).font = { bold: true };
                sheetSynthese.getColumn(2).alignment = { horizontal: 'left' };

                // SHEET 2: HISTORIQUE RECENT
                const sheetHist = workbook.addWorksheet("Historique_Recent");
                sheetHist.columns = [
                    { header: "Date", key: "date", width: 15 },
                    { header: "Référence", key: "ref", width: 20 },
                    { header: "Cadence", key: "cadence", width: 15 },
                    { header: "Pièces Triées", key: "pieces", width: 20 },
                    { header: "Heures", key: "hours", width: 15 },
                    { header: "Heures (Format Local)", key: "hours_fr", width: 20 }, // extra formatted column
                ];

                copilAnalytics.tableLogs.forEach(log => {
                    sheetHist.addRow({
                        date: log.date_performed,
                        ref: log.reference,
                        cadence: log.cadence_snapshot,
                        pieces: log.pieces_sorted,
                        hours: log.hours_decimal,
                        hours_fr: log.hours_decimal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
                    });
                });
                sheetHist.getRow(1).font = { bold: true };

                const buffer = await workbook.xlsx.writeBuffer();

                if (isDesktop) {
                    const filePath = await save({
                        filters: [{ name: "Excel", extensions: ["xlsx"] }],
                        defaultPath: `TriSuite_Dashboard_${exportStartDate}_to_${exportEndDate}.xlsx`
                    });

                    if (filePath) {
                        await writeFile(filePath, new Uint8Array(buffer as ArrayBuffer));
                        alert("Fichier Excel exporté avec succès !");
                        setExportModalOpen(false);
                    }
                } else {
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `TriSuite_Dashboard_${exportStartDate}_to_${exportEndDate}.xlsx`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    alert("Fichier Excel exporté avec succès !");
                    setExportModalOpen(false);
                }
            }
        } catch (err: any) {
            console.error(err);
            alert("Erreur lors de l'export :\n" + (err.message || JSON.stringify(err)));
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Dashboard Temps & Tri</h2>
                    <p className="text-slate-500 dark:text-slate-400">Vue d'ensemble de l'activité sur les 7 derniers jours d'opération.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" className="gap-2 outline-slate-500" onClick={() => setFilterModalOpen(true)}>
                        <Filter className="w-4 h-4" /> Filtrer
                    </Button>
                    <Button variant="primary" className="gap-2 outline-neon-accent" onClick={() => setExportModalOpen(true)}>
                        <Download className="w-4 h-4" /> Exporter
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="h-96">
                    <CardHeader>
                        <CardTitle>Heures de Tri</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">Loading...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#111111', borderColor: '#00A09930', borderRadius: '1rem', color: '#fff' }}
                                        itemStyle={{ color: '#00A099' }}
                                    />
                                    <Bar dataKey="hours" name="Heures" fill="#00A099" radius={[4, 4, 0, 0]} minPointSize={3} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card className="h-96">
                    <CardHeader>
                        <CardTitle>Pièces Triées</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                        {loading ? (
                            <div className="h-full flex items-center justify-center">Loading...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#111111', borderColor: '#ffffff20', borderRadius: '1rem', color: '#fff' }}
                                        itemStyle={{ color: '#ffffff' }}
                                    />
                                    <Bar dataKey="pieces" name="Pièces" fill={theme === 'dark' ? '#ffffff' : '#0f172a'} radius={[4, 4, 0, 0]} minPointSize={3} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Historique Récent</CardTitle>
                    {metrics && metrics.incomplete_rows_count > 0 && (
                        <span className="text-sm text-red-500 font-medium">
                            Données incomplètes : {metrics.incomplete_rows_count}
                        </span>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto text-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-100 dark:bg-background-dark/50 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">Référence</th>
                                    <th className="p-4 font-medium text-right">Cadence (p/h)</th>
                                    <th className="p-4 font-medium text-right">Pièces Triées</th>
                                    <th className="p-4 font-medium text-right text-neon-accent">Total Heures</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-primary/10">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-mono">{log.date_performed}</td>
                                        <td className={`p-4 ${log.is_incomplete ? 'text-slate-400 font-bold' : 'text-neon-accent'}`}>{log.reference}</td>
                                        <td className="p-4 text-right font-mono">{log.cadence_snapshot}</td>
                                        <td className="p-4 text-right font-mono">{log.pieces_sorted}</td>
                                        <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                                            {log.hours_decimal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <Modal
                isOpen={exportModalOpen}
                onClose={() => setExportModalOpen(false)}
                title="Exporter les données"
            >
                <div className="space-y-4">
                    <p className="text-slate-700 dark:text-slate-300 text-sm">
                        Sélectionnez la période et le format d'export pour générer votre rapport.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Du (inclus)"
                            type="date"
                            value={exportStartDate}
                            onChange={(e) => setExportStartDate(e.target.value)}
                        />
                        <Input
                            label="Au (inclus)"
                            type="date"
                            value={exportEndDate}
                            onChange={(e) => setExportEndDate(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Format d'export</label>
                        <div className="relative">
                            <select
                                value={exportFormat}
                                onChange={(e) => setExportFormat(e.target.value)}
                                className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-accent focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900"
                            >
                                <option value="xlsx">Fichier Excel (.xlsx)</option>
                                <option value="csv">Fichier CSV (.csv)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setExportModalOpen(false)}>Annuler</Button>
                        <Button variant="primary" onClick={exportData}>
                            Générer le fichier
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={filterModalOpen}
                onClose={() => setFilterModalOpen(false)}
                title="Filtrer le Dashboard"
            >
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Client</label>
                        <div className="relative">
                            <select
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                                className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-accent focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900"
                            >
                                <option value="all">Tous les clients</option>
                                {customersList.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Période</label>
                        <div className="relative">
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-accent focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900"
                            >
                                <option value="today">Aujourd'hui</option>
                                <option value="7days">7 derniers jours</option>
                                <option value="thisMonth">Ce mois-ci</option>
                                <option value="thisYear">Cette année</option>
                                <option value="custom">Personnalisé</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {period === "custom" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input
                                label="Du"
                                type="date"
                                value={customStart}
                                onChange={(e) => setCustomStart(e.target.value)}
                            />
                            <Input
                                label="Au"
                                type="date"
                                value={customEnd}
                                onChange={(e) => setCustomEnd(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setFilterModalOpen(false)}>Annuler</Button>
                        <Button variant="primary" onClick={() => {
                            setFilterModalOpen(false);
                            loadData(period, customStart, customEnd, customerId);
                        }}>
                            Appliquer les filtres
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
