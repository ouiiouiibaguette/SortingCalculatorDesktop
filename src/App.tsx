import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { Calculator, Database, LayoutDashboard, Settings, Monitor, Globe, ChevronRight, TrendingUp } from "lucide-react";
import { isDesktop } from "./lib/db";

import CalculatorPage from "./pages/Calculator";
import DatabasePage from "./pages/Database";
import DashboardPage from "./pages/Dashboard";
import SettingsPage from "./pages/Settings";
import MajorationsPage from "./pages/Majorations";
import { ThemeProvider } from "./lib/theme-context";

export default function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <div className="flex h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-300">
                    <Sidebar />

                    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
                        <Header />

                        <main className="flex-1 overflow-y-auto overflow-x-hidden relative p-4 sm:p-6 lg:p-8">
                            <div className="max-w-[1600px] mx-auto">
                                <Routes>
                                    <Route path="/" element={<CalculatorPage />} />
                                    <Route path="/majorations" element={<MajorationsPage />} />
                                    <Route path="/database" element={<DatabasePage />} />
                                    <Route path="/dashboard" element={<DashboardPage />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                </Routes>
                            </div>
                        </main>
                    </div>
                </div>
            </BrowserRouter>
        </ThemeProvider>
    );
}

function Header() {
    return (
        <header className="h-16 border-b border-slate-200 dark:border-primary/10 bg-white/50 dark:bg-surface-dark/50 backdrop-blur-md flex items-center justify-between px-8 shrink-0 relative z-20">
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>TriSuite ERP</span>
                <ChevronRight className="w-4 h-4 opacity-30" />
                <span className="text-slate-900 dark:text-white font-medium">Portail de Gestion</span>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-primary/5 border border-slate-200 dark:border-primary/10">
                    {isDesktop ? (
                        <>
                            <Monitor className="w-3.5 h-3.5 text-neon-accent" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Desktop (SQLite)</span>
                        </>
                    ) : (
                        <>
                            <Globe className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Web Portal (IndexedDB)</span>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

function Sidebar() {
    return (
        <aside className="w-20 lg:w-64 shrink-0 bg-white dark:bg-surface-dark border-r border-slate-200 dark:border-primary/20 flex flex-col py-6 relative z-30 shadow-xl transition-all duration-300 group">
            {/* Brand */}
            <div className="px-4 mb-10 flex lg:block justify-center">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 lg:w-10 lg:h-10 shrink-0 rounded-xl bg-gradient-to-br from-primary to-neon-accent flex items-center justify-center shadow-neon">
                        <Calculator className="w-6 h-6 lg:w-5 lg:h-5 text-background-dark" />
                    </div>
                    <div className="hidden lg:block overflow-hidden whitespace-nowrap">
                        <h1 className="text-lg font-display font-bold text-slate-900 dark:text-white leading-tight">
                            TriSuite<span className="text-neon-accent italic">.</span>
                        </h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Solutions ERP</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                <NavItem to="/" icon={<Calculator />} label="Calculatrice" />
                <NavItem to="/majorations" icon={<TrendingUp />} label="Majorations" />
                <NavItem to="/database" icon={<Database />} label="Données" />
                <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Tableau de Bord" />
                <div className="my-4 border-t border-slate-100 dark:border-primary/5 mx-2" />
                <NavItem to="/settings" icon={<Settings />} label="Paramètres" />
            </nav>

            {/* Footer */}
            <div className="px-4 mt-auto">
                <div className="rounded-xl bg-slate-50 dark:bg-background-dark/50 p-3 hidden lg:block border border-slate-100 dark:border-primary/5">
                    <p className="text-[10px] text-slate-400 font-mono mb-1">ST-CALC v1.2.0</p>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-neon-accent animate-pulse shadow-neon"></div>
                        <span className="text-[10px] font-bold text-neon-accent uppercase tracking-tighter">Connecté</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 w-full px-4 lg:px-4 py-3 rounded-xl transition-all duration-300 group/nav ${isActive
                    ? "bg-slate-900 dark:bg-primary/20 text-white dark:text-neon-accent shadow-lg"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                }`
            }
        >
            <div className="shrink-0 group-hover/nav:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <span className="hidden lg:block font-display font-medium text-sm tracking-wide">{label}</span>
        </NavLink>
    );
}
