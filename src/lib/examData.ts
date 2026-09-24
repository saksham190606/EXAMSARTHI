export interface Question {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  correctAnswerId: string;
  subject: string;
  topic: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  explanation: string;
}

export const MockExamQuestions: Question[] = [
  // General Knowledge
  {
    id: "q1",
    text: "Which city is known as the capital of Madhya Pradesh?",
    options: [
      { id: "o1", text: "Indore" },
      { id: "o2", text: "Bhopal" },
      { id: "o3", text: "Jabalpur" },
      { id: "o4", text: "Gwalior" },
    ],
    correctAnswerId: "o2",
    subject: "General Knowledge",
    topic: "Geography",
    difficulty: "Beginner",
    explanation: "Bhopal is the capital city of the Indian state of Madhya Pradesh.",
  },
  {
    id: "q2",
    text: "Who is known as the 'Father of the Indian Constitution'?",
    options: [
      { id: "o1", text: "Mahatma Gandhi" },
      { id: "o2", text: "Jawaharlal Nehru" },
      { id: "o3", text: "B. R. Ambedkar" },
      { id: "o4", text: "Sardar Vallabhbhai Patel" },
    ],
    correctAnswerId: "o3",
    subject: "General Knowledge",
    topic: "History",
    difficulty: "Beginner",
    explanation: "Dr. B.R. Ambedkar was the chairman of the drafting committee of the Constituent Assembly.",
  },
  {
    id: "q3",
    text: "Which planet is known as the Red Planet?",
    options: [
      { id: "o1", text: "Venus" },
      { id: "o2", text: "Jupiter" },
      { id: "o3", text: "Saturn" },
      { id: "o4", text: "Mars" },
    ],
    correctAnswerId: "o4",
    subject: "General Knowledge",
    topic: "Science",
    difficulty: "Beginner",
    explanation: "Mars is often called the 'Red Planet' due to the iron oxide prevalent on its surface.",
  },
  {
    id: "q4",
    text: "The Reserve Bank of India was established in which year?",
    options: [
      { id: "o1", text: "1935" },
      { id: "o2", text: "1947" },
      { id: "o3", text: "1950" },
      { id: "o4", text: "1955" },
    ],
    correctAnswerId: "o1",
    subject: "General Knowledge",
    topic: "Economy",
    difficulty: "Intermediate",
    explanation: "The RBI was established on April 1, 1935, in accordance with the provisions of the Reserve Bank of India Act, 1934.",
  },

  // Quantitative Aptitude
  {
    id: "q5",
    text: "If the price of a book is first decreased by 20% and then increased by 20%, what is the net percentage change in the price?",
    options: [
      { id: "o1", text: "No change" },
      { id: "o2", text: "4% decrease" },
      { id: "o3", text: "4% increase" },
      { id: "o4", text: "2% decrease" },
    ],
    correctAnswerId: "o2",
    subject: "Quantitative Aptitude",
    topic: "Percentages",
    difficulty: "Intermediate",
    explanation: "Net change = a + b + (a*b)/100. Here, -20 + 20 + (-20*20)/100 = -4%. Hence, 4% decrease.",
  },
  {
    id: "q6",
    text: "A train running at a speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?",
    options: [
      { id: "o1", text: "120 metres" },
      { id: "o2", text: "150 metres" },
      { id: "o3", text: "180 metres" },
      { id: "o4", text: "200 metres" },
    ],
    correctAnswerId: "o2",
    subject: "Quantitative Aptitude",
    topic: "Time and Distance",
    difficulty: "Intermediate",
    explanation: "Speed in m/s = 60 * (5/18) = 50/3 m/s. Length = Speed * Time = (50/3) * 9 = 150 metres.",
  },
  {
    id: "q7",
    text: "What is the simple interest on Rs. 5000 at 8% per annum for 3 years?",
    options: [
      { id: "o1", text: "Rs. 1000" },
      { id: "o2", text: "Rs. 1200" },
      { id: "o3", text: "Rs. 1400" },
      { id: "o4", text: "Rs. 1500" },
    ],
    correctAnswerId: "o2",
    subject: "Quantitative Aptitude",
    topic: "Simple Interest",
    difficulty: "Beginner",
    explanation: "SI = (P * R * T) / 100 = (5000 * 8 * 3) / 100 = 1200.",
  },
  {
    id: "q8",
    text: "If A can do a piece of work in 10 days and B can do the same work in 15 days, how long will they take to complete it working together?",
    options: [
      { id: "o1", text: "5 days" },
      { id: "o2", text: "6 days" },
      { id: "o3", text: "8 days" },
      { id: "o4", text: "12 days" },
    ],
    correctAnswerId: "o2",
    subject: "Quantitative Aptitude",
    topic: "Time and Work",
    difficulty: "Intermediate",
    explanation: "Total work = LCM(10,15) = 30 units. A's efficiency = 3, B's efficiency = 2. Total efficiency = 5. Time = 30/5 = 6 days.",
  },
  {
    id: "q8_math",
    text: "Calculate the value of \\frac{1}{2} + \\frac{1}{4} + \\sqrt{16}",
    options: [
      { id: "o1", text: "4.75" },
      { id: "o2", text: "4.5" },
      { id: "o3", text: "5.25" },
      { id: "o4", text: "5.0" },
    ],
    correctAnswerId: "o1",
    subject: "Quantitative Aptitude",
    topic: "Algebra",
    difficulty: "Intermediate",
    explanation: "1/2 + 1/4 = 0.75. \\sqrt{16} = 4. Total = 4.75",
  },

  // Reasoning
  {
    id: "q9",
    text: "Look at this series: 2, 6, 18, 54, ... What number should come next?",
    options: [
      { id: "o1", text: "108" },
      { id: "o2", text: "148" },
      { id: "o3", text: "162" },
      { id: "o4", text: "216" },
    ],
    correctAnswerId: "o3",
    subject: "Reasoning",
    topic: "Number Series",
    difficulty: "Beginner",
    explanation: "Each number in the series is multiplied by 3 to get the next number (54 * 3 = 162).",
  },
  {
    id: "q10",
    text: "If 'APPLE' is coded as 'EQTPI', how is 'MANGO' coded in that language?",
    options: [
      { id: "o1", text: "QERKS" },
      { id: "o2", text: "PERKS" },
      { id: "o3", text: "QDSJS" },
      { id: "o4", text: "PEQKS" },
    ],
    correctAnswerId: "o1",
    subject: "Reasoning",
    topic: "Coding and Decoding",
    difficulty: "Intermediate",
    explanation: "Each letter is shifted by +4 positions in the alphabet. M(+4)=Q, A(+4)=E, N(+4)=R, G(+4)=K, O(+4)=S.",
  },
  {
    id: "q11",
    text: "Pointing to a photograph of a boy, Suresh said, 'He is the son of the only son of my mother.' How is Suresh related to that boy?",
    options: [
      { id: "o1", text: "Brother" },
      { id: "o2", text: "Uncle" },
      { id: "o3", text: "Cousin" },
      { id: "o4", text: "Father" },
    ],
    correctAnswerId: "o4",
    subject: "Reasoning",
    topic: "Blood Relations",
    difficulty: "Advanced",
    explanation: "The 'only son of my mother' is Suresh himself. Therefore, the boy is Suresh's son, making Suresh the father.",
  },
  {
    id: "q12",
    text: "In a certain code, 15789 is written as EGKPT and 2346 is written as ALUR. How is 23549 written in that code?",
    options: [
      { id: "o1", text: "ALGUT" },
      { id: "o2", text: "ALGRT" },
      { id: "o3", text: "ALEUT" },
      { id: "o4", text: "ALGTU" },
    ],
    correctAnswerId: "o3",
    subject: "Reasoning",
    topic: "Coding and Decoding",
    difficulty: "Beginner",
    explanation: "By direct substitution: 2=A, 3=L, 5=E, 4=U, 9=T. Thus, 23549 is ALEUT.",
  },

  // English
  {
    id: "q13",
    text: "Choose the correct synonym for the word 'ABUNDANT'.",
    options: [
      { id: "o1", text: "Scarce" },
      { id: "o2", text: "Plentiful" },
      { id: "o3", text: "Rare" },
      { id: "o4", text: "Limited" },
    ],
    correctAnswerId: "o2",
    subject: "English",
    topic: "Vocabulary",
    difficulty: "Beginner",
    explanation: "'Abundant' means existing or available in large quantities; plentiful.",
  },
  {
    id: "q14",
    text: "Find the error in the sentence: 'Neither of the two boys have submitted their assignments.'",
    options: [
      { id: "o1", text: "Neither of" },
      { id: "o2", text: "the two boys" },
      { id: "o3", text: "have submitted" },
      { id: "o4", text: "their assignments." },
    ],
    correctAnswerId: "o3",
    subject: "English",
    topic: "Grammar",
    difficulty: "Intermediate",
    explanation: "The subject 'Neither' is singular, so the verb should be singular 'has' instead of 'have'.",
  },
  {
    id: "q15",
    text: "Select the correctly spelt word.",
    options: [
      { id: "o1", text: "Accommodate" },
      { id: "o2", text: "Acommodate" },
      { id: "o3", text: "Accomodate" },
      { id: "o4", text: "Acomodate" },
    ],
    correctAnswerId: "o1",
    subject: "English",
    topic: "Spelling",
    difficulty: "Advanced",
    explanation: "'Accommodate' is spelt with double 'c' and double 'm'.",
  }
];
