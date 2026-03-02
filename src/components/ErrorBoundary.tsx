import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./ui/Button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background-dark p-4">
                    <div className="max-w-md w-full bg-white dark:bg-surface-dark border p-6 rounded-2xl shadow-xl border-red-500/20 text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Oups, une erreur est survenue</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            L'application a rencontré un problème inattendu et n'a pas pu continuer.
                            <br />
                            <br />
                            <code className="bg-slate-100 dark:bg-black/50 p-2 rounded block text-left text-xs text-red-600 dark:text-red-400 overflow-x-auto">
                                {this.state.error?.message || "Erreur inconnue"}
                            </code>
                        </p>
                        <Button
                            onClick={this.handleReset}
                            className="w-full relative overflow-hidden group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <RefreshCcw className="w-4 h-4" />
                                Recharger l'application
                            </span>
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
