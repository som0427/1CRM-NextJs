// utils/userLocalizationService.ts
import moment from 'moment-timezone';

export class UserLocalizationService {
  static getLocalTimeZone(): string {
    if (typeof window !== 'undefined') {
      return moment.tz.guess(); // Only works in browser
    }
    return 'UTC'; // Default fallback for server
  }

  static getUserTime(): string {
    return moment().format('YYYY-MM-DD HH:mm:ss');
  }

  static getUserTimeZoneCode(): string {
    return moment.tz(this.getLocalTimeZone()).format('z');
  }

  static getFormattedDateTimeAsInt(date: Date): number {
    const formattedDate = moment(date).format('MMDDHHmmss');
    return parseInt(formattedDate, 10);
  }

  static formatDate(value: string, format: string = 'YYYY-MM-DD'): string {
    if (!value) return '-';
    const parsed = moment(value, 'YYYY-MM-DD HH:mm:ss');
    return parsed.isValid() ? parsed.format(format) : '-';
  }

  static formatToAmPm(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    return `${yyyy}-${mm}-${dd} ${time}`;
  }
}