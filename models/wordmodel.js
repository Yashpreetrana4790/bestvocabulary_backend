import mongoose from "mongoose";


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
  }
})

const Word = mongoose.model("Word", wordSchema);
export default Word;