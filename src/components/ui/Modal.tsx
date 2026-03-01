import { HTMLAttributes, forwardRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
    ({ className = "", isOpen, onClose, title, children, ...props }, ref) => {

        const [mounted, setMounted] = useState(false);

        // Prevent scrolling when modal is open
        useEffect(() => {
            setMounted(true);
            if (isOpen) {
                document.body.style.overflow = "hidden";
            } else {
                document.body.style.overflow = "unset";
            }
            return () => { document.body.style.overflow = "unset"; };
        }, [isOpen]);

        if (!isOpen || !mounted) return null;

        return createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 dark:bg-background-dark/80 backdrop-blur-sm">
                {/* Backdrop (clickable to close) */}
                <div
                    className="absolute inset-0"
                    onClick={onClose}
                    aria-hidden="true"
                />

                {/* Modal content */}
                <div
                    ref={ref}
                    className={`relative w-full max-w-lg rounded-xl border border-slate-200 dark:border-primary/30 bg-white dark:bg-surface-dark shadow-xl dark:shadow-[0_0_40px_rgba(0,160,153,0.15)] flex flex-col max-h-[90vh] ${className}`}
                    role="dialog"
                    aria-modal="true"
                    {...props}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-primary/10">
                        {title && <h2 className="text-xl font-display font-semibold text-slate-900 dark:text-white">{title}</h2>}
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white transition-colors ml-auto"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </div>
            </div>,
            document.body
        );
    }
);
Modal.displayName = "Modal";

export { Modal };
