import mongoose from "mongoose";

const originSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true
  },
  languageCode: String,
  originalWord: String,
  meaning: String,
  period: String,
  region: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  }
}, { _id: false });

const etymologyDetailSchema = new mongoose.Schema({
  description: String,
  origins: [originSchema],
  rootWords: [{
    root: String,
    meaning: String,
    language: String
  }],
  evolution: [{
    period: String,
    form: String,
    meaning: String,
    language: String
  }],
  cognates: [{
    word: String,
    language: String,
    meaning: String
  }]
}, { _id: false });

const wordRelationSchema = new mongoose.Schema({
  wordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Word'
  },
  word: String,
  relationStrength: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  }
}, { _id: false });

const wordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    unique: true
  },
  pronunciation: {
    type: String,
    required : true
  },
  frequency: {
    type: String,
  },
  overall_tone: {
    type: String,
  },
  etymology: {
    type: String
  },
  etymologyDetails: etymologyDetailSchema,
  misspellings: [String],
  usage_distribution: {
    spoken: {
      type: Number
    },
    written: {
      type: Number
    }
  },
  word_family: {
    base: {
      type: String
    },
    inflected: {
      type: [String]
    },
    derived: {
      type: [String]
    }
  },
  relatedWords: [wordRelationSchema],
  note : {
    type : String
  },

  meanings: [
    {
      pos: {
        type: String,
      },
      subtitle: {
        type: String
      },
      pronunciation: {
        type: String
      },
      common_usage: [
        {
          context: {
            type: String
          },
          example: {
            type: String
          }
        }
      ],
      tone: {
        type: String,
      },
      category: {
        type: String
      },
      difficulty: {
        type: String,
      },
      meaning: {
        type: String,
      },
      mnemonic: {
        type: String
      },
      easyMeaning: {
        type: String
      },
      kiddefinition: {
        type: String
      },
      example_sentences: [
        {
          type: mongoose.Schema.Types.Mixed
        }
      ],
      notes: {
        type: String
      },
      synonyms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Word" }],
      antonyms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Word" }]
    }
  ],
  expressions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Expression"
  }],
  PhrasalVerbs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "PhrasalVerb"
  }],
  historical_usage: String,
  collocations: [mongoose.Schema.Types.Mixed],
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question"
  }],
  root_analysis: {
    type: mongoose.Schema.Types.Mixed
  },
  // AI embedding for semantic search (Gemini). Optional; backfill via admin/script.
  embedding: {
    type: [Number],
    select: false, // exclude from default queries; use .select('+embedding') for semantic search
  }
})

const Word = mongoose.model("Word", wordSchema);
export default Word;