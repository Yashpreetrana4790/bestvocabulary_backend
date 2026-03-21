import mongoose from 'mongoose';
import 'dotenv/config';
import Word from '../src/models/wordmodel.js';

const BATCH_SIZE = 200;

const normalizeWord = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

const normalizeExampleSentences = (arr = []) =>
  arr
    .map((sentence) => {
      if (typeof sentence === 'string') return { text: sentence.trim() };
      if (sentence && typeof sentence === 'object' && typeof sentence.text === 'string') {
        return { ...sentence, text: sentence.text.trim() };
      }
      return null;
    })
    .filter(Boolean);

const normalizeMeanings = (meanings = []) =>
  meanings.map((m) => {
    const commonUsage = m.commonUsage ?? m.common_usage ?? [];
    const kidDefinition = m.kidDefinition ?? m.kiddefinition;
    const exampleSentences = normalizeExampleSentences(m.exampleSentences ?? m.example_sentences ?? []);
    return {
      ...m,
      commonUsage,
      common_usage: commonUsage,
      kidDefinition,
      kiddefinition: kidDefinition,
      exampleSentences,
      example_sentences: exampleSentences,
    };
  });

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const maxWords = process.argv.includes('--max-words')
    ? parseInt(process.argv[process.argv.indexOf('--max-words') + 1] || '0', 10)
    : 0;

  await mongoose.connect(process.env.MONGO_URI);

  const cursor = Word.find({})
    .select('_id word wordNormalized overallTone overall_tone usageDistribution usage_distribution wordFamily word_family phrasalVerbs PhrasalVerbs historicalUsage historical_usage rootAnalysis root_analysis meanings')
    .lean();

  const bulkOps = [];
  let scanned = 0;
  let changed = 0;

  for await (const w of cursor) {
    scanned += 1;
    if (maxWords && scanned > maxWords) break;

    const wordNormalized = normalizeWord(w.word);
    const overallTone = w.overallTone ?? w.overall_tone;
    const usageDistribution = w.usageDistribution ?? w.usage_distribution;
    const wordFamily = w.wordFamily ?? w.word_family;
    const phrasalVerbs = w.phrasalVerbs ?? w.PhrasalVerbs ?? [];
    const historicalUsage = w.historicalUsage ?? w.historical_usage;
    const rootAnalysis = w.rootAnalysis ?? w.root_analysis;
    const meanings = normalizeMeanings(w.meanings);

    const update = {
      wordNormalized,
      overallTone,
      overall_tone: overallTone,
      usageDistribution,
      usage_distribution: usageDistribution,
      wordFamily,
      word_family: wordFamily,
      phrasalVerbs,
      PhrasalVerbs: phrasalVerbs,
      historicalUsage,
      historical_usage: historicalUsage,
      rootAnalysis,
      root_analysis: rootAnalysis,
      meanings,
    };

    if (!wordNormalized) continue;
    changed += 1;

    if (!dryRun) {
      bulkOps.push({
        updateOne: {
          filter: { _id: w._id },
          update: { $set: update },
        },
      });
    }

    if (!dryRun && bulkOps.length >= BATCH_SIZE) {
      await Word.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
    }
  }

  if (!dryRun && bulkOps.length > 0) {
    await Word.bulkWrite(bulkOps, { ordered: false });
  }

  await mongoose.disconnect();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned,
        changed,
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
