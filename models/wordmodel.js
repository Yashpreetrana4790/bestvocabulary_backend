import mongoose from "mongoose";
import PhrasalVerb from "./phraselVerbsmodel";

const wordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: true,
    unique: true
  },
  pronunciation: {
    type: String
  },
  frequency: {
    type: String,
    enum: ["low", "medium", "high"]
  },
  overall_tone: {
    type: String,
    enum: ["formal", "informal", "neutral"]
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
        enum: ["neutral", "formal", "informal"]
      },
      category: {
        type: String
      },
      difficulty: {
        type: String,
        enum: ["Beginner","Easy", "Intermediate", "Advanced",]
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
      synonyms: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Word"
      }],
      antonyms: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Word"
      }],
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
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question"
  }],
  additional_info: {
    collocations: {
      type: [String],
      default: []
    },
    historical_usage: {
      type: String
    },
    root_analysis: {
      origin_language: {
        type: String
      },
      meaning: {
        type: String
      }
    }
  }
})

const Word = mongoose.model("Word", wordSchema);
export default Word;