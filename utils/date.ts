export function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

/**
 * Format a date string to DD-MM-YYYY HH:MM
 */
export function formatDateTime(value: string | Date | null | undefined): string {
    if (!value) return '';
    const d = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

/**
 * Parse DD-MM-YYYY string to ISO date string (YYYY-MM-DD)
 */
export function parseDDMMYYYY(value: string): string {
    const [dd, mm, yyyy] = value.split('-');
    return `${yyyy}-${mm}-${dd}`;
}
