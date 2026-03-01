import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Users, FileDown } from "lucide-react";
import {
    getOffers, Offer, getCustomers, Customer,
    createCustomer, createOffer,
    updateCustomer, deleteCustomer,
    updateOffer, deleteOffer,
    importExcelData
} from "../lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../components/ui/Table";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";

export default function DatabasePage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [customers, setCustomers] = useState<Record<string, Customer>>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modals state
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isClientListOpen, setIsClientListOpen] = useState(false);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

    // Edit state
    const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
    const [editingClientId, setEditingClientId] = useState<string | null>(null);

    // Client Form
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");

    // Offer Form
    const [offerCustomer, setOfferCustomer] = useState("");
    const [offerProject, setOfferProject] = useState("");
    const [offerDesignation, setOfferDesignation] = useState("");
    const [offerReference, setOfferReference] = useState("");
    const [offerCadence, setOfferCadence] = useState("");
    const [offerPrice, setOfferPrice] = useState("");
    const [offerQuantity, setOfferQuantity] = useState("");
    const [offerAlert, setOfferAlert] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            // Execute in parallel
            const [fetchedOffers, fetchedCustomers] = await Promise.all([
                getOffers(false), // Get all including archived
                getCustomers()
            ]);

            // Map customers for quick lookup
            const custMap: Record<string, Customer> = {};
            fetchedCustomers.forEach(c => { custMap[c.id] = c; });
            setCustomers(custMap);

            setOffers(fetchedOffers);
        } catch (err) {
            console.error("Failed to load database content:", err);
        } finally {
            setLoading(false);
        }
    }

    // Helper to open offer edit
    function handleEditOffer(offer: Offer) {
        setEditingOfferId(offer.id);
        setOfferCustomer(offer.customer_id);
        setOfferProject(offer.project_number);
        setOfferDesignation(offer.designation);
        setOfferReference(offer.reference);
        setOfferCadence((offer.cadence_per_hour || "").toString());
        setOfferPrice((offer.price_per_piece || "").toString());
        setOfferQuantity((offer.quantity_offer || "").toString());
        setOfferAlert((offer.alert_threshold || "").toString());
        setIsOfferModalOpen(true);
    }

    async function handleDeleteOffer(id: string) {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.")) return;
        try {
            await deleteOffer(id);
            loadData();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la suppression de l'offre.");
        }
    }

    function handleEditClient(client: Customer) {
        setEditingClientId(client.id);
        setClientName(client.name);
        setClientEmail(client.email || "");
        setIsClientModalOpen(true);
    }

    async function handleDeleteClient(id: string) {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce client ? Il ne doit plus avoir d'offres rattachées.")) return;
        try {
            await deleteCustomer(id);
            loadData();
        } catch (err) {
            console.error(err);
            alert("Erreur lors de la suppression. Le client est peut-être lié à une offre.");
        }
    }

    const filteredOffers = offers.filter(o => {
        const term = search.toLowerCase();
        const custName = customers[o.customer_id]?.name.toLowerCase() || "";
        return o.reference.toLowerCase().includes(term) ||
            o.project_number.toLowerCase().includes(term) ||
            o.designation.toLowerCase().includes(term) ||
            custName.includes(term);
    });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Base de Données</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gestion des offres et suivi des stocks.</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                    <Button variant="secondary" className="gap-2 whitespace-nowrap" onClick={async () => {
                        try {
                            await importExcelData();
                            loadData();
                        } catch (err) {
                            console.error(err);
                            alert("Erreur lors de l'importation.");
                        }
                    }}>
                        <FileDown className="w-4 h-4" /> Import Excel
                    </Button>
                    <Button variant="secondary" className="gap-2 whitespace-nowrap" onClick={() => setIsClientListOpen(true)}>
                        <Users className="w-4 h-4" /> Gérer Clients
                    </Button>
                    <Button variant="secondary" className="gap-2 whitespace-nowrap" onClick={() => {
                        setEditingClientId(null);
                        setClientName("");
                        setClientEmail("");
                        setIsClientModalOpen(true);
                    }}>
                        <Plus className="w-4 h-4" /> Client
                    </Button>
                    <Button variant="primary" className="gap-2 whitespace-nowrap" onClick={() => {
                        setEditingOfferId(null);
                        setOfferCustomer("");
                        setOfferProject("");
                        setOfferDesignation("");
                        setOfferReference("");
                        setOfferCadence("");
                        setOfferPrice("");
                        setOfferQuantity("");
                        setOfferAlert("");
                        setIsOfferModalOpen(true);
                    }}>
                        <Plus className="w-4 h-4" /> Nouvelle Offre
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle>Liste des Offres</CardTitle>
                    <div className="w-64 relative">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <Input
                            placeholder="Rechercher une ref., un projet..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <div className="w-8 h-8 rounded-full border-t-2 border-neon-accent animate-spin"></div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Projet</TableHead>
                                    <TableHead>Référence</TableHead>
                                    <TableHead>Désignation</TableHead>
                                    <TableHead className="text-right">Cadence (p/h)</TableHead>
                                    <TableHead className="text-right">Stock Actuel</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOffers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                                            Aucune offre trouvée.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOffers.map(offer => {
                                        const isLowStock = offer.quantity_in_stock <= offer.alert_threshold;
                                        const cust = customers[offer.customer_id];
                                        return (
                                            <TableRow key={offer.id} className={offer.is_archived ? "opacity-50" : ""}>
                                                <TableCell className="font-medium">{cust?.name || "Inconnu"}</TableCell>
                                                <TableCell>{offer.project_number}</TableCell>
                                                <TableCell className="font-mono text-primary">{offer.reference}</TableCell>
                                                <TableCell>{offer.designation}</TableCell>
                                                <TableCell className="text-right font-mono">{offer.cadence_per_hour}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {offer.quantity_in_stock}
                                                </TableCell>
                                                <TableCell>
                                                    {offer.is_archived ? (
                                                        <Badge variant="outline">Archivé</Badge>
                                                    ) : isLowStock ? (
                                                        <Badge variant="danger">Stock Bas</Badge>
                                                    ) : (
                                                        <Badge variant="success">OK</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="ghost" size="sm" className="p-2" onClick={() => handleEditOffer(offer)}>
                                                        <Edit className="w-4 h-4 text-slate-400 hover:text-white" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="p-2" onClick={() => handleDeleteOffer(offer.id)}>
                                                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Client Management Modal */}
            <Modal isOpen={isClientListOpen} onClose={() => setIsClientListOpen(false)} title="Gestion des Clients" className="max-w-3xl">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.values(customers).map(c => (
                            <TableRow key={c.id}>
                                <TableCell className="font-medium">{c.name}</TableCell>
                                <TableCell>{c.email || "-"}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="sm" className="p-2" onClick={() => {
                                        setIsClientListOpen(false);
                                        handleEditClient(c);
                                    }}>
                                        <Edit className="w-4 h-4 text-slate-400 hover:text-white" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="p-2" onClick={() => handleDeleteClient(c.id)}>
                                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {Object.keys(customers).length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                                    Aucun client défini.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Modal>

            <Modal
                isOpen={isClientModalOpen}
                onClose={() => {
                    setIsClientModalOpen(false);
                    setEditingClientId(null);
                }}
                title={editingClientId ? "Modifier Client" : "Nouveau Client"}
            >
                <form
                    className="space-y-4 pt-2"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!clientName) return;
                        try {
                            if (editingClientId) {
                                await updateCustomer(editingClientId, clientName, clientEmail || null);
                            } else {
                                await createCustomer(clientName, clientEmail || null);
                            }
                            setIsClientModalOpen(false);
                            setClientName("");
                            setClientEmail("");
                            setEditingClientId(null);
                            loadData();
                        } catch (err) {
                            console.error("Erreur lors de l'enregistrement du client :", err);
                            alert("Erreur lors de l'enregistrement : " + err);
                        }
                    }}
                >
                    <Input label="Nom du client" required value={clientName} onChange={(e) => setClientName(e.target.value)} />
                    <Input label="Email (Optionnel)" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsClientModalOpen(false)}>Annuler</Button>
                        <Button type="submit" variant="primary">Enregistrer</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isOfferModalOpen}
                onClose={() => setIsOfferModalOpen(false)}
                title={editingOfferId ? "Modifier l'Offre" : "Nouvelle Offre"}
            >
                <form
                    className="space-y-4 pt-2"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!offerCustomer || !offerProject || !offerReference) return;

                        try {
                            if (editingOfferId) {
                                await updateOffer(
                                    editingOfferId,
                                    offerCustomer, offerProject, offerDesignation, offerReference,
                                    parseFloat(offerCadence), parseFloat(offerPrice),
                                    parseInt(offerQuantity, 10), parseInt(offerAlert, 10)
                                );
                            } else {
                                await createOffer(
                                    offerCustomer, offerProject, offerDesignation, offerReference,
                                    parseFloat(offerCadence), parseFloat(offerPrice),
                                    parseInt(offerQuantity, 10), parseInt(offerAlert, 10)
                                );
                            }

                            setIsOfferModalOpen(false);
                            // reset form
                            setOfferCustomer("");
                            setOfferProject("");
                            setOfferDesignation("");
                            setOfferReference("");
                            setOfferCadence("");
                            setOfferPrice("");
                            setOfferQuantity("");
                            setOfferAlert("");

                            loadData();
                        } catch (err) {
                            console.error("Erreur lors de la création de l'offre :", err);
                            alert("Erreur lors de la création de l'offre : " + err);
                        }
                    }}
                >
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Client</label>
                        <div className="relative">
                            <select
                                value={offerCustomer}
                                onChange={(e) => setOfferCustomer(e.target.value)}
                                className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-accent focus:border-transparent transition-all appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900"
                                required
                            >
                                <option value="" disabled>-- Sélectionner --</option>
                                {Object.values(customers).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="N° Projet" required value={offerProject} onChange={(e) => setOfferProject(e.target.value)} />
                        <Input label="Référence" required value={offerReference} onChange={(e) => setOfferReference(e.target.value)} />
                    </div>
                    <Input label="Désignation" required value={offerDesignation} onChange={(e) => setOfferDesignation(e.target.value)} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Cadence (p/h)" type="number" required min="1" step="0.01" value={offerCadence} onChange={(e) => setOfferCadence(e.target.value)} />
                        <Input label="Prix unitaire (€)" type="number" required min="0" step="0.001" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Quantité Offre" type="number" required min="1" value={offerQuantity} onChange={(e) => setOfferQuantity(e.target.value)} />
                        <Input label="Seuil d'alerte" type="number" required min="0" value={offerAlert} onChange={(e) => setOfferAlert(e.target.value)} />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsOfferModalOpen(false)}>Annuler</Button>
                        <Button type="submit" variant="primary">Enregistrer</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
