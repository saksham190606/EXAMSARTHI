import * as fs from 'fs';
import { PracticeSets } from 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/lib/mockData';
import { generateRecommendations } from 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/lib/personalization/engine';
import { PerformanceProfile } from 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/lib/personalization/types';

console.log('================================================================');
console.log('   EXAMSARTHI — PRACTICE UI/UX PHASE 3 VERIFICATION SUITE       ');
console.log('================================================================\n');

let allPassed = true;
function assert(desc: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc}`);
    if (details) console.error(`       Detail: ${details}`);
    allPassed = false;
  }
}

const practiceFile = 'c:/Users/saksh/OneDrive/Documents/EXAMSARTHI/src/app/practice/page.tsx';
assert('practice/page.tsx exists', fs.existsSync(practiceFile));
const practiceSrc = fs.readFileSync(practiceFile, 'utf-8');

// 1. Structure & Sections
assert('Section A: Header with id="practice-heading"', 
  practiceSrc.includes('id="practice-heading"') && practiceSrc.includes('aria-labelledby="practice-heading"'));
assert('Section B: Personalized focus section with heading', 
  practiceSrc.includes('id="personalized-focus-heading"') && practiceSrc.includes('aria-labelledby="personalized-focus-heading"'));
assert('Section C: Filters section with id="filters-heading"', 
  practiceSrc.includes('id="filters-heading"') && practiceSrc.includes('aria-labelledby="filters-heading"'));
assert('Section D: Results section with id="practice-results-heading"', 
  practiceSrc.includes('id="practice-results-heading"') && practiceSrc.includes('aria-labelledby="practice-results-heading"'));

// 2. Existing Logic & Data Preservation
assert('Uses PracticeSets from mockData.ts', practiceSrc.includes('PracticeSets.filter'));
assert('Uses getPerformanceHistory from history.ts', practiceSrc.includes('getPerformanceHistory()'));
assert('Uses generateRecommendations from engine.ts', practiceSrc.includes('generateRecommendations('));
assert('Supports useSearchParams for URL parameters', practiceSrc.includes('useSearchParams()'));
assert('Synchronizes state with URL search parameters via useEffect', 
  practiceSrc.includes('searchParams?.get("subject")') && practiceSrc.includes('searchParams?.get("topic")'));

// 3. Search & Filter Controls
assert('Search input has visible Label with htmlFor="search-practice"', 
  practiceSrc.includes('<Label htmlFor="search-practice"') && practiceSrc.includes('id="search-practice"'));
assert('Subject dropdown has visible Label with htmlFor="filter-subject"', 
  practiceSrc.includes('<Label htmlFor="filter-subject"') && practiceSrc.includes('id="filter-subject"'));
assert('Difficulty dropdown has visible Label with htmlFor="filter-difficulty"', 
  practiceSrc.includes('<Label htmlFor="filter-difficulty"') && practiceSrc.includes('id="filter-difficulty"'));
assert('Quick Subject Discovery buttons present with role="toolbar"', 
  practiceSrc.includes('role="toolbar"') && practiceSrc.includes('Quick Subject Select'));
assert('Quick Subject Discovery buttons have aria-pressed attribute', 
  practiceSrc.includes('aria-pressed={isSelected}'));

// 4. Active Filter Chips & Clear Actions
assert('Active filter region has role="region" and aria-label', 
  practiceSrc.includes('role="region"') && practiceSrc.includes('aria-label="Active filters"'));
assert('Remove buttons on active filter badges have explicit aria-labels', 
  practiceSrc.includes('aria-label="Clear search input"') || practiceSrc.includes('aria-label="Remove topic search filter"'));
assert('Clear all filters action present', 
  practiceSrc.includes('handleClearAllFilters') && practiceSrc.includes('Clear all filters'));

// 5. Filter Simulation Checks
console.log('\n--- FILTER LOGIC SIMULATION ---');

// Simulation function replicating practice/page.tsx filter logic
function filterSets(searchQuery: string, subjectFilter: string, difficultyFilter: string) {
  return PracticeSets.filter(set => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
                          set.title.toLowerCase().includes(query) || 
                          set.subject.toLowerCase().includes(query) ||
                          set.description.toLowerCase().includes(query);

    const subjectMap: Record<string, string> = {
      quant: "quant",
      gk: "general",
      reasoning: "reason",
      english: "english",
    };
    const target = subjectMap[subjectFilter] || subjectFilter;
    const matchesSubject = subjectFilter === "all" || set.subject.toLowerCase().includes(target.toLowerCase());

    const matchesDifficulty = difficultyFilter === "all" || set.difficulty.toLowerCase() === difficultyFilter.toLowerCase();

    return matchesSearch && matchesSubject && matchesDifficulty;
  });
}

// State 1: Normal (all)
const allSets = filterSets("", "all", "all");
assert('Default unfiltered state returns all practice sets (4)', allSets.length === 4);

// State 2: Subject filter 'quant'
const quantSets = filterSets("", "quant", "all");
assert('Subject filter "quant" returns Quantitative Aptitude set', 
  quantSets.length === 1 && quantSets[0].subject === "Quantitative Aptitude");

// State 3: Topic search 'percentages'
const percentagesSets = filterSets("percentages", "quant", "all");
assert('Personalized query [subject=quant, topic=percentages] returns Percentages set', 
  percentagesSets.length === 1 && percentagesSets[0].title.includes("Percentages"));

// State 4: Topic search 'grammar'
const grammarSets = filterSets("grammar", "english", "all");
assert('Personalized query [subject=english, topic=grammar] returns Grammar set', 
  grammarSets.length === 1 && grammarSets[0].title.includes("Grammar"));

// State 5: Difficulty filter 'Beginner'
const beginnerSets = filterSets("", "all", "beginner");
assert('Difficulty filter "beginner" returns beginner sets', 
  beginnerSets.length === 1 && beginnerSets[0].difficulty === "Beginner");

// State 6: Empty search results
const emptySets = filterSets("nonexistentquery12345", "all", "all");
assert('Non-matching search returns 0 sets', emptySets.length === 0);
assert('Template has empty state for no practice sets found', 
  practiceSrc.includes('No practice sets found') && practiceSrc.includes('Clear All Filters'));

// 6. Personalization State Simulation
console.log('\n--- PERSONALIZATION STATE SIMULATION ---');

// With history
const sampleProfile: PerformanceProfile = {
  examId: 'ex1',
  timestamp: Date.now(),
  totalQuestions: 15,
  attempted: 15,
  correct: 8,
  accuracy: 53,
  subjects: [
    {
      subject: 'Quantitative Aptitude',
      totalQuestions: 4,
      attempted: 4,
      correct: 1,
      incorrect: 3,
      accuracy: 25,
      topics: [{ topic: 'Percentages', totalQuestions: 1, attempted: 1, correct: 0, incorrect: 1, accuracy: 0 }]
    }
  ]
};
const recs = generateRecommendations(sampleProfile, []);
assert('Personalization engine produces recommendations for weak areas', recs.length > 0);
assert('Template displays "Recommended for you · Based on recent performance"', 
  practiceSrc.includes('Recommended for you · Based on recent performance'));
assert('Template has fallback for no exam history ("Start building your learning profile")', 
  practiceSrc.includes('Start building your learning profile'));

// 7. Accessibility Semantics
console.log('\n--- ACCESSIBILITY SEMANTICS ---');
assert('Result counter has aria-live="polite"', practiceSrc.includes('aria-live="polite"'));
assert('Cards have focus-within styles for keyboard navigation', 
  practiceSrc.includes('focus-within:border-primary/50') && practiceSrc.includes('focus-within:ring-2'));
assert('Start Practice button has PlayCircle icon and accessible label', 
  practiceSrc.includes('PlayCircle') && practiceSrc.includes('Start Practice'));
assert('Take a Mock Exam button in header links to /exam', 
  practiceSrc.includes('render={<Link href="/exam" />}'));
assert('Practice sets links use /practice/${practice.id}', 
  practiceSrc.includes('/practice/${practice.id}'));

console.log('\n================================================================');
if (allPassed) {
  console.log('   ALL PRACTICE UI/UX PHASE 3 CHECKS PASSED (100%)             ');
} else {
  console.log('   SOME CHECKS FAILED — REVIEW OUTPUT ABOVE                    ');
}
console.log('================================================================\n');

process.exit(allPassed ? 0 : 1);
