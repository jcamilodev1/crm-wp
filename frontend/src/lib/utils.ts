import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea una fecha de forma segura para mostrar "hace X tiempo"
 * @param dateValue - Valor de fecha (string, number, Date, undefined)
 * @param fallback - Texto por defecto si la fecha es inválida
 * @returns String formateado con la distancia de tiempo
 */
export function safeFormatDistanceToNow(
  dateValue: string | number | Date | undefined | null,
  fallback: string = 'ahora'
): string {
  if (!dateValue) {
    return fallback;
  }

  try {
    const date = new Date(dateValue);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      return fallback;
    }

    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: es 
    });
  } catch (error) {
    console.warn('Error formatting date:', dateValue, error);
    return fallback;
  }
}

/**
 * Formatea un número de teléfono mexicano
 * @param phone - Número de teléfono
 * @returns Número formateado
 */
export function formatPhoneNumber(phone?: string): string {
  if (!phone) return 'Sin teléfono';
  
  // Formatear número mexicano
  if (phone.startsWith('521') && phone.length >= 12) {
    return `+52 ${phone.slice(3, 5)} ${phone.slice(5, 9)} ${phone.slice(9)}`;
  }
  
  // Formatear otros números con +52
  if (phone.startsWith('52') && phone.length >= 11) {
    return `+52 ${phone.slice(2, 4)} ${phone.slice(4, 8)} ${phone.slice(8)}`;
  }
  
  return phone;
}

/**
 * Formatea bytes a formato legible
 * @param bytes - Cantidad de bytes
 * @returns String formateado (ej: "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Formatea tiempo de uptime en formato legible
 * @param seconds - Segundos de uptime
 * @returns String formateado (ej: "2d 3h 15m")
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}