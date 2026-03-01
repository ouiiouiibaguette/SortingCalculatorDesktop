import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Trash2, Save, Download, Calculator, History, Search, AlertCircle, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import {
    getFinanceProjects,
    saveFinanceProject,
    deleteFinanceProject,
    FinanceProject,
    FinancePremium,
    generateId
} from "../lib/db";
import {
    calculateFinanceProject,
    FinanceProjectInput,
    FinancePremiumInput
} from "../lib/financeCalculator";

const majorationsCatalog = [
    { type: "nuit", label: "Nuit", defPct: 25 },
    { type: "samedi", label: "Samedi", defPct: 25 },
    { type: "dimanche", label: "Dimanche", defPct: 50 },
    { type: "ferie", label: "Jour Férié", defPct: 100 },
    { type: "hs25", label: "H. Sup 25%", defPct: 25 },
    { type: "hs50", label: "H. Sup 50%", defPct: 50 },
];

export default function FinanceDashboard() {
    // Current Project Editing State
    const [projectId, setProjectId] = useState<string>(generateId());
    const [title, setTitle] = useState("");
    const [clientName, setClientName] = useState("");
    const [partRef, setPartRef] = useState("");

    const defaultInputs: FinanceProjectInput = {
        qty_total: 1000,
        cadence_brute_per_h: 100,
        productivity_pct: 100,
        hours_per_day: 8,
        operators_count: 1,
        cadence_scope: 'per_operator',
        operator_rate_per_h: 20,
        cariste_rate_per_h: 25,
        cariste_hours: 0,
        cariste_mode: 'total_project',
        overhead_pct: 0,
        target_margin_pct: 0,
        billing_mode: 'per_piece',
        billing_price_per_piece: 0,
        billing_price_total: 0,
        allow_premium_overlap: false,
        premiums: []
    };

    const [inputs, setInputs] = useState<FinanceProjectInput>(defaultInputs);

    // History State
    const [history, setHistory] = useState<FinanceProject[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [premiumModal, setPremiumModal] = useState<FinancePremiumInput | null>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const h = await getFinanceProjects();
        setHistory(h);
    };

    // Derived Results
    const { results, error } = useMemo(() => {
        try {
            const res = calculateFinanceProject(inputs);
            return { results: res, error: null };
        } catch (e: any) {
            return { results: null, error: e.message };
        }
    }, [inputs]);

    const handleSave = async () => {
        if (!results) return;

        const pId = projectId || generateId();
        const finalTitle = title.trim() || `Scénario du ${new Date().toLocaleDateString()}`;

        const project: FinanceProject = {
            id: pId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'saved',
            scenario_group_id: null,
            title: finalTitle,
            client_name: clientName,
            part_reference: partRef,
            site_name: null,

            qty_total: inputs.qty_total,
            cadence_brute_per_h: inputs.cadence_brute_per_h,
            productivity_pct: inputs.productivity_pct,
            hours_per_day: inputs.hours_per_day,
            operators_count: inputs.operators_count,
            cadence_scope: inputs.cadence_scope,

            operator_rate_per_h: inputs.operator_rate_per_h,
            cariste_rate_per_h: inputs.cariste_rate_per_h,
            cariste_hours: inputs.cariste_hours,
            cariste_mode: inputs.cariste_mode,

            overhead_pct: inputs.overhead_pct,
            target_margin_pct: inputs.target_margin_pct,
            billing_mode: inputs.billing_mode,
            billing_price_per_piece: inputs.billing_price_per_piece,
            billing_price_total: inputs.billing_price_total,

            cadence_nette_per_h: results.cadence_nette_per_h,
            total_hours: results.total_hours,
            total_days: results.total_days,
            labor_cost: results.labor_cost,
            majorations_cost: results.majorations_cost,
            cariste_cost: results.cariste_cost,
            overhead_cost: results.overhead_cost,
            total_cost_full: results.total_cost_full,
            cost_per_piece: results.cost_per_piece,
            price_per_piece_suggested: results.price_per_piece_suggested,
            margin_eur: results.margin_eur,
            margin_pct: results.margin_pct,
            risk_score: results.risk_score,
            risk_level: results.risk_level
        };

        const premiums: FinancePremium[] = inputs.premiums.map(p => {
            const calculatedCost = results.premiums_calculated.find(pc => pc.type === p.type)?.cost || 0;
            return {
                id: generateId(),
                project_id: pId,
                type: p.type,
                hours: p.hours,
                pct: p.pct,
                base: p.base,
                cost: calculatedCost,
                created_at: new Date().toISOString()
            };
        });

        await saveFinanceProject(project, premiums);
        loadHistory();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Supprimer ce scénario financier ?")) {
            await deleteFinanceProject(id);
            if (projectId === id) {
                setProjectId(generateId());
                setInputs(defaultInputs);
            }
            loadHistory();
        }
    };

    const handleDuplicate = () => {
        setProjectId(generateId());
        setTitle(title ? `${title} (Copie)` : "Copie");
    };

    const expandPremium = (type: string, defPct: number) => {
        const existing = inputs.premiums.find(p => p.type === type);
        if (existing) {
            setPremiumModal({ ...existing });
        } else {
            setPremiumModal({ id: generateId(), type, hours: 0, pct: defPct, base: 'operator_only' });
        }
    };

    const savePremiumModal = () => {
        if (!premiumModal) return;
        setInputs(prev => {
            let nextPrems = [...prev.premiums];
            const idx = nextPrems.findIndex(p => p.type === premiumModal.type);
            if (idx >= 0) {
                if (premiumModal.hours === 0 && premiumModal.pct === 0) {
                    nextPrems.splice(idx, 1); // remove if zeroed out
                } else {
                    nextPrems[idx] = premiumModal;
                }
            } else if (premiumModal.hours > 0 || premiumModal.pct > 0) {
                nextPrems.push(premiumModal);
            }
            return { ...prev, premiums: nextPrems };
        });
        setPremiumModal(null);
    };

    const removePremium = (type: string) => {
        setInputs(prev => ({ ...prev, premiums: prev.premiums.filter(p => p.type !== type) }));
    };

    const exportCsv = () => {
        if (!results) return;
        const csvRows = [];
        csvRows.push(["--- TRI-SUITE ERP : RAPPORT DE RENTABILITE ---"]);
        csvRows.push(["Scénario", title || "N/A"]);
        csvRows.push(["Client", clientName || "N/A"]);
        csvRows.push(["Référence", partRef || "N/A"]);

        csvRows.push([]);
        csvRows.push(["1. PRODUCTION"]);
        csvRows.push(["Quantité Totale", inputs.qty_total]);
        csvRows.push(["Cadence Brute /h", inputs.cadence_brute_per_h]);
        csvRows.push(["Productivité %", inputs.productivity_pct]);
        csvRows.push(["Heures / Jour", inputs.hours_per_day]);
        csvRows.push(["Opérateurs Actifs", inputs.operators_count]);

        csvRows.push([]);
        csvRows.push(["2. METRIQUES CALCULEES"]);
        csvRows.push(["Cadence Nette /h", results.cadence_nette_per_h.toFixed(2)]);
        csvRows.push(["Heures Totales", results.total_hours.toFixed(2)]);
        csvRows.push(["Jours Travaillés", results.total_days.toFixed(2)]);

        csvRows.push([]);
        csvRows.push(["3. COUTS & FINANCE"]);
        csvRows.push(["Coût Main d'Œuvre Base (€)", results.labor_cost.toFixed(2)]);
        csvRows.push(["Surcoûts Majorations (€)", results.majorations_cost.toFixed(2)]);
        csvRows.push(["Coût Cariste (€)", results.cariste_cost.toFixed(2)]);
        csvRows.push(["Charges Indirectes (€)", results.overhead_cost.toFixed(2)]);
        csvRows.push(["COÛT COMPLET TOTAL (€)", results.total_cost_full.toFixed(2)]);
        csvRows.push(["Coût de revient / Pièce (€)", results.cost_per_piece.toFixed(4)]);

        csvRows.push([]);
        csvRows.push(["4. RENTABILITE & PRIX"]);
        csvRows.push(["Marge Cible (%)", inputs.target_margin_pct]);
        csvRows.push(["Prix Pièce Conseillé (€)", results.price_per_piece_suggested.toFixed(4)]);
        csvRows.push(["Marge Dégagée (%)", results.margin_pct.toFixed(2)]);
        csvRows.push(["Marge Dégagée (€)", results.margin_eur.toFixed(2)]);

        const content = csvRows.map(r => r.join(";")).join("\n");
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Rentabilite_${clientName}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calculator className="w-8 h-8 text-primary" /> Pilotage Rentabilité
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Calcul du coût complet, évaluation des marges et risques de production.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={exportCsv} variant="secondary" className="gap-2" disabled={!results}>
                        <Download className="w-4 h-4" /> Export Complet CSV
                    </Button>
                    <Button onClick={handleSave} className="gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900" disabled={!results}>
                        <Save className="w-4 h-4" /> Enregistrer Scénario
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                {/* Left Columns (3 spans): Forms */}
                <div className="xl:col-span-3 space-y-6">

                    {/* Header Info */}
                    <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-end">
                        <Input label="Nom du Scénario" value={title} onChange={e => setTitle(e.target.value)} className="flex-1 min-w-[200px]" placeholder="Ex: Hypothèse Optimiste" />
                        <Input label="Client" value={clientName} onChange={e => setClientName(e.target.value)} className="flex-1 min-w-[200px]" />
                        <Input label="Réf. Pièce" value={partRef} onChange={e => setPartRef(e.target.value)} className="w-48" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Produit & Temps */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-sm">1. Production & Ressources</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Qté Totale à traiter" type="number" value={inputs.qty_total} onChange={e => setInputs({ ...inputs, qty_total: Number(e.target.value) })} />
                                    <Input label="Heures travaillées / J" type="number" value={inputs.hours_per_day} onChange={e => setInputs({ ...inputs, hours_per_day: Number(e.target.value) })} />
                                    <div className="w-full">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1 mb-1 block">Cadence Cible</label>
                                        <div className="flex border border-slate-300 dark:border-slate-700 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-primary h-10">
                                            <input type="number" className="w-full px-3 py-2 text-sm bg-transparent outline-none dark:text-white" value={inputs.cadence_brute_per_h} onChange={e => setInputs({ ...inputs, cadence_brute_per_h: Number(e.target.value) })} />
                                            <select value={inputs.cadence_scope} onChange={e => setInputs({ ...inputs, cadence_scope: e.target.value as any })} className="bg-slate-100 dark:bg-slate-800 text-xs px-2 border-l border-slate-300 dark:border-slate-700 dark:text-white outline-none cursor-pointer">
                                                <option value="per_operator">/Opérateur</option>
                                                <option value="global">/Global Ligne</option>
                                            </select>
                                        </div>
                                    </div>
                                    <Input label="Productivité Attendue (%)" type="number" value={inputs.productivity_pct} onChange={e => setInputs({ ...inputs, productivity_pct: Number(e.target.value) })} />
                                    <Input label="Nombre d'Opérateurs" type="number" value={inputs.operators_count} onChange={e => setInputs({ ...inputs, operators_count: Number(e.target.value) })} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Coûts unitaires */}
                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-sm">2. Coûts Unitaires & Objectifs</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Taux Opérateur (€/h)" type="number" value={inputs.operator_rate_per_h} onChange={e => setInputs({ ...inputs, operator_rate_per_h: Number(e.target.value) })} />
                                    <Input label="Charges Indirectes Overhead (%)" type="number" value={inputs.overhead_pct} onChange={e => setInputs({ ...inputs, overhead_pct: Number(e.target.value) })} />
                                </div>
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input label="Taux Cariste (€/h)" type="number" value={inputs.cariste_rate_per_h} onChange={e => setInputs({ ...inputs, cariste_rate_per_h: Number(e.target.value) })} />
                                        <Input label="Heures Allouées" type="number" value={inputs.cariste_hours} onChange={e => setInputs({ ...inputs, cariste_hours: Number(e.target.value) })} />
                                        <div className="w-full">
                                            <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 ml-1 mb-1 block truncate">Mode Cariste</label>
                                            <select value={inputs.cariste_mode} onChange={e => setInputs({ ...inputs, cariste_mode: e.target.value as any })} className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 px-2 text-[11px] font-medium bg-white dark:bg-background-dark dark:text-white">
                                                <option value="total_project">Ttl. Projet</option>
                                                <option value="per_day">Par Jour</option>
                                                <option value="per_operator">Par Opé.</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Majorations & Prix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-sm">3. Surcoûts & Majorations</CardTitle>
                                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-500">
                                    <span>Autoriser Chevauchement</span>
                                    <input type="checkbox" checked={inputs.allow_premium_overlap} onChange={e => setInputs({ ...inputs, allow_premium_overlap: e.target.checked })} className="rounded border-slate-300 text-primary" />
                                </label>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {majorationsCatalog.map(cat => {
                                        const exists = inputs.premiums.find(p => p.type === cat.type);
                                        return (
                                            <button
                                                key={cat.type}
                                                onClick={() => expandPremium(cat.type, cat.defPct)}
                                                className={`px-3 py-1.5 text-xs rounded-full font-bold transition-all border ${exists
                                                    ? "bg-primary text-slate-900 border-primary"
                                                    : "bg-surface text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-primary"}`}
                                            >
                                                {exists ? '✓ Modifié ' : '+ '} {cat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {inputs.premiums.length > 0 && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 space-y-2">
                                        {inputs.premiums.map(p => {
                                            const catLabel = majorationsCatalog.find(c => c.type === p.type)?.label || p.type;
                                            return (
                                                <div key={p.type} className="flex justify-between items-center px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm">
                                                    <div className="text-sm font-medium dark:text-white flex-1">{catLabel} <span className="text-xs text-slate-400 font-normal">({p.base.includes('cariste') ? 'Op+Car' : 'Op'})</span></div>
                                                    <div className="text-sm tabular-nums text-slate-600 dark:text-slate-300 px-4">{p.hours}h</div>
                                                    <div className="text-sm tabular-nums font-bold text-orange-500 px-4">+{p.pct}%</div>
                                                    <button onClick={() => removePremium(p.type)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-sm">4. Stratégie de Facturation</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Marge Cible (%)" type="number" value={inputs.target_margin_pct} onChange={e => setInputs({ ...inputs, target_margin_pct: Number(e.target.value) })} />
                                    <div className="w-full">
                                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1 mb-1 block">Mode Facturation Réel</label>
                                        <select value={inputs.billing_mode} onChange={e => setInputs({ ...inputs, billing_mode: e.target.value as 'per_piece' | 'hourly' })} className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 px-3 text-sm bg-white dark:bg-background-dark dark:text-white outline-none focus:ring-1 focus:ring-primary">
                                            <option value="per_piece">Au Prix Pièce (Fixe)</option>
                                            <option value="hourly">Forfait Horaire Global</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-4">
                                    {inputs.billing_mode === 'per_piece' ? (
                                        <Input label="Prix Pièce Vendu Réel (€) - (Optionnel)" type="number" value={inputs.billing_price_per_piece || ''} onChange={e => setInputs({ ...inputs, billing_price_per_piece: e.target.value ? Number(e.target.value) : null })} placeholder="Ex: 0.85" />
                                    ) : (
                                        <Input label="Montant Forfait Global (€) - (Optionnel)" type="number" value={inputs.billing_price_total || ''} onChange={e => setInputs({ ...inputs, billing_price_total: e.target.value ? Number(e.target.value) : null })} placeholder="Ex: 15400" />
                                    )}
                                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">Saisissez le prix facturé réel pour tracker votre marge dégagée précisément. Si vide, la marge cible sera simulée par défaut.</p>
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column: Direction Synthesis */}
                <div className="space-y-6">

                    <Card className="border-slate-800 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 translate-x-1/3 -translate-y-1/3">
                            <div className="w-32 h-32 bg-primary/20 blur-3xl rounded-full"></div>
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-primary font-bold tracking-wide flex items-center justify-between">
                                Synthèse Direction
                                {results?.risk_level === 'high' && <AlertTriangle className="w-5 h-5 text-red-500" />}
                                {results?.risk_level === 'medium' && <AlertTriangle className="w-5 h-5 text-orange-400" />}
                                {results?.risk_level === 'low' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-2">
                            {error ? (
                                <div className="text-sm text-red-400 bg-red-400/10 p-4 rounded-lg flex items-start gap-2 border border-red-500/20">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    {error}
                                </div>
                            ) : results && (
                                <>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-4 border-b border-white/10 text-sm">
                                        <div className="text-slate-400">Total Heures</div>
                                        <div className="text-right font-mono font-bold text-white">{results.total_hours.toFixed(1)}h</div>
                                        <div className="text-slate-400">Jours Est.</div>
                                        <div className="text-right font-mono font-bold text-white">{results.total_days.toFixed(1)} J</div>
                                        <div className="text-slate-400">Cadence N.</div>
                                        <div className="text-right font-mono font-bold text-white">{results.cadence_nette_per_h.toFixed(1)} /h</div>
                                    </div>

                                    <div className="space-y-2 pb-4 border-b border-white/10 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Cout Base M.O</span>
                                            <span className="font-mono text-white">{results.labor_cost.toFixed(2)} €</span>
                                        </div>
                                        {results.cariste_cost > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Cariste Total</span>
                                                <span className="font-mono text-white">{results.cariste_cost.toFixed(2)} €</span>
                                            </div>
                                        )}
                                        {results.majorations_cost > 0 && (
                                            <div className="flex justify-between text-orange-300">
                                                <span>Surcoûts Majorations</span>
                                                <span className="font-mono font-bold">+{results.majorations_cost.toFixed(2)} €</span>
                                            </div>
                                        )}
                                        {results.overhead_cost > 0 && (
                                            <div className="flex justify-between text-slate-300">
                                                <span>Charges (Overhead)</span>
                                                <span className="font-mono">+{results.overhead_cost.toFixed(2)} €</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-2 items-center">
                                            <span className="font-medium text-white">COÛT TOTAL</span>
                                            <span className="text-xl font-bold font-mono text-white">{results.total_cost_full.toFixed(2)} €</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/5 rounded px-2 py-1 mt-1 border border-white/10">
                                            <span className="font-medium text-slate-300">Coût Revient/Pièce</span>
                                            <span className="font-mono font-bold text-primary">{results.cost_per_piece.toFixed(4)} €</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Cible Commerciale Demandée</div>
                                            <div className="bg-primary text-slate-900 rounded-lg p-3 shadow-inner shadow-black/20 font-bold flex justify-between items-center text-lg">
                                                <span>Prix Vente Obj.</span>
                                                <span className="font-mono text-2xl">{results.price_per_piece_suggested.toFixed(4)} €</span>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-lg border border-white/10 p-3 pt-2">
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">Analyse Marge Réelle Dégagée</div>
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <div className={`text-2xl font-black font-mono leading-none ${results.margin_pct < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                        {results.margin_pct > 0 ? '+' : ''}{results.margin_pct.toFixed(2)}%
                                                    </div>
                                                </div>
                                                <div className={`text-sm font-bold font-mono ${results.margin_eur < 0 ? 'text-red-400' : 'text-white'}`}>
                                                    {results.margin_eur > 0 ? '+' : ''}{results.margin_eur.toFixed(2)} €
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Sensibility Table */}
                    {results && !error && (
                        <Card>
                            <CardHeader className="py-3 px-4">
                                <CardTitle className="text-xs">Risque Productivité / Prix de revient</CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 bg-slate-50 dark:bg-background-dark/50">
                                <div className="text-[11px] font-mono w-full">
                                    <div className="grid grid-cols-4 font-bold text-slate-500 uppercase pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                                        <div>Prod.</div>
                                        <div className="col-span-2">Revient Pièce</div>
                                        <div className="text-right">Marge</div>
                                    </div>
                                    {results.sensitivity.map(s => (
                                        <div key={s.productivity} className={`grid grid-cols-4 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0 ${s.productivity === inputs.productivity_pct ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                            <div>{s.productivity}%</div>
                                            <div className="col-span-2">{s.cost_per_piece.toFixed(5)} €</div>
                                            <div className={`text-right ${s.margin_pct < 0 ? 'text-red-500' : ''}`}>{s.margin_pct.toFixed(1)}%</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* History */}
                    <Card>
                        <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800">
                            <CardTitle className="text-sm flex justify-between items-center w-full">
                                <span className="flex items-center gap-1.5"><History className="w-4 h-4" /> Scénarios</span>
                                <span className="bg-slate-100 dark:bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-500">{history.length}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Chercher..."
                                        className="w-full h-8 pl-7 pr-2 text-xs rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none dark:text-white"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                {history.filter(h => h.title?.toLowerCase().includes(searchTerm.toLowerCase()) || h.client_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(h => (
                                    <div key={h.id} className={`group cursor-pointer rounded-lg border p-2 text-xs transition-colors ${h.id === projectId ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-bold text-slate-900 dark:text-white" onClick={() => {
                                                setProjectId(h.id);
                                                setTitle(h.title || '');
                                                setClientName(h.client_name || '');
                                                setPartRef(h.part_reference || '');
                                                setInputs({
                                                    ...defaultInputs,
                                                    ...h,
                                                    premiums: [] // Will need fetching, mocked behavior simplified for UI
                                                } as any);
                                            }}>{h.title || "Sans nom"}</div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={handleDuplicate} className="text-primary hover:text-primary-dark"><Copy className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDelete(h.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-500">
                                            <span className="truncate max-w-[100px]">{h.client_name} - {h.part_reference}</span>
                                            <span className="font-mono font-medium">{h.margin_pct.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                                {history.length === 0 && <div className="text-center py-4 text-xs text-slate-400">Aucun historique détaillé.</div>}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Premium Settings Modal Overlay */}
            {premiumModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold dark:text-white flex justify-between">
                            Paramètres Majoration
                            <button onClick={() => setPremiumModal(null)} className="text-slate-400 hover:text-red-500">×</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Type: <span className="text-primary uppercase font-bold">{premiumModal.type}</span></div>

                            <Input label="Volume Heures (h)" type="number" value={premiumModal.hours} onChange={e => setPremiumModal({ ...premiumModal, hours: Number(e.target.value) })} />
                            <Input label="Taux de majoration (%)" type="number" value={premiumModal.pct} onChange={e => setPremiumModal({ ...premiumModal, pct: Number(e.target.value) })} />

                            <div className="w-full">
                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1 mb-1 block">Assiette d'application</label>
                                <select value={premiumModal.base} onChange={e => setPremiumModal({ ...premiumModal, base: e.target.value as any })} className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 px-3 text-sm bg-white dark:bg-background-dark dark:text-white">
                                    <option value="operator_only">Sur Coût Opérateurs</option>
                                    <option value="operator_and_cariste">Sur Coût Opé + Cariste</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                            <Button variant="secondary" onClick={() => setPremiumModal(null)}>Annuler</Button>
                            <Button className="bg-primary text-black" onClick={savePremiumModal}>Enregistrer</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
