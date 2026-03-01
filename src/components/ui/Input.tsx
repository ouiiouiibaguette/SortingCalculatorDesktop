import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className = "", error, label, ...props }, ref) => {
        return (
            <div className="w-full flex flex-col gap-1.5">
                {label && (
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`flex h-10 w-full rounded-md border bg-white dark:bg-background-dark px-3 py-2 text-sm text-slate-900 dark:text-slate-100 
            file:border-0 file:bg-transparent file:text-sm file:font-medium 
            placeholder:text-slate-400 dark:placeholder:text-slate-500 
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-accent focus-visible:border-transparent
            disabled:cursor-not-allowed disabled:opacity-50 transition-colors
            ${error ? "border-red-500 focus-visible:ring-red-500" : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"}
            ${className}`}
                    {...props}
                />
                {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
