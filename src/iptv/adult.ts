import type { Channel } from './types'

// "Adult Swim" is an ordinary TV channel, so it is removed from the text before checking.
const SAFE = /adult\s*swim/gi

const ADULT =
  /(?:^|[^a-z0-9])(?:xxx|adults?|porn[a-z]*|erotic[a-z]*|erotik|hentai|playboy|brazzers|18\s*\+|\+\s*18|18\s*plus|yeti[sş]kin)(?![a-z0-9])/i

export const isAdultText = (text: string | undefined): boolean => Boolean(text) && ADULT.test(text!.replace(SAFE, ' '))

/** True when the channel's name or its category carries an adult tag such as XXX, Adult or +18. */
export const isAdult = (channel: Channel): boolean => isAdultText(channel.name) || isAdultText(channel.group)
