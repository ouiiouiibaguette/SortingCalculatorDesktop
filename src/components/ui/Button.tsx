import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "accent" | "orange" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
        let variantStyles = "";
        switch (variant) {
            case "primary":
                variantStyles = "bg-primary/20 text-neon-accent hover:bg-primary/30 border border-primary/50 hover:shadow-neon";
                break;
            case "secondary":
                variantStyles = "bg-white dark:bg-surface-dark text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 shadow-sm dark:shadow-none";
                break;
            case "accent":
                variantStyles = "bg-neon-accent text-background-dark hover:bg-neon-accent/90 shadow-[0_0_15px_rgba(0,255,213,0.4)]";
                break;
            case "orange":
                variantStyles = "bg-neon-orange text-white hover:bg-neon-orange/90 shadow-neon-orange border border-neon-orange/50";
                break;
            case "ghost":
                variantStyles = "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5";
                break;
            case "danger":
                variantStyles = "bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20";
                break;
        }

        let sizeStyles = "";
        switch (size) {
            case "sm": sizeStyles = "px-3 py-1.5 text-sm"; break;
            case "md": sizeStyles = "px-4 py-2"; break;
            case "lg": sizeStyles = "px-6 py-3 text-lg font-bold"; break;
        }

        return (
            <button
                ref={ref}
                className={`inline-flex items-center justify-center rounded-lg font-display transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${variantStyles} ${sizeStyles} ${className}`}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
