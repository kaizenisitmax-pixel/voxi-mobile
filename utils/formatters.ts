/**
 * Common Formatting Utilities
 * Phone, currency, file size, etc.
 */

/**
 * Format phone number (Turkish format)
 * Example: "5551234567" -> "+90 555 123 45 67"
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 90, assume it's international
  if (digits.startsWith('90') && digits.length === 12) {
    return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  
  // If 10 digits, assume Turkish mobile
  if (digits.length === 10) {
    return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
  }
  
  // If 11 digits starting with 0, remove leading 0
  if (digits.length === 11 && digits.startsWith('0')) {
    const cleaned = digits.slice(1);
    return `+90 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }
  
  // Return as-is if format is unclear
  return phone;
}

/**
 * Format currency (Turkish Lira)
 * Example: 1234.56 -> "₺1.234,56"
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '₺0,00';
  
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number (Turkish locale)
 * Example: 1234567 -> "1.234.567"
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '0';
  
  return new Intl.NumberFormat('tr-TR').format(num);
}

/**
 * Format file size
 * Example: 1536 -> "1.5 KB", 1048576 -> "1.0 MB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(1)} ${sizes[i]}`;
}

/**
 * Format percentage
 * Example: 0.75 -> "75%"
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0%';
  
  return `${Math.round(value * 100)}%`;
}

/**
 * Truncate text with ellipsis
 * Example: "Long text here", 10 -> "Long text..."
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Get initials from name
 * Example: "Ahmet Yılmaz" -> "AY"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Capitalize first letter
 * Example: "hello world" -> "Hello world"
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Capitalize each word
 * Example: "hello world" -> "Hello World"
 */
export function capitalizeWords(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
