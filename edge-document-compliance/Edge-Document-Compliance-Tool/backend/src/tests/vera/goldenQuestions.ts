/**
 * Golden Questions for Vera LLM Testing
 * 
 * These are high-quality test questions that should produce
 * auditor-level, structured answers when Vera's LLM is working correctly.
 */

export interface GoldenQuestion {
  id: string;
  question: string;
  expectedTopics: string[];  // Topics that should appear in the answer
  expectedStandards?: string[];  // Standards that should be referenced
  minAnswerLength?: number;  // Minimum expected answer length
}

export const goldenQuestions: GoldenQuestion[] = [
  {
    id: "AS9100_8_7_explanation",
    question: "What does AS9100D clause 8.7 require, and what objective evidence should an auditor look for?",
    expectedTopics: ["nonconformity", "corrective action", "objective evidence", "audit"],
    expectedStandards: ["AS9100D"],
    minAnswerLength: 300,
  },
  {
    id: "FAA_21_137_n_evidence",
    question: "Explain FAA Part 21.137(n) and list the types of records and evidence a production approval holder must maintain.",
    expectedTopics: ["records", "evidence", "production approval", "maintenance"],
    expectedStandards: ["FAA Part 21"],
    minAnswerLength: 400,
  },
  {
    id: "ISO_9001_4_2_3_context",
    question: "What is required in ISO 9001 clause 4.2.3 and how would that typically appear in a quality manual?",
    expectedTopics: ["documented information", "quality manual", "control"],
    expectedStandards: ["ISO 9001"],
    minAnswerLength: 300,
  },
  {
    id: "ISO_13485_7_5_1_control",
    question: "What are the requirements for document control in ISO 13485 clause 7.5.1, and what are common audit findings?",
    expectedTopics: ["document control", "medical device", "audit findings"],
    expectedStandards: ["ISO 13485"],
    minAnswerLength: 350,
  },
  {
    id: "cross_standard_comparison",
    question: "Compare the design and development requirements between ISO 9001 and AS9100D. What are the key differences?",
    expectedTopics: ["design", "development", "comparison", "differences"],
    expectedStandards: ["ISO 9001", "AS9100D"],
    minAnswerLength: 400,
  },
  {
    id: "gap_analysis_question",
    question: "I'm implementing AS9100D for the first time. What are the most common gaps organizations face in clause 8.5.1, and how should I address them?",
    expectedTopics: ["gap", "implementation", "common issues", "recommendations"],
    expectedStandards: ["AS9100D"],
    minAnswerLength: 400,
  },
  {
    id: "terminology_definition",
    question: "What is a Quality Management System (QMS) and how does it differ from a Quality Assurance system?",
    expectedTopics: ["QMS", "quality management", "quality assurance", "definition"],
    minAnswerLength: 250,
  },
  {
    id: "regulatory_compliance",
    question: "What records must be maintained under FAA Part 21.137(n) for production approval holders, and what are the retention requirements?",
    expectedTopics: ["records", "retention", "production approval", "FAA"],
    expectedStandards: ["FAA Part 21"],
    minAnswerLength: 300,
  },
];

