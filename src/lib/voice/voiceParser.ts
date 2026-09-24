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
  // Normalize transcript
  const t = transcript.toLowerCase().replace(/[.,!?;:]/g, '').trim();

  // Answer Selection
  if (/^(option )?a$/i.test(t)) return { type: 'SELECT_OPTION', letterIndex: 0 };
  if (/^(option )?b$/i.test(t)) return { type: 'SELECT_OPTION', letterIndex: 1 };
  if (/^(option )?c$/i.test(t)) return { type: 'SELECT_OPTION', letterIndex: 2 };
  if (/^(option )?d$/i.test(t)) return { type: 'SELECT_OPTION', letterIndex: 3 };

  // Confirmation
  if (/^(yes|yeah|sure|confirm)$/i.test(t)) return { type: 'YES' };
  if (/^(no|cancel|stop)$/i.test(t)) return { type: 'NO' };

  // Navigation
  if (/^(next|next question|go next)$/i.test(t)) return { type: 'NEXT' };
  if (/^(previous|previous question|go back|back)$/i.test(t)) return { type: 'PREVIOUS' };

  // Go to specific question
  const gotoMatch = t.match(/^(go to )?question (\d+)$/i);
  if (gotoMatch && gotoMatch[2]) {
    const qNum = parseInt(gotoMatch[2], 10);
    if (!isNaN(qNum)) return { type: 'GOTO', questionNumber: qNum };
  }

  // Reading / Repeating
  if (/^(repeat|repeat question|read again)$/i.test(t)) return { type: 'REPEAT' };
  if (/^(read question|what is the question)$/i.test(t)) return { type: 'READ_QUESTION' };
  if (/^(read options|what are the options)$/i.test(t)) return { type: 'READ_OPTIONS' };

  // Time
  if (/^(time|time left|how much time is left|remaining time)$/i.test(t)) return { type: 'TIME_LEFT' };

  // Submission
  if (/^(submit|submit exam|finish test|finish exam)$/i.test(t)) return { type: 'SUBMIT' };

  return { type: 'UNKNOWN' };
}
