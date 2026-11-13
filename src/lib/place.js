// Where the visitor is, as far as the browser says: the time zone and the language list. Nothing is sent anywhere.
//   place.lang()      'ru' for Russia and the CIS, or for anyone whose browser prefers Russian; 'en' otherwise
//   place.currency()  'RUB' in Russia and the CIS, 'EUR' in the eurozone, 'USD' elsewhere
// Port of the reference place.js. When you rebrand for other markets, change the zones and the currencies here.
const RU = /^(Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Saratov|Astrakhan|Ulyanovsk|Kirov|Simferopol|Minsk|Chisinau)|Asia\/(Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Khandyga|Vladivostok|Ust-Nera|Magadan|Sakhalin|Srednekolymsk|Kamchatka|Anadyr|Almaty|Qyzylorda|Qostanay|Aqtobe|Aqtau|Atyrau|Oral|Bishkek|Tashkent|Samarkand|Dushanbe|Ashgabat|Yerevan|Baku))$/;
const EUR = /^(Europe\/(Berlin|Busingen|Paris|Madrid|Rome|Amsterdam|Brussels|Vienna|Lisbon|Dublin|Helsinki|Mariehamn|Athens|Luxembourg|Malta|Bratislava|Ljubljana|Tallinn|Riga|Vilnius|Zagreb|Sofia|Nicosia|Andorra|Monaco|San_Marino|Vatican|Podgorica)|Asia\/Nicosia|Atlantic\/(Azores|Madeira|Canary)|Africa\/Ceuta)$/;

export const zone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } };
export const speaks = () => {
  const l = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  return [...l].map((x) => String(x).slice(0, 2).toLowerCase());
};
const russian = () => RU.test(zone());

export const place = {
  lang: () => (russian() || speaks()[0] === 'ru' ? 'ru' : 'en'),
  currency: () => {
    const z = zone();
    if (RU.test(z)) return 'RUB';
    if (EUR.test(z)) return 'EUR';
    return z ? 'USD' : speaks()[0] === 'ru' ? 'RUB' : 'USD';
  },
};

// Should a visitor on the root page be sent to the English page? Crawlers and unknown zones (UTC) stay where they are.
export function shouldLeaveRoot(chosenLang) {
  const z = zone();
  return !chosenLang && !!z && !/^(UTC|Etc\/|GMT)/.test(z) && !/bot|crawl|spider|yandex|google|bing|slurp/i.test(navigator.userAgent) && !russian() && speaks()[0] !== 'ru';
}
