import { HTMLAttributes, forwardRef } from "react";

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "success" | "warning" | "danger" | "outline";
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
    ({ className = "", variant = "default", ...props }, ref) => {
        let variantStyles = "";
        switch (variant) {
            case "default":
                variantStyles = "bg-primary/20 text-neon-accent border-transparent";
                break;
            case "success":
                variantStyles = "bg-primary/20 text-primary border-transparent";
                break;
            case "warning":
                variantStyles = "bg-slate-500/20 text-slate-300 border-transparent shadow-[0_0_10px_rgba(255,255,255,0.1)]";
                break;
            case "danger":
                variantStyles = "bg-red-500/20 text-red-500 border-transparent shadow-[0_0_10px_rgba(239,68,68,0.4)]";
                break;
            case "outline":
                variantStyles = "text-slate-300 border-slate-700";
                break;
        }

        return (
            <div
                ref={ref}
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantStyles} ${className}`}
                {...props}
            />
        );
    }
);
Badge.displayName = "Badge";

export { Badge };
