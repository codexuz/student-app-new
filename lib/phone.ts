/** Uzbekistan mobile numbers: `+998` followed by 9 digits. */
export const UZ_COUNTRY_CODE = '+998';
const NATIONAL_NUMBER_LENGTH = 9;

/** Strips everything but digits and caps at the national number length, so a paste of `+998 90 123 45 67` behaves the same as typing it. */
export function digitsOnly(input: string): string {
  return input.replace(/\D/g, '').slice(0, NATIONAL_NUMBER_LENGTH);
}

/** `901234567` -> `90 123 45 67`, built up as the user types rather than all at once. */
export function formatNationalNumber(digits: string): string {
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(' ');
}

export function isCompleteNationalNumber(digits: string): boolean {
  return digits.length === NATIONAL_NUMBER_LENGTH;
}

export function toE164(digits: string): string {
  return `${UZ_COUNTRY_CODE}${digits}`;
}
