import { useEffect, useState } from "react";
import { getOffers, Offer, getCustomers, Customer, logSortingAndDecrementStock, getRecentLogs } from "../lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { Calculator, Search, ChevronDown, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

export default function CalculatorPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [selectedOfferId, setSelectedOfferId] = useState<string>("");

    const [quantityStr, setQuantityStr] = useState("");
    const [datePerformed, setDatePerformed] = useState(() => new Date().toISOString().split('T')[0]);

    const [isComputing, setIsComputing] = useState(false);
    const [computedHours, setComputedHours] = useState<number | null>(null);

    // Search & Select State
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Date Picker State
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [alertModalOpen, setAlertModalOpen] = useState(false);
    const [alertData, setAlertData] = useState<{ remaining: number, threshold: number } | null>(null);
    const [recentLogs, setRecentLogs] = useState<{ id: string, date: string, pieces: number, hours: number, designation?: string, project_number?: string, reference?: string }[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        const fetchedOffers = await getOffers(true); // Active only
        const fetchedCustomers = await getCustomers();
        const custMap: Record<string, Customer> = {};
        fetchedCustomers.forEach(c => { custMap[c.id] = c; });
        setCustomers(custMap);
        setOffers(fetchedOffers);

        // Load recent 5 logs
        const logs = await getRecentLogs(5);
        setRecentLogs(logs);
    }

    const selectedOffer = offers.find(o => o.id === selectedOfferId);

    // Derived filtered offers for search
    const filteredOffers = offers.filter(o => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const custName = customers[o.customer_id]?.name.toLowerCase() || "";
        return o.reference.toLowerCase().includes(term) ||
            o.project_number.toLowerCase().includes(term) ||
            o.designation.toLowerCase().includes(term) ||
            custName.includes(term);
    });

    // Close dropdowns if clicked outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.custom-select-container')) {
                setIsDropdownOpen(false);
            }
            if (!target.closest('.custom-date-container')) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Date Picker Logic ---
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => {
        let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1; // Adjust so Monday is 0 instead of Sunday
    };

    const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    const handleDateSelect = (day: number) => {
        const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        // Format YYYY-MM-DD local
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        setDatePerformed(`${y}-${m}-${dayStr}`);
        setIsDatePickerOpen(false);
    };

    const renderCalendarDays = () => {
        const days = [];
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);

        // Empty slots before 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
        }

        // Actual days
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isSelected = datePerformed === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <button
                    key={i}
                    type="button"
                    onClick={() => handleDateSelect(i)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm transition-colors
                        ${isSelected ? 'bg-neon-accent text-[#111] font-bold shadow-[0_0_10px_rgba(0,160,153,0.5)]'
                            : isToday ? 'border border-neon-accent/50 text-neon-accent font-medium'
                                : 'text-slate-300 hover:bg-white/10'}`}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedOffer || !quantityStr) return;

        const qty = parseInt(quantityStr, 10);
        if (isNaN(qty) || qty <= 0) return;

        setIsComputing(true);
        try {
            const result = await logSortingAndDecrementStock(selectedOffer, qty, datePerformed);
            setComputedHours(result.hours_decimal);

            // Check threshold
            if (result.newStock <= selectedOffer.alert_threshold) {
                setAlertData({ remaining: result.newStock, threshold: selectedOffer.alert_threshold });
                setAlertModalOpen(true);
            }

            // Reload offers to get updated stock
            loadData();
            setQuantityStr(""); // Reset input

        } catch (err) {
            console.error("Failed to log sorting:", err);
        } finally {
            setIsComputing(false);
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Calculatrice de Tri</h2>
                <p className="text-slate-500 dark:text-slate-400">Enregistrez vos heures et décrémentez le stock automatiquement.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-primary/20 bg-white dark:bg-gradient-to-br dark:from-[#111] dark:to-[#050505] shadow-[0_10px_40px_rgba(0,160,153,0.08)] relative overflow-visible">
                    {/* Subtle glow background */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl"></div>
                    </div>

                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-neon-accent" />
                            Saisir un Tri
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                            <div className="space-y-1.5 custom-select-container relative">
                                <label className="text-sm font-medium text-slate-300 ml-1">Offre / Projet</label>

                                <div
                                    className={`relative w-full rounded-md border text-sm transition-colors cursor-pointer flex items-center bg-slate-50 dark:bg-background-dark
                                        ${isDropdownOpen ? 'border-neon-accent ring-1 ring-neon-accent' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}
                                    `}
                                    onClick={() => setIsDropdownOpen(true)}
                                >
                                    <Search className="w-4 h-4 ml-3 text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        className="w-full bg-transparent px-3 py-2.5 focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        placeholder={selectedOffer ? `${selectedOffer.reference} - ${selectedOffer.project_number}` : "Rechercher une offre, un projet, une ref..."}
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setIsDropdownOpen(true);
                                            if (selectedOfferId) setSelectedOfferId(""); // Reset selection if typing
                                        }}
                                    />
                                    <ChevronDown className={`w-4 h-4 mr-3 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1a1c23] border border-slate-200 dark:border-slate-700 rounded-md shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                        {filteredOffers.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-slate-500">Aucune offre trouvée.</div>
                                        ) : (
                                            <ul className="py-1">
                                                {filteredOffers.map(o => {
                                                    const cust = customers[o.customer_id]?.name || 'Inconnu';
                                                    const isSelected = o.id === selectedOfferId;
                                                    return (
                                                        <li
                                                            key={o.id}
                                                            className={`px-3 py-2 text-sm cursor-pointer flex justify-between items-center transition-colors
                                                                ${isSelected ? 'bg-primary/20 text-neon-accent' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'}
                                                            `}
                                                            onClick={() => {
                                                                setSelectedOfferId(o.id);
                                                                setSearchTerm("");
                                                                setIsDropdownOpen(false);
                                                            }}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">{o.reference} - {o.project_number}</span>
                                                                <span className="text-xs text-slate-500">{cust} • {o.designation}</span>
                                                            </div>
                                                            {isSelected && <Check className="w-4 h-4" />}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5 custom-date-container relative">
                                <label className="text-sm font-medium text-slate-300 ml-1">Date de tri</label>

                                <div
                                    className={`relative w-full rounded-md border text-sm transition-colors cursor-pointer flex items-center bg-slate-50 dark:bg-background-dark h-11
                                        ${isDatePickerOpen ? 'border-neon-accent ring-1 ring-neon-accent' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}
                                    `}
                                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                >
                                    <CalendarIcon className="w-4 h-4 ml-3 text-slate-400 shrink-0" />
                                    <div className="flex-1 px-3 text-slate-900 dark:text-slate-100 font-medium">
                                        {datePerformed.split('-').reverse().join('/')}
                                    </div>
                                </div>

                                {isDatePickerOpen && (
                                    <div className="absolute z-50 w-64 mt-2 p-3 bg-white dark:bg-[#1a1c23] border border-slate-200 dark:border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                                        {/* Header */}
                                        <div className="flex justify-between items-center mb-4">
                                            <button type="button" onClick={handlePrevMonth} className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0">
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>

                                            <div className="flex gap-1">
                                                <select
                                                    value={currentMonth.getMonth()}
                                                    onChange={(e) => {
                                                        const newDate = new Date(currentMonth);
                                                        newDate.setMonth(parseInt(e.target.value));
                                                        setCurrentMonth(newDate);
                                                    }}
                                                    className="bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 capitalize focus:outline-none cursor-pointer appearance-none hover:bg-slate-100 dark:hover:bg-white/5 rounded px-1"
                                                >
                                                    {Array.from({ length: 12 }).map((_, i) => (
                                                        <option key={i} value={i} className="bg-white text-slate-900 dark:bg-[#1a1c23] dark:text-slate-100">
                                                            {new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}
                                                        </option>
                                                    ))}
                                                </select>

                                                <select
                                                    value={currentMonth.getFullYear()}
                                                    onChange={(e) => {
                                                        const newDate = new Date(currentMonth);
                                                        newDate.setFullYear(parseInt(e.target.value));
                                                        setCurrentMonth(newDate);
                                                    }}
                                                    className="bg-transparent text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer appearance-none hover:bg-slate-100 dark:hover:bg-white/5 rounded px-1"
                                                >
                                                    {Array.from({ length: 20 }).map((_, i) => {
                                                        const year = new Date().getFullYear() - 10 + i;
                                                        return (
                                                            <option key={year} value={year} className="bg-white text-slate-900 dark:bg-[#1a1c23] dark:text-slate-100">
                                                                {year}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>

                                            <button type="button" onClick={handleNextMonth} className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0">
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {/* Days Header */}
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                                                <div key={i} className="text-xs font-semibold text-slate-500 text-center w-8">{d}</div>
                                            ))}
                                        </div>
                                        {/* Calendar Grid */}
                                        <div className="grid grid-cols-7 gap-1 place-items-center">
                                            {renderCalendarDays()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Input
                                label="Quantité triée (pièces)"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="Ex: 850"
                                value={quantityStr}
                                onChange={(e) => setQuantityStr(e.target.value)}
                                required
                            />

                            {selectedOffer && (
                                <div className="bg-slate-50 dark:bg-background-dark/50 p-4 rounded-lg border border-slate-200 dark:border-primary/20 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Cadence:</span>
                                        <span className="text-neon-accent font-mono">{selectedOffer.cadence_per_hour} p/h</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Stock Actuel:</span>
                                        <span className="text-slate-900 dark:text-slate-100 font-mono">{selectedOffer.quantity_in_stock} p</span>
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                size="lg"
                                className="w-full text-lg gap-2 mt-4 shadow-[0_4px_14px_rgba(0,160,153,0.3)]"
                                disabled={!selectedOfferId || !quantityStr || isComputing}
                            >
                                {isComputing ? "Traitement..." : "ENREGISTRER LE TRI"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Results / History area */}
                <div className="space-y-6">
                    {computedHours !== null && (
                        <Card className="border-primary/30 bg-primary/5 shadow-[0_10px_30px_rgba(0,160,153,0.1)] animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-2">
                                <p className="text-slate-400 text-sm uppercase tracking-wider">Heures Calculées</p>
                                <div className="text-6xl font-display font-light text-primary glow-text font-mono">
                                    {computedHours.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-slate-500 text-sm mt-2">Le stock a été mis à jour avec succès.</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg text-slate-700 dark:text-slate-300">Derniers tris enregistrés</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recentLogs.length > 0 ? (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {recentLogs.map(log => (
                                        <li key={log.id} className="p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                            <div className="flex-1 pr-4">
                                                <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 mb-1">
                                                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                                                        {log.designation}
                                                    </span>
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        {log.reference} • {log.project_number}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        {log.date.split('-').reverse().join('/')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                                    {log.pieces.toLocaleString('fr-FR')} pièces
                                                </span>
                                                <span className="font-mono font-bold text-neon-accent">
                                                    {log.hours.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} h
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500 text-sm text-center py-8">
                                    Aucun tri enregistré.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Modal
                isOpen={alertModalOpen}
                onClose={() => setAlertModalOpen(false)}
                title="⚠️ Alerte de Stock"
                className="border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
            >
                <div className="space-y-4">
                    <p className="text-slate-700 dark:text-slate-300">
                        Le seuil d'alerte pour cette offre a été atteint.
                    </p>
                    <div className="bg-slate-50 dark:bg-background-dark p-4 rounded-lg flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Stock restant:</span>
                        <span className="text-2xl font-mono text-red-500 font-bold">{alertData?.remaining}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Seuil configuré: {alertData?.threshold}
                    </p>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setAlertModalOpen(false)}>Fermer</Button>
                        <Button variant="danger" onClick={() => {
                            // Trigger mailto link based on settings (To be implemented)
                            setAlertModalOpen(false);
                        }}>
                            Préparer e-mail
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
