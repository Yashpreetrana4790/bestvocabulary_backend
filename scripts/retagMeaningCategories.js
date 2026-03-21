import mongoose from 'mongoose';
import 'dotenv/config';
import Word from '../src/models/wordmodel.js';

const TARGET_CATEGORIES = [
  'General',
  'Academic',
  'Business',
  'Medical',
  'Legal',
  'Technology',
  'Science',
  'Arts',
  'Literature',
];

const TARGET_SET = new Set(TARGET_CATEGORIES);

// Keyword-only heuristic tagger (no AI calls).
// We score based on occurrences in the meaning text + subtitle + easyMeaning.
const CATEGORY_KEYWORDS = {
  Business: [
    'finance',
    'financial',
    'investment',
    'invest',
    'market',
    'economy',
    'economic',
    'revenue',
    'profit',
    'loss',
    'budget',
    'account',
    'accounting',
    'trade',
    'company',
    'corporation',
    'enterprise',
    'shareholder',
    'bank',
    'banking',
    'salary',
    'wage',
    'fund',
    'portfolio',
    'capital',
    'management',
    'strategy',
    'marketing',
    'economics',
    'commerce',
    'investing',
  ],
  Medical: [
    'medicine',
    'medical',
    'patient',
    'disease',
    'illness',
    'symptom',
    'treatment',
    'therapy',
    'surgery',
    'diagnosis',
    'diagnose',
    'hospital',
    'infection',
    'infectious',
    'anatomy',
    'organs',
    'tissue',
    'cell',
    'pharmacy',
    'drug',
    'medication',
    'immune',
    'vaccin',
    'neurology',
    'cardiology',
    'oncology',
    'dermatology',
  ],
  Legal: [
    'law',
    'legal',
    'court',
    'judge',
    'judgment',
    'statute',
    'regulation',
    'regulatory',
    'contract',
    'agreement',
    'liability',
    'negligence',
    'plaintiff',
    'defendant',
    'evidence',
    'appeal',
    'jurisdiction',
    'rights',
    'obligation',
    'compliance',
    'attorney',
    'trial',
    'hearing',
    'prosecution',
    'defense',
    'penalty',
  ],
  Technology: [
    'technology',
    'tech',
    'computer',
    'software',
    'hardware',
    'programming',
    'code',
    'coding',
    'algorithm',
    'data',
    'database',
    'network',
    'internet',
    'cloud',
    'server',
    'system',
    'security',
    'cyber',
    'robot',
    'robotics',
    'machine',
    'learning',
    'model',
    'app',
    'application',
    'web',
    'mobile',
    'device',
    'digital',
    'engineering',
  ],
  Science: [
    'science',
    'scientific',
    'biology',
    'chemistry',
    'physics',
    'experiment',
    'research',
    'study',
    'theory',
    'hypothesis',
    'laboratory',
    'observation',
    'measurement',
    'evolution',
    'reaction',
    'organism',
    'planet',
    'astronomy',
    'geology',
    'quantum',
    'genetics',
    'species',
  ],
  Arts: [
    'art',
    'artistic',
    'painting',
    'painter',
    'sculpture',
    'gallery',
    'museum',
    'music',
    'musical',
    'song',
    'melody',
    'harmony',
    'theatre',
    'theater',
    'drama',
    'stage',
    'dance',
    'performance',
    'creative',
    'design',
    'fashion',
    'photography',
    'film',
    'cinema',
    'artist',
  ],
  Literature: [
    'book',
    'novel',
    'story',
    'stories',
    'literature',
    'poem',
    'poetry',
    'author',
    'reader',
    'chapter',
    'narrative',
    'literary',
    'character',
    'plot',
    'prose',
  ],
  Academic: [
    'education',
    'learn',
    'learning',
    'study',
    'course',
    'curriculum',
    'scholar',
    'knowledge',
    'university',
    'lecture',
    'exam',
    'examining',
    'class',
    'research',
    'academic',
  ],
};

const PRIORITY = ['Legal', 'Medical', 'Business', 'Technology', 'Science', 'Literature', 'Arts', 'Academic', 'General'];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countKeywordOccurrences(textLower, keywords) {
  let score = 0;

  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (!k) continue;

    // Prefix keywords (e.g. vaccin)
    if (k.length >= 4 && k.endsWith('in')) {
      // We keep this simple; the scoring is heuristic anyway.
    }

    const isPhrase = k.includes(' ');

    if (isPhrase) {
      if (textLower.includes(k)) score += 2;
      continue;
    }

    // For single tokens, use word boundaries for fewer false positives.
    const re = new RegExp(`\\b${escapeRegExp(k)}\\b`, 'g');
    const matches = textLower.match(re);
    if (matches && matches.length > 0) score += matches.length;
  }

  return score;
}

function buildMeaningText(m) {
  const meaning = m?.meaning || '';
  const subtitle = m?.subtitle || '';
  const easyMeaning = m?.easyMeaning || '';
  return `${meaning} ${subtitle} ${easyMeaning}`.toLowerCase();
}

function pickCategory(textLower) {
  const scored = [];

  for (const cat of TARGET_CATEGORIES) {
    if (cat === 'General') continue;
    const kw = CATEGORY_KEYWORDS[cat] || [];
    const score = countKeywordOccurrences(textLower, kw);
    if (score > 0) scored.push({ cat, score });
  }

  if (scored.length === 0) return 'General';

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return PRIORITY.indexOf(a.cat) - PRIORITY.indexOf(b.cat);
  });

  return scored[0].cat;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const maxWords = process.argv.includes('--max-words')
    ? parseInt(process.argv[process.argv.indexOf('--max-words') + 1] || '0', 10)
    : 0;

  await mongoose.connect(process.env.MONGO_URI);

  const query = {
    'meanings.category': { $not: { $elemMatch: { category: { $in: TARGET_CATEGORIES } } } },
  };

  // Simpler fallback: if the query ends up too restrictive, we still update only when meaning.category
  // is not already in the target set.
  const cursor = Word.find({})
    .select('_id word meanings')
    .lean();

  const updateQueue = [];
  const categoryChangeCounts = Object.fromEntries(TARGET_CATEGORIES.map((c) => [c, 0]));
  let scanned = 0;
  let updatedWords = 0;

  for await (const w of cursor) {
    scanned += 1;
    if (maxWords && scanned > maxWords) break;

    const meanings = w.meanings || [];
    let changed = false;

    const newMeanings = meanings.map((m) => {
      const current = (m?.category || '').trim();
      if (current && TARGET_SET.has(current)) return m; // keep existing good tags

      const textLower = buildMeaningText(m);
      const next = pickCategory(textLower);
      if (next !== current) {
        changed = true;
        categoryChangeCounts[next] += 1;
      }
      return { ...m, category: next };
    });

    if (changed && !dryRun) {
      updateQueue.push({
        updateOne: {
          filter: { _id: w._id },
          update: { $set: { meanings: newMeanings } },
        },
      });
    }

    if (!dryRun && updateQueue.length >= 50) {
      await Word.bulkWrite(updateQueue, { ordered: false });
      updateQueue.length = 0;
      updatedWords += 50;
    }
  }

  if (!dryRun && updateQueue.length) {
    await Word.bulkWrite(updateQueue, { ordered: false });
  }

  await mongoose.disconnect();

  const nonZero = Object.entries(categoryChangeCounts)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  console.log(JSON.stringify({ dryRun, scannedWords: scanned, updatedWords, categoryChangeCounts: nonZero.slice(0, 25) }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });

