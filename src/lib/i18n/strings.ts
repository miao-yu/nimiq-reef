/**
 * UI copy.
 *
 * Nimiq Pay seeds the user's chosen language before our script runs, and the
 * SDK docs are explicit that a Mini App should use it rather than assuming
 * English. The Nimiq community is substantially German- and Spanish-speaking,
 * so shipping English-only quietly excludes a lot of the audience.
 *
 * English is the source of truth; a missing key in any other language falls
 * back to it rather than rendering blank.
 */
export const STRINGS = {
  en: {
    claimPlot: 'Claim your plot',
    signInWallet: 'Sign in with Nimiq Wallet',
    waitingWallet: 'Waiting for the wallet…',
    signOut: 'Sign out',
    shareYours: 'Share your tank',
    shareThis: 'Share this tank',
    linkCopied: 'Link copied',
    day: 'Day {n}',
    communityReef: 'The community reef',
    reefsGrowing: '{n} tanks living',
    daysStaked: 'Days staked',
    staked: 'Staked',
    plots: 'Plots',
    plantInPlot: 'Plant in plot {n}',
    newPlotOpened: 'Plot {n} just opened',
    unlockedByStaking: 'Staking got you this one. {species} is available too.',
    permanent: "— you can't change it later",
    allPlanted: 'Every cleared plot is planted.',
    unlocksAfter: '{species} unlocks after {n} unbroken days staked — {away} to go.',
    startStaking: 'Start staking',
    addStake: 'Add to your stake',
    whatGrows: '— this is what fills the tank',
    validator: 'Validator',
    chooseValidator: 'Choose one',
    loadingValidators: 'Loading the elected set…',
    noPreference: 'Every elected validator, sorted by address. Reef has no preference.',
    amountNim: 'Amount in NIM',
    minimumNim: 'Minimum {n} NIM. You can unstake whenever you like.',
    stakeElsewhere:
      'Staking from the browser is not built yet. Stake in the Nimiq Wallet or Nimiq Pay and this tank picks it up within fifteen minutes — Reef reads the chain, so it does not need to be the app that made the transaction.',
    delegate: 'Delegate',
    addStakeCta: 'Add stake',
    stakeSent: 'Stake sent',
    stakeSentNote:
      'It counts from the next tick, within fifteen minutes. Your NIM stays in the staking contract under your own address — Reef only reads it.',
    chainOffline: "Can't reach the chain right now, so this is from what we last saw. Nothing is lost.",
    claimPrompt:
      'Claim a plot and yours starts growing today — staking is optional, and the first plant is free.',
  },
  de: {
    claimPlot: 'Beet beanspruchen',
    signInWallet: 'Mit Nimiq Wallet anmelden',
    waitingWallet: 'Warte auf die Wallet…',
    signOut: 'Abmelden',
    shareYours: 'Becken teilen',
    shareThis: 'Dieses Becken teilen',
    linkCopied: 'Link kopiert',
    day: 'Tag {n}',
    communityReef: 'Das Gemeinschaftsriff',
    reefsGrowing: '{n} Becken leben',
    daysStaked: 'Tage gestakt',
    staked: 'Gestakt',
    plots: 'Beete',
    plantInPlot: 'In Beet {n} pflanzen',
    newPlotOpened: 'Platz {n} ist neu frei',
    unlockedByStaking: 'Durch Staking freigeschaltet. {species} ist jetzt auch verfügbar.',
    permanent: '— später nicht mehr änderbar',
    allPlanted: 'Alle freien Beete sind bepflanzt.',
    unlocksAfter: '{species} wird nach {n} Tagen ununterbrochenem Staking freigeschaltet — noch {away}.',
    startStaking: 'Staking starten',
    addStake: 'Stake erhöhen',
    whatGrows: '— dadurch füllt sich das Becken',
    validator: 'Validator',
    chooseValidator: 'Auswählen',
    loadingValidators: 'Lade die gewählten Validatoren…',
    noPreference: 'Alle gewählten Validatoren, nach Adresse sortiert. Reef bevorzugt keinen.',
    amountNim: 'Betrag in NIM',
    minimumNim: 'Mindestens {n} NIM. Du kannst jederzeit wieder abheben.',
    stakeElsewhere:
      'Staking im Browser ist noch nicht gebaut. Stake in der Nimiq Wallet oder in Nimiq Pay — dieses Becken übernimmt es innerhalb von fünfzehn Minuten, denn Reef liest die Chain und muss die Transaktion nicht selbst gesendet haben.',
    delegate: 'Delegieren',
    addStakeCta: 'Stake erhöhen',
    stakeSent: 'Stake gesendet',
    stakeSentNote:
      'Zählt ab dem nächsten Tick, innerhalb von fünfzehn Minuten. Deine NIM bleiben im Staking-Vertrag unter deiner eigenen Adresse — Reef liest sie nur.',
    chainOffline:
      'Die Chain ist gerade nicht erreichbar, das hier ist der letzte bekannte Stand. Nichts ist verloren.',
    claimPrompt:
      'Beanspruche ein Beet und deiner wächst ab heute — Staking ist optional, die erste Pflanze ist gratis.',
  },
  es: {
    claimPlot: 'Reclama tu parcela',
    signInWallet: 'Entrar con Nimiq Wallet',
    waitingWallet: 'Esperando a la cartera…',
    signOut: 'Cerrar sesión',
    shareYours: 'Comparte tu acuario',
    shareThis: 'Compartir este acuario',
    linkCopied: 'Enlace copiado',
    day: 'Día {n}',
    communityReef: 'El arrecife de la comunidad',
    reefsGrowing: '{n} acuarios con vida',
    daysStaked: 'Días en staking',
    staked: 'En staking',
    plots: 'Parcelas',
    plantInPlot: 'Plantar en la parcela {n}',
    newPlotOpened: 'La parcela {n} acaba de abrirse',
    unlockedByStaking: 'Lo has desbloqueado con staking. {species} también está disponible.',
    permanent: '— no podrás cambiarlo después',
    allPlanted: 'Todas las parcelas abiertas están plantadas.',
    unlocksAfter: '{species} se desbloquea tras {n} días seguidos en staking — faltan {away}.',
    startStaking: 'Empezar staking',
    addStake: 'Añadir a tu staking',
    whatGrows: '— esto es lo que llena el acuario',
    validator: 'Validador',
    chooseValidator: 'Elige uno',
    loadingValidators: 'Cargando los validadores electos…',
    noPreference: 'Todos los validadores electos, ordenados por dirección. Reef no prefiere ninguno.',
    amountNim: 'Cantidad en NIM',
    minimumNim: 'Mínimo {n} NIM. Puedes retirarlo cuando quieras.',
    stakeElsewhere:
      'Hacer staking desde el navegador aún no está implementado. Hazlo en Nimiq Wallet o Nimiq Pay y este acuario lo recogerá en quince minutos: Reef lee la cadena, no necesita haber enviado la transacción.',
    delegate: 'Delegar',
    addStakeCta: 'Añadir',
    stakeSent: 'Staking enviado',
    stakeSentNote:
      'Cuenta desde el próximo tick, en menos de quince minutos. Tus NIM se quedan en el contrato de staking bajo tu propia dirección — Reef solo los lee.',
    chainOffline:
      'Ahora mismo no llegamos a la cadena, esto es lo último que vimos. No se ha perdido nada.',
    claimPrompt:
      'Reclama una parcela y la tuya empieza a crecer hoy — el staking es opcional y la primera planta es gratis.',
  },
} as const;

export type Locale = keyof typeof STRINGS;
export type StringKey = keyof (typeof STRINGS)['en'];

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && value in STRINGS;
}
