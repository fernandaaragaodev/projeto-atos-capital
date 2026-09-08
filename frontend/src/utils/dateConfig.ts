import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

/** Formato de exibição padrão do Design System: DD/MM/YYYY */
export const DATE_DISPLAY_FORMAT = 'DD/MM/YYYY';

dayjs.locale('pt-br');

export function formatDate(value: string | number | Date | dayjs.Dayjs | undefined | null): string {
  if (!value) return '';
  return dayjs(value).format(DATE_DISPLAY_FORMAT);
}

export default dayjs;
