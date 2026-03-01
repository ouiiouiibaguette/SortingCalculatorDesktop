import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes, forwardRef } from "react";

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
    ({ className = "", ...props }, ref) => (
        <div className="w-full overflow-auto rounded-lg border border-slate-200 dark:border-primary/20 bg-white dark:bg-surface-dark shadow-sm dark:shadow-none">
            <table
                ref={ref}
                className={`w-full caption-bottom text-sm ${className}`}
                {...props}
            />
        </div>
    )
);
Table.displayName = "Table";

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
    ({ className = "", ...props }, ref) => (
        <thead ref={ref} className={`bg-slate-50 dark:bg-background-dark/80 border-b border-slate-200 dark:border-primary/20 ${className}`} {...props} />
    )
);
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
    ({ className = "", ...props }, ref) => (
        <tbody
            ref={ref}
            className={`[&_tr:last-child]:border-0 divide-y divide-slate-100 dark:divide-primary/10 ${className}`}
            {...props}
        />
    )
);
TableBody.displayName = "TableBody";

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
    ({ className = "", ...props }, ref) => (
        <tr
            ref={ref}
            className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/5 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-primary/20 ${className}`}
            {...props}
        />
    )
);
TableRow.displayName = "TableRow";

const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
    ({ className = "", ...props }, ref) => (
        <th
            ref={ref}
            className={`h-12 px-4 text-left align-middle font-medium text-slate-500 dark:text-slate-400 [&:has([role=checkbox])]:pr-0 ${className}`}
            {...props}
        />
    )
);
TableHead.displayName = "TableHead";

const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
    ({ className = "", ...props }, ref) => (
        <td
            ref={ref}
            className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 text-slate-700 dark:text-slate-200 ${className}`}
            {...props}
        />
    )
);
TableCell.displayName = "TableCell";

export {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
};
