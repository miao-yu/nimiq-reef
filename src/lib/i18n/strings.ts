/**
 * UI copy.
 *
 * Nimiq Pay seeds the user's chosen language before our script runs, and the
 * SDK docs are explicit that a Mini App should use it. The Nimiq community is
 * substantially German- and Spanish-speaking, so English-only quietly excludes
 * a large part of the audience.
 *
 * English is the source of truth; a missing key falls back to it per key
 * rather than per language, so an unfinished translation degrades to mixed
 * copy instead of blank labels.
 */
export const STRINGS = {
  en: {
    // identity
    claimReef: 'Claim your reef',
    signInWallet: 'Sign in with Nimiq Wallet',
    waitingWallet: 'Waiting for the wallet…',
    signOut: 'Sign out',
    day: 'Day {n}',
    communityReef: 'The community reef',
    reefsLiving: '{n} reefs living',
    claimPrompt:
      'Claim a reef and it starts filling today — staking is optional, and the first discoveries are free.',

    // discovery
    discover: 'Discover',
    discovering: 'Looking…',
    chargesLeft: '{n} of {max} charges',
    chargesFull: 'Full — {max} charges',
    nextCharge: 'Next in {time}',
    noCharges: 'No charges. One comes back every eight hours.',
    found: 'A {label} has appeared.',
    foundRare: 'A {label} has appeared — {tier}.',
    tankFull: 'Your tank is full, so it is waiting in the field guide.',

    // stats
    daysStaked: 'Days staked',
    staked: 'Staked',
    slots: 'Room',
    streak: 'Feed streak',
    unlocksAfter: '{species} unlocks after {n} days staked — {away} to go.',
    everythingUnlocked: 'Every species is within reach.',

    // feeding
    feed: 'Feed the reef',
    fedAlready: 'Fed today',
    feedNote: 'Once a day, free, and nothing ever dies from a missed one.',
    feedStranger: 'Feed someone else',
    feedStrangerNote: 'One a day. Whoever you pick sees that somebody fed them.',
    feedGiven: 'Fed {handle}. That is one a day.',
    feedNeedsApp: 'Feeding other reefs needs Nimiq Pay.',
    fedBy: 'Fed by {n} today',

    // guide
    guide: 'Field guide',
    guideCount: '{found} of {total} discovered',
    locked: 'Day {n}',
    inTank: 'In the tank',
    release: 'Return to the reef',
    display: 'Put on display',
    releasedNote: 'Returned. It stays in your guide forever.',

    // staking
    startStaking: 'Start staking',
    addStake: 'Add to your stake',
    whatFills: '— this is what fills the tank',
    validator: 'Validator',
    chooseValidator: 'Choose one',
    loadingValidators: 'Loading the elected set…',
    noPreference: 'Every elected validator, sorted by address. Reef has no preference.',
    amountNim: 'Amount in NIM',
    minimumNim: 'Minimum {n} NIM. You can unstake whenever you like.',
    delegate: 'Delegate',
    addStakeCta: 'Add stake',
    stakeSent: 'Stake sent',
    stakeSentNote:
      'It counts from the next tick, within fifteen minutes. Your NIM stays in the staking contract under your own address — Reef only reads it.',
    stakeElsewhere:
      'Staking from the browser is not built yet. Stake in the Nimiq Wallet or Nimiq Pay and this reef picks it up within fifteen minutes — Reef reads the chain, so it does not need to be the app that made the transaction.',

    // misc
    shareYours: 'Share your reef',
    shareThis: 'Share this reef',
    linkCopied: 'Link copied',
    chainOffline: "Can't reach the chain right now, so this is from what we last saw. Nothing is lost.",
  },

  de: {
    claimReef: 'Riff beanspruchen',
    signInWallet: 'Mit Nimiq Wallet anmelden',
    waitingWallet: 'Warte auf die Wallet…',
    signOut: 'Abmelden',
    day: 'Tag {n}',
    communityReef: 'Das Gemeinschaftsriff',
    reefsLiving: '{n} Riffe leben',
    claimPrompt:
      'Beanspruche ein Riff und es füllt sich ab heute — Staking ist optional, die ersten Funde sind gratis.',

    discover: 'Entdecken',
    discovering: 'Suche…',
    chargesLeft: '{n} von {max} Ladungen',
    chargesFull: 'Voll — {max} Ladungen',
    nextCharge: 'Nächste in {time}',
    noCharges: 'Keine Ladungen. Alle acht Stunden kommt eine zurück.',
    found: 'Ein {label} ist aufgetaucht.',
    foundRare: 'Ein {label} ist aufgetaucht — {tier}.',
    tankFull: 'Dein Becken ist voll, es wartet im Feldführer.',

    daysStaked: 'Tage gestakt',
    staked: 'Gestakt',
    slots: 'Platz',
    streak: 'Fütter-Serie',
    unlocksAfter: '{species} kommt nach {n} Tagen Staking — noch {away}.',
    everythingUnlocked: 'Jede Art ist in Reichweite.',

    feed: 'Riff füttern',
    fedAlready: 'Heute gefüttert',
    feedNote: 'Einmal am Tag, kostenlos, und nichts stirbt, wenn du es vergisst.',
    feedStranger: 'Jemanden füttern',
    feedStrangerNote: 'Einmal am Tag. Wen du wählst, sieht, dass jemand gefüttert hat.',
    feedGiven: '{handle} gefüttert. Das war deine für heute.',
    feedNeedsApp: 'Andere Riffe füttern geht nur in Nimiq Pay.',
    fedBy: 'Heute von {n} gefüttert',

    guide: 'Feldführer',
    guideCount: '{found} von {total} entdeckt',
    locked: 'Tag {n}',
    inTank: 'Im Becken',
    release: 'Zurück ins Riff',
    display: 'Ins Becken setzen',
    releasedNote: 'Zurückgesetzt. Bleibt für immer im Feldführer.',

    startStaking: 'Staking starten',
    addStake: 'Stake erhöhen',
    whatFills: '— dadurch füllt sich das Becken',
    validator: 'Validator',
    chooseValidator: 'Auswählen',
    loadingValidators: 'Lade die gewählten Validatoren…',
    noPreference: 'Alle gewählten Validatoren, nach Adresse sortiert. Reef bevorzugt keinen.',
    amountNim: 'Betrag in NIM',
    minimumNim: 'Mindestens {n} NIM. Du kannst jederzeit wieder abheben.',
    delegate: 'Delegieren',
    addStakeCta: 'Stake erhöhen',
    stakeSent: 'Stake gesendet',
    stakeSentNote:
      'Zählt ab dem nächsten Tick, innerhalb von fünfzehn Minuten. Deine NIM bleiben im Staking-Vertrag unter deiner eigenen Adresse — Reef liest sie nur.',
    stakeElsewhere:
      'Staking im Browser ist noch nicht gebaut. Stake in der Nimiq Wallet oder in Nimiq Pay — dieses Riff übernimmt es innerhalb von fünfzehn Minuten, denn Reef liest die Chain.',

    shareYours: 'Riff teilen',
    shareThis: 'Dieses Riff teilen',
    linkCopied: 'Link kopiert',
    chainOffline:
      'Die Chain ist gerade nicht erreichbar, das hier ist der letzte bekannte Stand. Nichts ist verloren.',
  },

  es: {
    claimReef: 'Reclama tu arrecife',
    signInWallet: 'Entrar con Nimiq Wallet',
    waitingWallet: 'Esperando a la cartera…',
    signOut: 'Cerrar sesión',
    day: 'Día {n}',
    communityReef: 'El arrecife de la comunidad',
    reefsLiving: '{n} arrecifes con vida',
    claimPrompt:
      'Reclama un arrecife y empieza a llenarse hoy — el staking es opcional y los primeros hallazgos son gratis.',

    discover: 'Descubrir',
    discovering: 'Buscando…',
    chargesLeft: '{n} de {max} cargas',
    chargesFull: 'Completo — {max} cargas',
    nextCharge: 'La próxima en {time}',
    noCharges: 'Sin cargas. Vuelve una cada ocho horas.',
    found: 'Ha aparecido un {label}.',
    foundRare: 'Ha aparecido un {label} — {tier}.',
    tankFull: 'Tu acuario está lleno, así que espera en la guía.',

    daysStaked: 'Días en staking',
    staked: 'En staking',
    slots: 'Espacio',
    streak: 'Racha de comidas',
    unlocksAfter: '{species} llega tras {n} días en staking — faltan {away}.',
    everythingUnlocked: 'Todas las especies están a tu alcance.',

    feed: 'Alimentar el arrecife',
    fedAlready: 'Alimentado hoy',
    feedNote: 'Una vez al día, gratis, y nada muere si se te olvida.',
    feedStranger: 'Alimenta a alguien',
    feedStrangerNote: 'Uno al día. A quien elijas verá que alguien le dio de comer.',
    feedGiven: 'Has alimentado a {handle}. Ya está por hoy.',
    feedNeedsApp: 'Alimentar otros arrecifes requiere Nimiq Pay.',
    fedBy: 'Alimentado hoy por {n}',

    guide: 'Guía de campo',
    guideCount: '{found} de {total} descubiertas',
    locked: 'Día {n}',
    inTank: 'En el acuario',
    release: 'Devolver al arrecife',
    display: 'Poner en el acuario',
    releasedNote: 'Devuelto. Sigue en tu guía para siempre.',

    startStaking: 'Empezar staking',
    addStake: 'Añadir a tu staking',
    whatFills: '— esto es lo que llena el acuario',
    validator: 'Validador',
    chooseValidator: 'Elige uno',
    loadingValidators: 'Cargando los validadores electos…',
    noPreference: 'Todos los validadores electos, ordenados por dirección. Reef no prefiere ninguno.',
    amountNim: 'Cantidad en NIM',
    minimumNim: 'Mínimo {n} NIM. Puedes retirarlo cuando quieras.',
    delegate: 'Delegar',
    addStakeCta: 'Añadir',
    stakeSent: 'Staking enviado',
    stakeSentNote:
      'Cuenta desde el próximo tick, en menos de quince minutos. Tus NIM se quedan en el contrato de staking bajo tu propia dirección — Reef solo los lee.',
    stakeElsewhere:
      'Hacer staking desde el navegador aún no está implementado. Hazlo en Nimiq Wallet o Nimiq Pay y este arrecife lo recogerá en quince minutos: Reef lee la cadena.',

    shareYours: 'Comparte tu arrecife',
    shareThis: 'Compartir este arrecife',
    linkCopied: 'Enlace copiado',
    chainOffline:
      'Ahora mismo no llegamos a la cadena, esto es lo último que vimos. No se ha perdido nada.',
  },
} as const;

export type Locale = keyof typeof STRINGS;
export type StringKey = keyof (typeof STRINGS)['en'];

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && value in STRINGS;
}
