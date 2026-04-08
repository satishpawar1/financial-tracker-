/**
 * Keyword-based auto-categorization.
 * Maps regex patterns against transaction descriptions to category names.
 * Category names match the seeded defaults in 003_seed_categories.sql.
 */

const RULES: Array<{ pattern: RegExp; category: string }> = [
  // Salary / Income
  { pattern: /payroll|direct deposit|salary|paycheck|ach credit|zelle from|venmo from/i, category: 'Salary' },

  // Housing
  { pattern: /rent|mortgage|hoa|lease|apartment|realty|property mgmt/i, category: 'Housing' },

  // Groceries
  { pattern: /kroger|safeway|trader joe|whole foods|wegmans|publix|costco|aldi|sprouts|fresh market|stop & shop|heb|meijer|food lion|piggly|market basket|grocery|supermarket|pavilions|ralphs|vons|smiths|frys food|winco|weis|hannaford/i, category: 'Groceries' },

  // Dining Out
  { pattern: /restaurant|doordash|uber eats|grubhub|postmates|seamless|instacart|mcdonald|burger king|wendy|taco bell|chick.fil|chipotle|panera|subway|dunkin|starbucks|dunkin donuts|panda express|domino|pizza hut|papa john|olive garden|red lobster|applebee|ihop|denny|waffle house|cheesecake factory|five guys|shake shack|in.n.out|whataburger|popeyes|kfc|sonic drive|dairy queen|little caesar/i, category: 'Dining Out' },

  // Transport
  { pattern: /uber(?! eats)|lyft|parking|toll|e.zpass|fastrak|metro|transit|amtrak|greyhound|shell|chevron|exxon|mobil|bp\b|sunoco|speedway|marathon oil|circle k|wawa|quiktrip|racetrac|gas station|fuel|autozone|advance auto|o'reilly|pep boys|jiffy lube|valvoline|enterprise rent|hertz|avis|budget rent/i, category: 'Transport' },

  // Utilities
  { pattern: /electric|water bill|utility|utilities|pg&e|con ed|duke energy|southern company|xcel energy|comcast|xfinity|spectrum|cox cable|verizon|at&t|t.mobile|sprint|boost mobile|internet|broadband|sewage/i, category: 'Utilities' },

  // Healthcare
  { pattern: /cvs|walgreens|rite aid|pharmacy|doctor|dentist|dental|hospital|medical|optometrist|vision|urgent care|clinic|lab corp|quest diag|kaiser|blue cross|aetna|cigna|health plan|rx\b|prescription/i, category: 'Healthcare' },

  // Insurance
  { pattern: /insurance|geico|state farm|allstate|progressive|nationwide|liberty mutual|travelers ins|usaa|farmers ins|metlife/i, category: 'Insurance' },

  // Subscriptions
  { pattern: /netflix|spotify|hulu|disney\+|disney plus|apple\.com\/bill|apple one|google one|google storage|icloud|microsoft 365|office 365|adobe|dropbox|youtube premium|amazon prime|audible|paramount\+|peacock|sling|fubo|max\b|subscription/i, category: 'Subscriptions' },

  // Entertainment
  { pattern: /movie|cinema|theater|amc |regal |cinemark|ticketmaster|stubhub|concert|sporting event|playstation|xbox|nintendo|steam |epic games|twitch/i, category: 'Entertainment' },

  // Shopping
  { pattern: /amazon(?! prime)|target|walmart|best buy|home depot|lowe's|lowes|macy|nordstrom|kohl|tj maxx|marshalls|ross store|burlington|old navy|gap\b|banana republic|h&m|zara|uniqlo|ebay|etsy|wayfair|chewy|petco|petsmart/i, category: 'Shopping' },

  // Education
  { pattern: /tuition|university|college|school fee|udemy|coursera|skillshare|linkedin learning|chegg|textbook|barnes & noble/i, category: 'Education' },

  // Travel
  { pattern: /hotel|airbnb|vrbo|delta air|united air|american air|southwest air|jetblue|spirit air|frontier air|marriott|hilton|hyatt|wyndham|ihg |holiday inn|hampton inn|expedia|booking\.com|hotels\.com|priceline|kayak|travelport/i, category: 'Travel' },

  // Personal Care
  { pattern: /salon|spa\b|haircut|barber|hair cut|nail salon|great clips|supercuts|ulta|sephora|massage|dry clean/i, category: 'Personal Care' },
]

export interface CategoryLookup {
  id: string
  name: string
}

/** Normalize a description for consistent DB lookup */
export function normalizeDescription(desc: string): string {
  return desc.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Keyword-only guess — used as fallback when no DB rule exists.
 * Returns matching category ID or null.
 */
export function guessCategory(
  description: string,
  categories: CategoryLookup[]
): string | null {
  for (const rule of RULES) {
    if (rule.pattern.test(description)) {
      const match = categories.find(
        c => c.name.toLowerCase() === rule.category.toLowerCase()
      )
      if (match) return match.id
    }
  }
  return null
}
