export type ParsedCommand = 
  | { type: 'SELECT_OPTION', letterIndex: number } // 0 = A, 1 = B, etc.
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'REPEAT' }
  | { type: 'READ_QUESTION' }
  | { type: 'READ_OPTIONS' }
  | { type: 'SUBMIT' }
  | { type: 'GOTO', questionNumber: number }
  | { type: 'TIME_LEFT' }
  | { type: 'YES' }
  | { type: 'NO' }
  | { type: 'UNKNOWN' };

export function parseVoiceCommand(transcript: string): ParsedCommand {
  if (!transcript || typeof transcript !== 'string') {
    return { type: 'UNKNOWN' };
  }

  // Normalize transcript: lowercase, remove punctuation, collapse whitespace
  const t = transcript
    .toLowerCase()
    .replace(/[.,!?;:()[\]{}'"`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!t) {
    return { type: 'UNKNOWN' };
  }

  // 1. Answer Selection (Option A / B / C / D, 1 / 2 / 3 / 4, Hindi: विकल्प, ऑप्शन, पहला, दूसरा...)
  
  // Option A / 1
  if (
    /^(?:select |choose |mark |answer )?(?:option |vikalp |विकल्प |ऑप्शन )?(?:a|1|one|पहला|ए)$/i.test(t) ||
    /^(?:option|vikalp|विकल्प|ऑप्शन)\s+(?:a|1|one|पहला|ए)$/i.test(t) ||
    t === 'a' || t === '1' || t === 'ए' || t === 'पहला' || t === 'pehla'
  ) {
    return { type: 'SELECT_OPTION', letterIndex: 0 };
  }

  // Option B / 2
  if (
    /^(?:select |choose |mark |answer )?(?:option |vikalp |विकल्प |ऑप्शन )?(?:b|2|two|दो|दूसरा|बी|bee)$/i.test(t) ||
    /^(?:option|vikalp|विकल्प|ऑप्शन)\s+(?:b|2|two|दो|दूसरा|बी)$/i.test(t) ||
    t === 'b' || t === '2' || t === 'बी' || t === 'दूसरा' || t === 'doosra' || t === 'dusra'
  ) {
    return { type: 'SELECT_OPTION', letterIndex: 1 };
  }

  // Option C / 3
  if (
    /^(?:select |choose |mark |answer )?(?:option |vikalp |विकल्प |ऑप्शन )?(?:c|3|three|तीन|तीसरा|सी|see|sea)$/i.test(t) ||
    /^(?:option|vikalp|विकल्प|ऑप्शन)\s+(?:c|3|three|तीन|तीसरा|सी)$/i.test(t) ||
    t === 'c' || t === '3' || t === 'सी' || t === 'तीसरा' || t === 'teesra' || t === 'tisra'
  ) {
    return { type: 'SELECT_OPTION', letterIndex: 2 };
  }

  // Option D / 4
  if (
    /^(?:select |choose |mark |answer )?(?:option |vikalp |विकल्प |ऑप्शन )?(?:d|4|four|चार|चौथा|डी|dee)$/i.test(t) ||
    /^(?:option|vikalp|विकल्प|ऑप्शन)\s+(?:d|4|four|चार|चौथा|डी)$/i.test(t) ||
    t === 'd' || t === '4' || t === 'डी' || t === 'चौथा' || t === 'chautha'
  ) {
    return { type: 'SELECT_OPTION', letterIndex: 3 };
  }

  // 2. Confirmation (Yes / No)
  if (/^(?:yes|yeah|sure|confirm|yep|haan|ha|हाँ|हा|सही|पुष्टि)$/i.test(t)) {
    return { type: 'YES' };
  }
  if (/^(?:no|cancel|stop|nope|nahi|nahin|नहीं|रद्द|रोको)$/i.test(t)) {
    return { type: 'NO' };
  }

  // 3. Navigation (Next / Previous)
  if (/^(?:next|next question|go next|forward|अगला|अगला प्रश्न|आगे|आगे बढ़ो|aage|agla)$/i.test(t)) {
    return { type: 'NEXT' };
  }
  if (/^(?:previous|previous question|go back|back|पिछला|पिछला प्रश्न|पीछे|pichhla|peeche)$/i.test(t)) {
    return { type: 'PREVIOUS' };
  }

  // 4. Go to specific question (e.g. "go to question 4", "question 5", "प्रश्न 5")
  const gotoMatch = t.match(/^(?:go to |goto )?(?:question|prashna|प्रश्न|सवाल)\s*(\d+)$/i);
  if (gotoMatch && gotoMatch[1]) {
    const qNum = parseInt(gotoMatch[1], 10);
    if (!isNaN(qNum)) return { type: 'GOTO', questionNumber: qNum };
  }

  // 5. Reading / Repeating
  if (/^(?:repeat|repeat question|read again|say again|दोहराओ|फिर से बोलो|फिर से पढ़ो|dohrao)$/i.test(t)) {
    return { type: 'REPEAT' };
  }
  if (/^(?:read question|what is the question|question please|प्रश्न पढ़ो|सवाल पढ़ो|prashna padho)$/i.test(t)) {
    return { type: 'READ_QUESTION' };
  }
  if (/^(?:read options|what are the options|options please|विकल्प पढ़ो|vikalp padho)$/i.test(t)) {
    return { type: 'READ_OPTIONS' };
  }

  // 6. Time Inquiry
  if (/^(?:time|time left|how much time is left|remaining time|samay|समय|कितना समय|kitna samay|kitna time)$/i.test(t)) {
    return { type: 'TIME_LEFT' };
  }

  // 7. Submission
  if (/^(?:submit|submit exam|finish test|finish exam|end exam|सबमिट|जमा करो|परीक्षा समाप्त|jama karo|submit karo)$/i.test(t)) {
    return { type: 'SUBMIT' };
  }

  return { type: 'UNKNOWN' };
}
