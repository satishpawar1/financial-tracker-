export const UTILITY_TYPES = [
  'Electric',
  'Water',
  'Gas',
  'Internet',
  'Phone',
  'Cable/TV',
  'Home Security',
  'Sewer',
  'Trash',
  'Other',
] as const

interface InferenceRule {
  pattern: RegExp
  type: string | null   // null = provider known but type ambiguous (e.g. PG&E = gas + electric)
  provider: string | null
}

const INFERENCE_RULES: InferenceRule[] = [
  // Company-specific patterns — checked first
  { pattern: /pg&?e|pacific gas/i,              type: null,        provider: 'PG&E' },
  { pattern: /con\s?ed|consolidated edison/i,   type: 'Electric',  provider: 'Con Edison' },
  { pattern: /duke energy/i,                    type: 'Electric',  provider: 'Duke Energy' },
  { pattern: /xcel energy/i,                    type: 'Electric',  provider: 'Xcel Energy' },
  { pattern: /southern\s?company/i,             type: 'Electric',  provider: 'Southern Company' },
  { pattern: /ameren/i,                         type: 'Electric',  provider: 'Ameren' },
  { pattern: /pseg/i,                           type: 'Electric',  provider: 'PSE&G' },
  { pattern: /national\s?grid/i,                type: 'Electric',  provider: 'National Grid' },
  { pattern: /nicor\s?gas/i,                    type: 'Gas',       provider: 'Nicor Gas' },
  { pattern: /socalgas|so\s?cal\s?gas/i,        type: 'Gas',       provider: 'SoCal Gas' },
  { pattern: /columbia\s?gas/i,                 type: 'Gas',       provider: 'Columbia Gas' },
  { pattern: /comcast|xfinity/i,                type: 'Internet',  provider: 'Comcast/Xfinity' },
  { pattern: /spectrum/i,                       type: 'Internet',  provider: 'Spectrum' },
  { pattern: /cox\s*(cable|communications)?/i,  type: 'Internet',  provider: 'Cox' },
  { pattern: /verizon/i,                        type: 'Phone',     provider: 'Verizon' },
  { pattern: /at&?t/i,                          type: 'Phone',     provider: 'AT&T' },
  { pattern: /t-?mobile/i,                      type: 'Phone',     provider: 'T-Mobile' },
  { pattern: /waste\s*management|wm\s+inc/i,    type: 'Trash',          provider: 'Waste Management' },
  { pattern: /\badt\b/i,                        type: 'Home Security',  provider: 'ADT' },
  { pattern: /vivint/i,                         type: 'Home Security',  provider: 'Vivint' },
  { pattern: /ring\s*(alarm|security)/i,        type: 'Home Security',  provider: 'Ring' },
  { pattern: /simplisafe/i,                     type: 'Home Security',  provider: 'SimpliSafe' },
  { pattern: /home\s*security|alarm\s*monitoring/i, type: 'Home Security', provider: null },
  // Generic keyword patterns — type only
  { pattern: /\belectric(ity|al)?\b/i,                              type: 'Electric',  provider: null },
  { pattern: /\bwater\b/i,                                          type: 'Water',     provider: null },
  { pattern: /\bnatural\s*gas\b|\bgas\s*bill\b|\bgas\s*utility\b/i, type: 'Gas',       provider: null },
  { pattern: /\binternet\b|\bbroadband\b|\bwifi\b/i,                type: 'Internet',  provider: null },
  { pattern: /\bcell\s*(phone)?\b|\bmobile\s*(plan|bill)?\b|\bwireless\b/i, type: 'Phone', provider: null },
  { pattern: /\bcable\s*(tv|bill)?\b|\btv\s*bill\b/i,               type: 'Cable/TV',  provider: null },
  { pattern: /\bsewer\b/i,                                          type: 'Sewer',     provider: null },
  { pattern: /\btrash\b|\bgarbage\b|\brecycl/i,                     type: 'Trash',     provider: null },
]

export function inferUtilityFields(
  description: string,
  notes: string | null,
): { suggestedType: string | null; suggestedProvider: string | null } {
  const combined = [description, notes].filter(Boolean).join(' ')
  for (const rule of INFERENCE_RULES) {
    if (rule.pattern.test(combined)) {
      return { suggestedType: rule.type, suggestedProvider: rule.provider }
    }
  }
  return { suggestedType: null, suggestedProvider: null }
}
