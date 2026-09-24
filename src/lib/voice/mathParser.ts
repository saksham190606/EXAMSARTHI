export function parseMathToSpeech(text: string): string {
  if (!text) return '';

  let speechText = text;

  // LaTeX Math Fractions: \frac{a}{b} -> "a over b"
  // Simple regex for \frac{numerator}{denominator}
  // Note: nested fractions need a proper parser, but a regex works for simple cases.
  speechText = speechText.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, ' fraction $1 over $2 ');

  // Square roots: \sqrt{a} -> "square root of a"
  speechText = speechText.replace(/\\sqrt\{([^}]+)\}/g, ' square root of $1 ');

  // Exponents: x^2 -> "x squared", x^3 -> "x cubed", x^y -> "x to the power of y"
  speechText = speechText.replace(/(\w+)\^2/g, '$1 squared');
  speechText = speechText.replace(/(\w+)\^3/g, '$1 cubed');
  speechText = speechText.replace(/(\w+)\^\{([^}]+)\}/g, '$1 to the power of $2');
  speechText = speechText.replace(/(\w+)\^(\w+)/g, '$1 to the power of $2');

  // Subscripts: x_i -> "x sub i"
  speechText = speechText.replace(/(\w+)_\{([^}]+)\}/g, '$1 sub $2');
  speechText = speechText.replace(/(\w+)_(\w+)/g, '$1 sub $2');

  // Integrals and Sums
  speechText = speechText.replace(/\\int/g, ' integral ');
  speechText = speechText.replace(/\\sum/g, ' sum ');
  speechText = speechText.replace(/\\infty/g, ' infinity ');
  speechText = speechText.replace(/\\pi/g, ' pi ');
  speechText = speechText.replace(/\\theta/g, ' theta ');
  speechText = speechText.replace(/\\alpha/g, ' alpha ');
  speechText = speechText.replace(/\\beta/g, ' beta ');

  // Mathematical Operators
  speechText = speechText.replace(/\s*\+\s*/g, ' plus ');
  speechText = speechText.replace(/\s*-\s*/g, ' minus ');
  speechText = speechText.replace(/\s*\*\s*/g, ' times ');
  speechText = speechText.replace(/\s*\/\s*/g, ' divided by ');
  speechText = speechText.replace(/\s*=\s*/g, ' equals ');
  speechText = speechText.replace(/\s*<\s*/g, ' is less than ');
  speechText = speechText.replace(/\s*>\s*/g, ' is greater than ');
  speechText = speechText.replace(/\s*<=\s*/g, ' is less than or equal to ');
  speechText = speechText.replace(/\s*>=\s*/g, ' is greater than or equal to ');
  speechText = speechText.replace(/\\approx/g, ' is approximately equal to ');
  speechText = speechText.replace(/\\neq/g, ' is not equal to ');

  // Cleanup extra spaces
  speechText = speechText.replace(/\s+/g, ' ').trim();

  return speechText;
}
