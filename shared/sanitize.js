/**
 * TBFS Sanitize Module
 * HTML-escaping for any user-controlled value interpolated into markup.
 *
 * F-04 remediation: client names, notes, account numbers and any other
 * stored strings MUST pass through esc() before being placed inside an
 * innerHTML template literal. The escape set covers text nodes and
 * double- or single-quoted attribute values.
 *
 * Version: 1.0.0
 */

const Sanitize = {
    /**
     * Escape a value for safe interpolation into HTML.
     * Always returns a string; null/undefined become ''.
     */
    esc(value) {
        const s = String(value ?? '');
        return s.replace(/[&<>"']/g, (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c]));
    }
};

// Global convenience alias used throughout the pages: ${esc(loan.client_name)}
if (typeof window !== 'undefined') {
    window.Sanitize = Sanitize;
    window.esc = Sanitize.esc;
}

// Export for Node-based tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Sanitize;
}
