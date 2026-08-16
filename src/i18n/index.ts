import { en } from './en';

export const messages = {
  en,
} as const;

export type SupportedLocale = keyof typeof messages;
export type MessageCatalog = (typeof messages)[SupportedLocale];
