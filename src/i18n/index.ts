import { en } from './en';
import { zhTW } from './zh-TW';
export const messages = { en, 'zh-TW': zhTW } as const;
export type SupportedLocale = keyof typeof messages;
export type MessageCatalog = { [K in keyof typeof en]: string };
export function getMessages(locale: string = 'zh-TW'): MessageCatalog {
  return locale === 'en' ? messages.en : messages['zh-TW'];
}
