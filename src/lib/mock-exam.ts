export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string;
  explanation: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

export const mockExam: Exam = {
  id: "web-a11y-101",
  title: "Web Accessibility 101",
  description: "A quick practice exam to test your foundational knowledge of WCAG 2.1 AA accessibility standards.",
  questions: [
    {
      id: "q1",
      text: "Which HTML element is the most semantically correct for grouping a set of radio buttons?",
      options: [
        { id: "o1", text: "<div>" },
        { id: "o2", text: "<form>" },
        { id: "o3", text: "<fieldset>" },
        { id: "o4", text: "<group>" }
      ],
      correctOptionId: "o3",
      explanation: "A <fieldset> groups related form controls. When used with a <legend>, it provides accessible context to screen readers for the entire group."
    },
    {
      id: "q2",
      text: "What is the minimum recommended color contrast ratio for normal text under WCAG 2.1 AA?",
      options: [
        { id: "o1", text: "3.0:1" },
        { id: "o2", text: "4.5:1" },
        { id: "o3", text: "7.0:1" },
        { id: "o4", text: "2.5:1" }
      ],
      correctOptionId: "o2",
      explanation: "WCAG 2.1 AA requires a contrast ratio of at least 4.5:1 for normal text and 3.0:1 for large text or UI components."
    },
    {
      id: "q3",
      text: "How should an active, current page link be indicated to screen reader users in a navigation menu?",
      options: [
        { id: "o1", text: "Using a different text color" },
        { id: "o2", text: "By adding aria-current=\"page\"" },
        { id: "o3", text: "By using the <b> tag" },
        { id: "o4", text: "By adding an asterisk (*) next to it" }
      ],
      correctOptionId: "o2",
      explanation: "Using aria-current=\"page\" programmatically indicates to assistive technologies that the link represents the current page."
    },
    {
      id: "q4",
      text: "Which ARIA attribute is best used to provide instructions or an error message associated with an input field?",
      options: [
        { id: "o1", text: "aria-labelledby" },
        { id: "o2", text: "aria-hidden" },
        { id: "o3", text: "aria-describedby" },
        { id: "o4", text: "aria-details" }
      ],
      correctOptionId: "o3",
      explanation: "aria-describedby establishes a relationship between the input and the element containing the descriptive text or error message."
    },
    {
      id: "q5",
      text: "What is the primary purpose of a 'Skip to main content' link?",
      options: [
        { id: "o1", text: "To bypass decorative images" },
        { id: "o2", text: "To improve SEO rankings" },
        { id: "o3", text: "To allow keyboard users to bypass repetitive navigation links" },
        { id: "o4", text: "To load the page faster" }
      ],
      correctOptionId: "o3",
      explanation: "Skip links allow keyboard-only and screen reader users to quickly bypass repetitive blocks of content (like site headers and navigation menus) to reach the main content."
    }
  ]
};
