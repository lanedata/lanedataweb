// País del visitante SIN mirar la IP.
//
// Un sitio estático no tiene servidor donde leer cabeceras de geolocalización,
// y resolver la IP contra un servicio externo significaría enviar la IP a un
// tercero (justo lo que la política de privacidad promete no hacer). Así que
// deducimos el país de dos señales que el navegador ya publica y que no
// identifican a nadie: la zona horaria y el idioma configurado.
//
// La zona horaria manda porque un español con el navegador en inglés sigue
// teniendo Europe/Madrid. Si la zona no está en la tabla, caemos al sufijo de
// región del idioma ("es-AR" → AR). La zona horaria completa se guarda igual en
// `timezone`, así que ninguna visita se pierde aunque no sepamos mapearla.

const TZ_COUNTRY: Record<string, string> = {
  // ── España y alrededores ──────────────────────────────────────────────────
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES',
  'Europe/Lisbon': 'PT', 'Atlantic/Azores': 'PT', 'Atlantic/Madeira': 'PT',
  'Europe/Andorra': 'AD', 'Europe/Gibraltar': 'GI',

  // ── Resto de Europa ───────────────────────────────────────────────────────
  'Europe/Paris': 'FR', 'Europe/Monaco': 'MC', 'Europe/Brussels': 'BE',
  'Europe/Amsterdam': 'NL', 'Europe/Luxembourg': 'LU', 'Europe/London': 'GB',
  'Europe/Dublin': 'IE', 'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE',
  'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT', 'Europe/Rome': 'IT',
  'Europe/Vatican': 'VA', 'Europe/San_Marino': 'SM', 'Europe/Malta': 'MT',
  'Europe/Copenhagen': 'DK', 'Europe/Oslo': 'NO', 'Europe/Stockholm': 'SE',
  'Europe/Helsinki': 'FI', 'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV',
  'Europe/Vilnius': 'LT', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ',
  'Europe/Bratislava': 'SK', 'Europe/Budapest': 'HU', 'Europe/Ljubljana': 'SI',
  'Europe/Zagreb': 'HR', 'Europe/Sarajevo': 'BA', 'Europe/Belgrade': 'RS',
  'Europe/Podgorica': 'ME', 'Europe/Skopje': 'MK', 'Europe/Tirane': 'AL',
  'Europe/Athens': 'GR', 'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG',
  'Europe/Chisinau': 'MD', 'Europe/Kyiv': 'UA', 'Europe/Kiev': 'UA',
  'Europe/Minsk': 'BY', 'Europe/Moscow': 'RU', 'Europe/Kaliningrad': 'RU',
  'Europe/Samara': 'RU', 'Asia/Yekaterinburg': 'RU', 'Asia/Novosibirsk': 'RU',
  'Asia/Krasnoyarsk': 'RU', 'Asia/Irkutsk': 'RU', 'Asia/Vladivostok': 'RU',
  'Europe/Istanbul': 'TR', 'Europe/Nicosia': 'CY', 'Asia/Nicosia': 'CY',
  'Atlantic/Reykjavik': 'IS', 'Atlantic/Faroe': 'FO',
  'Europe/Isle_of_Man': 'IM', 'Europe/Jersey': 'JE', 'Europe/Guernsey': 'GG',

  // ── América del Norte ─────────────────────────────────────────────────────
  'America/New_York': 'US', 'America/Detroit': 'US', 'America/Chicago': 'US',
  'America/Denver': 'US', 'America/Phoenix': 'US', 'America/Los_Angeles': 'US',
  'America/Anchorage': 'US', 'America/Indiana/Indianapolis': 'US',
  'America/Kentucky/Louisville': 'US', 'America/Boise': 'US',
  'Pacific/Honolulu': 'US', 'America/Puerto_Rico': 'PR',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA',
  'America/Regina': 'CA', 'America/Mexico_City': 'MX', 'America/Monterrey': 'MX',
  'America/Tijuana': 'MX', 'America/Cancun': 'MX', 'America/Chihuahua': 'MX',
  'America/Merida': 'MX', 'America/Hermosillo': 'MX', 'America/Mazatlan': 'MX',

  // ── América Central y Caribe ──────────────────────────────────────────────
  'America/Guatemala': 'GT', 'America/Belize': 'BZ', 'America/El_Salvador': 'SV',
  'America/Tegucigalpa': 'HN', 'America/Managua': 'NI', 'America/Costa_Rica': 'CR',
  'America/Panama': 'PA', 'America/Havana': 'CU', 'America/Santo_Domingo': 'DO',
  'America/Port-au-Prince': 'HT', 'America/Jamaica': 'JM', 'America/Nassau': 'BS',
  'America/Barbados': 'BB', 'America/Port_of_Spain': 'TT', 'America/Curacao': 'CW',
  'America/Aruba': 'AW', 'America/Grand_Turk': 'TC',

  // ── América del Sur ───────────────────────────────────────────────────────
  'America/Bogota': 'CO', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC',
  'Pacific/Galapagos': 'EC', 'America/Lima': 'PE', 'America/La_Paz': 'BO',
  'America/Asuncion': 'PY', 'America/Montevideo': 'UY', 'America/Santiago': 'CL',
  'Pacific/Easter': 'CL', 'America/Argentina/Buenos_Aires': 'AR',
  'America/Argentina/Cordoba': 'AR', 'America/Argentina/Mendoza': 'AR',
  'America/Argentina/Salta': 'AR', 'America/Argentina/Tucuman': 'AR',
  'America/Argentina/Ushuaia': 'AR', 'America/Sao_Paulo': 'BR',
  'America/Bahia': 'BR', 'America/Fortaleza': 'BR', 'America/Recife': 'BR',
  'America/Manaus': 'BR', 'America/Belem': 'BR', 'America/Cuiaba': 'BR',
  'America/Porto_Velho': 'BR', 'America/Guyana': 'GY', 'America/Paramaribo': 'SR',
  'America/Cayenne': 'GF',

  // ── África ────────────────────────────────────────────────────────────────
  'Africa/Casablanca': 'MA', 'Africa/El_Aaiun': 'EH', 'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN', 'Africa/Tripoli': 'LY', 'Africa/Cairo': 'EG',
  'Africa/Khartoum': 'SD', 'Africa/Addis_Ababa': 'ET', 'Africa/Nairobi': 'KE',
  'Africa/Kampala': 'UG', 'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kigali': 'RW',
  'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Abidjan': 'CI',
  'Africa/Dakar': 'SN', 'Africa/Bamako': 'ML', 'Africa/Ouagadougou': 'BF',
  'Africa/Conakry': 'GN', 'Africa/Freetown': 'SL', 'Africa/Monrovia': 'LR',
  'Africa/Douala': 'CM', 'Africa/Libreville': 'GA', 'Africa/Malabo': 'GQ',
  'Africa/Kinshasa': 'CD', 'Africa/Lubumbashi': 'CD', 'Africa/Luanda': 'AO',
  'Africa/Lusaka': 'ZM', 'Africa/Harare': 'ZW', 'Africa/Maputo': 'MZ',
  'Africa/Gaborone': 'BW', 'Africa/Windhoek': 'NA', 'Africa/Johannesburg': 'ZA',
  'Indian/Antananarivo': 'MG', 'Indian/Mauritius': 'MU', 'Atlantic/Cape_Verde': 'CV',

  // ── Oriente Medio ─────────────────────────────────────────────────────────
  'Asia/Jerusalem': 'IL', 'Asia/Hebron': 'PS', 'Asia/Gaza': 'PS',
  'Asia/Beirut': 'LB', 'Asia/Damascus': 'SY', 'Asia/Amman': 'JO',
  'Asia/Baghdad': 'IQ', 'Asia/Kuwait': 'KW', 'Asia/Riyadh': 'SA',
  'Asia/Bahrain': 'BH', 'Asia/Qatar': 'QA', 'Asia/Dubai': 'AE',
  'Asia/Muscat': 'OM', 'Asia/Aden': 'YE', 'Asia/Tehran': 'IR',

  // ── Asia ──────────────────────────────────────────────────────────────────
  'Asia/Karachi': 'PK', 'Asia/Kabul': 'AF', 'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP',
  'Asia/Dhaka': 'BD', 'Asia/Thimphu': 'BT', 'Asia/Yangon': 'MM',
  'Asia/Bangkok': 'TH', 'Asia/Vientiane': 'LA', 'Asia/Phnom_Penh': 'KH',
  'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Kuala_Lumpur': 'MY',
  'Asia/Singapore': 'SG', 'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID', 'Asia/Manila': 'PH', 'Asia/Brunei': 'BN',
  'Asia/Hong_Kong': 'HK', 'Asia/Macau': 'MO', 'Asia/Taipei': 'TW',
  'Asia/Shanghai': 'CN', 'Asia/Urumqi': 'CN', 'Asia/Seoul': 'KR',
  'Asia/Pyongyang': 'KP', 'Asia/Tokyo': 'JP', 'Asia/Ulaanbaatar': 'MN',
  'Asia/Almaty': 'KZ', 'Asia/Tashkent': 'UZ', 'Asia/Ashgabat': 'TM',
  'Asia/Dushanbe': 'TJ', 'Asia/Bishkek': 'KG', 'Asia/Baku': 'AZ',
  'Asia/Tbilisi': 'GE', 'Asia/Yerevan': 'AM',

  // ── Oceanía ───────────────────────────────────────────────────────────────
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU', 'Pacific/Auckland': 'NZ', 'Pacific/Fiji': 'FJ',
  'Pacific/Port_Moresby': 'PG', 'Pacific/Guam': 'GU', 'Pacific/Noumea': 'NC',
  'Pacific/Tahiti': 'PF', 'Pacific/Apia': 'WS', 'Pacific/Tongatapu': 'TO',
}

/** Zona horaria IANA del navegador, o cadena vacía si no se puede leer. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  } catch {
    return ''
  }
}

/** Código ISO de dos letras del país, o cadena vacía si no hay forma de saberlo. */
export function detectCountry(timezone = detectTimezone()): string {
  const fromTz = TZ_COUNTRY[timezone]
  if (fromTz) return fromTz

  // "es-AR" → AR. Solo vale si el idioma trae región explícita.
  const lang = typeof navigator !== 'undefined' ? navigator.language : ''
  const region = lang.split('-')[1]
  if (region && /^[A-Za-z]{2}$/.test(region)) return region.toUpperCase()

  return ''
}

let displayNames: Intl.DisplayNames | null | undefined

/** "ES" → "España". Si el navegador no sabe, devuelve el propio código. */
export function countryName(code: string): string {
  if (!code) return 'Desconocido'
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(['es'], { type: 'region' })
    } catch {
      displayNames = null
    }
  }
  try {
    return displayNames?.of(code) ?? code
  } catch {
    return code
  }
}

/** Bandera emoji a partir del código ISO. "ES" → 🇪🇸 */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return '🏳️'
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}
