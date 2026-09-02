// src/utils/intentDetection.ts

export type IntentType =
  | 'list_projects'
  | 'list_skills'
  | 'list_experience'
  | 'about_me'
  | 'contact_info'
  | 'skill_detail'
  | null;

type IntentPattern = {
  intent: IntentType;
  patterns: RegExp[];
};

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'list_projects',
    patterns: [
      /show\s+(me\s+)?(your\s+)?projects?/i,
      /project\s+list/i,
      /my\s+projects?/i,
      /what\s+have\s+you\s+built/i,
      /list\s+(of\s+)?projects?/i,
      /portfolio\s+projects?/i,
      /your\s+work/i,
      /things?\s+you(?:'ve|\s+have)\s+built/i,
    ],
  },
  {
    intent: 'list_skills',
    patterns: [
      /show\s+(me\s+)?(your\s+)?skills?/i,
      /what\s+skills?\s+(do\s+you\s+have|are)/i,
      /tech\s+stack/i,
      /technologies/i,
      /what\s+can\s+you\s+(do|work\s+with)/i,
      /your\s+skillset/i,
      /skill\s+set/i,
    ],
  },
  {
    intent: 'list_experience',
    patterns: [
      /show\s+(me\s+)?(your\s+)?experience/i,
      /work\s+history/i,
      /timeline/i,
      /where\s+have\s+you\s+worked/i,
      /your\s+experience/i,
      /professional\s+background/i,
      /career\s+history/i,
      /work\s+experience/i,
    ],
  },
  {
    intent: 'about_me',
    patterns: [
      /who\s+are\s+you/i,
      /about\s+you/i,
      /tell\s+me\s+about\s+yourself/i,
      /introduction/i,
      /what\s+do\s+you\s+do/i,
      /describe\s+yourself/i,
      /your\s+bio/i,
      /your\s+profile/i,
    ],
  },
  {
    intent: 'contact_info',
    patterns: [
      /your\s+email/i,
      /your\s+github/i,
      /your\s+linkedin/i,
      /how\s+(can\s+I|to)\s+(contact|reach|call|email)/i,
      /contact\s+(info|information|details)/i,
      /reach\s+you/i,
      /get\s+in\s+touch/i,
      /phone\s+number/i,
    ],
  },
  {
    intent: 'skill_detail',
    patterns: [
      /tell\s+me\s+about\s+(\w+)/i,
      /experience\s+with\s+(\w+)/i,
      /how\s+(good|well|experienced)\s+(are\s+you|with)\s+(\w+)/i,
      /your\s+(\w+)\s+experience/i,
    ],
  },
];

/**
 * Detect user intent from their last message.
 * Returns null if no clear intent match (should fall back to AI).
 */
export function detectIntent(message: string): IntentType {
  const trimmed = message.trim();

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return intent;
      }
    }
  }

  return null;
}

/**
 * Check if the message is asking about a specific skill.
 * Returns the skill name if detected, null otherwise.
 */
export function extractSkillName(message: string): string | null {
  const match = message.match(/(?:tell\s+me\s+about|experience\s+with|your)\s+(.+?)(?:\s*\?|$)/i);
  return match ? match[1].trim() : null;
}
