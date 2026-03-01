import { useEffect, useState } from "react";
import { getSettings, updateSettings, Setting, isDesktop, exportMemoryDbToJson, importMemoryDbFromJson } from "../lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Save, Download, Upload, Moon, Sun } from "lucide-react";
import { copyFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { save, open, ask, message } from "@tauri-apps/plugin-dialog";
import { useTheme } from "../lib/theme-context";

export default function SettingsPage() {
    const [settings, setSettings] = useState<Setting | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            setLoading(true);
            const data = await getSettings();
            if (data) {
                setSettings(data);
            } else {
                console.error("Settings data is empty");
            }
        } catch (err) {
            console.error("Failed to load settings:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!settings) return;

        setSaving(true);
        try {
            await updateSettings(settings);
        } catch (err) {
            console.error("Failed to save settings:", err);
        } finally {
            setSaving(false);
        }
    }

    async function handleExportBackup() {
        if (saving) return;
        setSaving(true);
        try {
            if (isDesktop) {
                const destPath = await save({
                    filters: [{ name: "SQLite Database", extensions: ["db"] }],
                    defaultPath: "sorting_backup.db"
                });

                if (destPath) {
                    await copyFile("sorting.db", destPath, { fromPathBaseDir: BaseDirectory.AppData });
                    await message("Sauvegarde exportée avec succès !", { title: "Succès", kind: "info" });
                }
            } else {
                const jsonStr = exportMemoryDbToJson();
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `SortingERP_Project_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                alert("Projet sauvegardé avec succès !");
            }
        } catch (err) {
            console.error("Export failed:", err);
            if (isDesktop) {
                await message("Erreur lors de l'exportation : " + err, { title: "Erreur", kind: "error" });
            } else {
                alert("Erreur lors de l'exportation : " + err);
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleImportBackup() {
        if (saving) return;
        try {
            if (isDesktop) {
                const selected = await open({
                    filters: [{ name: "SQLite Database", extensions: ["db"] }],
                    multiple: false
                });

                if (selected) {
                    const confirmImport = await ask("Attention : Cela va écraser toutes vos données actuelles. Voulez-vous continuer ?", {
                        title: "Confirmation d'importation",
                        kind: "warning",
                        okLabel: "Oui, importer",
                        cancelLabel: "Annuler"
                    });

                    if (!confirmImport) return;

                    setSaving(true);
                    await copyFile(selected as string, "sorting.db", { toPathBaseDir: BaseDirectory.AppData });
                    await message("Importation réussie ! L'application va redémarrer.", { title: "Succès", kind: "info" });
                    window.location.reload();
                }
            } else {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e: Event) => {
                    const target = e.target as HTMLInputElement;
                    const file = target.files?.[0];
                    if (!file) return;

                    const confirmImport = window.confirm("Attention : Cela va écraser vos données actuelles en mémoire. Continuer ?");
                    if (!confirmImport) return;

                    setSaving(true);
                    const text = await file.text();
                    const success = importMemoryDbFromJson(text);
                    if (success) {
                        alert("Projet chargé avec succès !");
                        await loadSettings();
                    } else {
                        alert("Erreur: Le fichier JSON est invalide ou corrompu.");
                        setSaving(false);
                    }
                };
                input.click();
            }
        } catch (err) {
            console.error("Import failed:", err);
            if (isDesktop) {
                await message("Erreur lors de l'importation : " + err, { title: "Erreur", kind: "error" });
            } else {
                alert("Erreur: " + err);
            }
        } finally {
            if (isDesktop) { setSaving(false); }
        }
    }

    if (loading || !settings) {
        return (
            <div className="p-8 max-w-3xl mx-auto flex flex-col items-center justify-center mt-20 space-y-4">
                <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin"></div>
                <p className="text-slate-500 dark:text-slate-400 animate-pulse font-mono text-sm">Chargement des paramètres...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-2">Réglages Système</h2>
                <p className="text-slate-500 dark:text-slate-400">Gérez vos préférences, alertes et modèles d'e-mails.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Général</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">Alertes de Stock</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Activer les avertissements lors des tris</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={Boolean(settings?.alerts_enabled)}
                                    onChange={(e) => setSettings({ ...settings!, alerts_enabled: e.target.checked ? 1 : 0 })}
                                />
                                <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-background-dark/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">Thème de l'application</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Basculer entre le mode clair et sombre</p>
                            </div>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-background-dark ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200 border border-slate-300'}`}
                            >
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${theme === 'dark' ? 'translate-x-[26px]' : 'translate-x-[2px]'}`}
                                >
                                    <span className="flex h-full w-full items-center justify-center">
                                        {theme === 'dark' ? <Moon className="h-3.5 w-3.5 text-primary" /> : <Sun className="h-4 w-4 text-emerald-500" />}
                                    </span>
                                </span>
                            </button>
                        </div>

                        <div className="w-1/2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1 mb-1 block">Format d'export par défaut</label>
                            <select
                                value={settings?.export_default_format || "xlsx"}
                                onChange={(e) => setSettings({ ...settings!, export_default_format: e.target.value })}
                                className="w-full h-10 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="xlsx">Excel (.xlsx)</option>
                                <option value="csv">CSV (.csv)</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Modèles d'E-mail</CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Utilisez <code className="text-primary bg-slate-100 dark:bg-background-dark px-1 py-0.5 rounded">{`{{project_number}}`}</code> ou <code className="text-primary bg-slate-100 dark:bg-background-dark px-1 py-0.5 rounded">{`{{reference}}`}</code> pour injecter du contexte.</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Input
                            label="Sujet de l'e-mail par défaut"
                            value={settings?.email_subject_template || ""}
                            onChange={(e) => setSettings({ ...settings!, email_subject_template: e.target.value })}
                        />

                        <div className="w-full flex flex-col gap-1.5">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                                Corps de l'e-mail par défaut
                            </label>
                            <textarea
                                rows={6}
                                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-background-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary transition-colors resize-y custom-scrollbar"
                                value={settings?.email_body_template || ""}
                                onChange={(e) => setSettings({ ...settings!, email_body_template: e.target.value })}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Sauvegarde & Restauration</CardTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Exportez l'intégralité de vos données ou restaurez une ancienne version.</p>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button type="button" variant="secondary" className="gap-2 h-16 border-dashed" onClick={handleExportBackup}>
                            <Download className="w-5 h-5" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-900 dark:text-white">Sauvegarder</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">Exporter vers un fichier {isDesktop ? ".db" : ".json"}</div>
                            </div>
                        </Button>
                        <Button type="button" variant="secondary" className="gap-2 h-16 border-dashed" onClick={handleImportBackup}>
                            <Upload className="w-5 h-5 text-primary" />
                            <div className="text-left">
                                <div className="font-semibold text-slate-900 dark:text-white">Restaurer</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">Importer un fichier {isDesktop ? ".db" : ".json"}</div>
                            </div>
                        </Button>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" variant="primary" className="gap-2" disabled={saving}>
                        <Save className="w-4 h-4" />
                        {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
