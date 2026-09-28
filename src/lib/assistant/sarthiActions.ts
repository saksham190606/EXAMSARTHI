export type SarthiActionType =
  | 'NAVIGATE'
  | 'SET_FONT_SIZE'
  | 'TOGGLE_CONTRAST'
  | 'START_EXAM'
  | 'READ_QUESTION'
  | 'READ_OPTIONS'
  | 'NEXT_QUESTION'
  | 'PREVIOUS_QUESTION'
  | 'SUBMIT_EXAM'
  | 'WHAT_ARE_MY_WEAK_AREAS'
  | 'WHAT_SHOULD_I_PRACTICE'
  | 'START_PRACTICE'
  | 'HOW_SHOULD_I_IMPROVE'
  | 'GET_PERFORMANCE_SUMMARY'
  | 'GET_PERFORMANCE_TREND'
  | 'DIAGNOSE_SCORE'
  | 'WHAT_ARE_MY_WEAK_TOPICS'
  | 'SET_GOAL_GUIDANCE'
  | 'GET_WEEKLY_FOCUS'
  | 'GENERATE_STUDY_PLAN'
  | 'GET_EXAM_TIME_REMAINING'
  | 'GET_CURRENT_EXAM_PERFORMANCE'
  | 'CLOSE_SARTHI'
  | 'GENERAL_RESPONSE'
  | 'HELP_CAPABILITIES';

export interface SarthiAction {
  action: SarthiActionType;
  payload?: any;
  spokenResponse?: string;
}

export interface SarthiActionContext {
  router: { push: (url: string) => void };
  accessibilityStore: any;
  isHindi: boolean;
}

import { getCandidateDashboardAnalytics } from '@/lib/api/examRepository';
import { isExamActiveNow } from '@/lib/assistant/sarthiExamLock';

export async function executeSarthiAction(
  actionData: SarthiAction,
  context: SarthiActionContext
): Promise<string | null> {
  if (isExamActiveNow()) {
    console.warn('[Sarthi] Blocked action execution: Exam is currently active.');
    return null;
  }

  const { action, payload, spokenResponse } = actionData;
  const { router, accessibilityStore, isHindi } = context;

  switch (action) {
    case 'NAVIGATE':
      const targetPath = payload?.path || payload?.url || (actionData as any).path || (actionData as any).url;
      const allowedPaths = ['/dashboard', '/exam', '/results', '/settings', '/practice', '/'];
      if (targetPath && allowedPaths.includes(targetPath)) {
        router.push(targetPath);
      } else {
        console.warn('[Sarthi] Blocked navigation to unauthorized or missing path:', targetPath);
      }
      break;

    case 'SET_FONT_SIZE':
      if (payload?.size && ['default', 'large', 'xlarge'].includes(payload.size)) {
        accessibilityStore.setTextSize(payload.size);
      }
      break;

    case 'TOGGLE_CONTRAST':
      if (payload?.contrast && ['default', 'high'].includes(payload.contrast)) {
        accessibilityStore.setContrast(payload.contrast);
      } else {
        const current = accessibilityStore.contrast;
        accessibilityStore.setContrast(current === 'default' ? 'high' : 'default');
      }
      break;

    case 'START_EXAM':
      if (payload?.examId) {
        router.push(`/exam?examId=${payload.examId}`);
      } else {
        router.push('/exam');
      }
      break;

    case 'READ_QUESTION':
    case 'READ_OPTIONS':
    case 'NEXT_QUESTION':
    case 'PREVIOUS_QUESTION':
    case 'SUBMIT_EXAM':
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('sarthi_exam_action', { detail: { action, payload } });
        window.dispatchEvent(event);
      }
      break;

    case 'WHAT_ARE_MY_WEAK_AREAS':
      try {
        const analytics = await getCandidateDashboardAnalytics();
        const weakSubjects = analytics.subjectMetrics?.filter(s => s.attempted > 0 && s.accuracy < 70) || [];

        if (weakSubjects.length > 0) {
          const getSafeName = (val: any) => typeof val === 'string' ? val : (val?.title || val?.name || 'Unknown Topic');
          const formattedAreas = weakSubjects.map(ws => {
            const subjName = getSafeName(ws.subject);
            return isHindi
              ? `${subjName} (${Math.round(ws.accuracy)} प्रतिशत सटीकता)`
              : `${subjName} with ${Math.round(ws.accuracy)} percent accuracy`;
          });

          const joinedAreas = formattedAreas.length === 1
            ? formattedAreas[0]
            : formattedAreas.slice(0, -1).join(', ') + (isHindi ? ' और ' : ' and ') + formattedAreas[formattedAreas.length - 1];

          return isHindi
            ? `आपके कमजोर विषय हैं: ${joinedAreas}। आपको इन पर ध्यान देना चाहिए।`
            : `Your weak areas are ${joinedAreas}. You should focus on practicing these topics.`;
        } else {
          return isHindi
            ? `मेरे पास आपके कमजोर विषयों की पहचान करने के लिए पर्याप्त प्रदर्शन डेटा नहीं है। कुछ अभ्यास परीक्षण पूरे करें और मैं उनका विश्लेषण कर सकता हूँ।`
            : `I don’t have enough performance data yet to identify your weak areas. Complete a few practice tests and I can analyze them for you.`;
        }
      } catch (e) {
        return isHindi ? 'मैं अभी आपके आंकड़े प्राप्त नहीं कर सकता।' : 'I cannot fetch your analytics right now.';
      }
      break;

    case 'WHAT_SHOULD_I_PRACTICE':
      try {
        const analytics = await getCandidateDashboardAnalytics();
        const subjects = analytics.subjectMetrics?.filter(s => s.attempted > 0) || [];

        if (subjects.length > 0) {
          const getSafeName = (val: any) => typeof val === 'string' ? val : (val?.title || val?.name || 'Unknown Topic');
          subjects.sort((a, b) => a.accuracy - b.accuracy);
          const weakest = subjects[0];
          const secondWeakest = subjects.length > 1 ? subjects[1] : null;

          const weakestName = getSafeName(weakest.subject);

          if (secondWeakest) {
            const secondName = getSafeName(secondWeakest.subject);
            return isHindi
              ? `मैं आपको सबसे पहले ${weakestName} का अभ्यास करने की सलाह देती हूँ, जिसकी सटीकता ${Math.round(weakest.accuracy)} प्रतिशत है। उसके बाद आप ${secondName} का अभ्यास कर सकते हैं।`
              : `I recommend starting with ${weakestName} at ${Math.round(weakest.accuracy)} percent accuracy, followed by ${secondName} at ${Math.round(secondWeakest.accuracy)} percent.`;
          }

          return isHindi
            ? `आपका मुख्य अभ्यास क्षेत्र ${weakestName} है। आपकी वर्तमान सटीकता ${Math.round(weakest.accuracy)} प्रतिशत है, इसलिए मैं आपको पहले इसी पर ध्यान देने की सलाह देती हूँ।`
            : `Your main practice area is ${weakestName}. Your current accuracy is ${Math.round(weakest.accuracy)} percent, so I recommend focusing on it first.`;
        } else {
          return isHindi
            ? `मुझे आपको सुझाव देने के लिए पर्याप्त प्रदर्शन डेटा नहीं मिला है। कृपया कुछ और अभ्यास परीक्षण पूरे करें।`
            : `I don't have enough performance data yet to make a personalized recommendation. Complete a few more practice tests and I can recommend what to focus on.`;
        }
      } catch (e) {
        return isHindi ? 'मैं अभी आपके आंकड़े प्राप्त नहीं कर सकता।' : 'I cannot fetch your analytics right now.';
      }

    case 'START_PRACTICE':
      if (payload?.subject && typeof payload.subject === 'string') {
        const clean = payload.subject.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
        const slug = clean.replace(/^-+|-+$/g, '');
        if (slug) {
          router.push(`/practice?subject=${encodeURIComponent(slug)}`);
        } else {
          router.push('/practice');
        }
      } else {
        router.push('/practice');
      }
      return isHindi ? 'अभ्यास शुरू कर रही हूँ।' : 'Opening Practice.';

    case 'HOW_SHOULD_I_IMPROVE':
      try {
        const analytics = await getCandidateDashboardAnalytics();
        const subjects = analytics.subjectMetrics?.filter(s => s.attempted > 0) || [];

        if (subjects.length > 0) {
          subjects.sort((a, b) => a.accuracy - b.accuracy);
          const weakest = subjects[0];
          const getSafeName = (val: any) => typeof val === 'string' ? val : (val?.title || val?.name || 'Unknown Topic');
          const weakestName = getSafeName(weakest.subject);

          return isHindi
            ? `आपकी ${weakestName} में सटीकता अन्य विषयों से कम है। मैं आपको पहले इसका अभ्यास करने की सलाह देती हूँ।`
            : `Your ${weakestName} accuracy is currently lower than your other subjects. I recommend practicing ${weakestName} first and reviewing the topics where you make the most mistakes.`;
        } else {
          return isHindi
            ? `मुझे सुधार के लिए सुझाव देने के लिए पर्याप्त प्रदर्शन डेटा नहीं मिला है।`
            : `I don't have enough performance data yet to give specific study advice. Keep practicing!`;
        }
      } catch (e) {
        return isHindi ? 'मैं अभी आपके आंकड़े प्राप्त नहीं कर सकता।' : 'I cannot fetch your analytics right now.';
      }

    case 'GET_PERFORMANCE_SUMMARY':
      try {
        const analytics = await getCandidateDashboardAnalytics();
        if (analytics.completedAttemptsCount > 0) {
          return isHindi
            ? `आपके दर्ज किए गए अभ्यास परीक्षणों में आपकी समग्र सटीकता ${analytics.averageAccuracy} प्रतिशत है।`
            : `Your current overall accuracy is ${analytics.averageAccuracy} percent across your recorded practice attempts.`;
        } else {
          return isHindi
            ? `अभी तक कोई प्रदर्शन डेटा नहीं मिला है।`
            : `I don't have any recorded practice attempts to summarize your performance yet.`;
        }
      } catch (e) {
        return isHindi ? 'मैं अभी आपके आंकड़े प्राप्त नहीं कर सकता।' : 'I cannot fetch your analytics right now.';
      }

    case 'GET_PERFORMANCE_TREND':
      try {
        const analytics = await getCandidateDashboardAnalytics();
        const { trend, subjectMetrics } = analytics;

        if (!trend || !trend.hasTrend || trend.trendDiff === null) {
          return isHindi
            ? 'मेरे पास आपके प्रदर्शन के रुझान को निर्धारित करने के लिए अभी पर्याप्त पूर्ण परीक्षण नहीं हैं।'
            : "I don't have enough completed tests yet to determine your performance trend.";
        }

        const diff = trend.trendDiff;
        if (diff > 0) {
          return isHindi
            ? `हाँ। आपका हालिया प्रदर्शन ${diff} प्रतिशत अंकों से सुधर रहा है।`
            : `Yes. Your recent performance is improving by ${diff} percentage points.`;
        } else if (diff < 0) {
          const drop = Math.abs(diff);
          const weakSubjects = subjectMetrics?.filter(s => s.attempted > 0 && s.accuracy < 70) || [];
          if (weakSubjects.length > 0) {
            const getSafeName = (val: any) => typeof val === 'string' ? val : (val?.title || val?.name || 'Unknown Subject');
            const weakest = weakSubjects[0];
            const weakestName = getSafeName(weakest.subject);
            return isHindi
              ? `आपके हालिया प्रदर्शन में ${drop} प्रतिशत अंकों की गिरावट आई है। आपका सबसे कमजोर क्षेत्र ${weakestName} है जिसमें ${Math.round(weakest.accuracy)} प्रतिशत सटीकता है।`
              : `Your recent performance has dropped by ${drop} percentage points. Your weakest area is ${weakestName} at ${Math.round(weakest.accuracy)} percent accuracy.`;
          }
          return isHindi
            ? `आपके पिछले प्रयास की तुलना में आपके हालिया प्रदर्शन में ${drop} प्रतिशत अंकों की गिरावट आई है।`
            : `Your recent performance has dropped by ${drop} percentage points compared to your previous test.`;
        } else {
          return isHindi
            ? 'आपका प्रदर्शन स्थिर है और आपके पिछले परीक्षण के समान ही सटीकता है।'
            : 'Your performance is stable with the same accuracy as your previous test.';
        }
      } catch (e) {
        return isHindi ? 'मैं अभी आपके आंकड़े प्राप्त नहीं कर सकती।' : 'I cannot fetch your analytics right now.';
      }

    case 'DIAGNOSE_SCORE':
      try {
        const analytics = await getCandidateDashboardAnalytics();
        if (analytics.completedAttemptsCount === 0) {
          return isHindi
            ? 'मेरे पास अभी यह निर्धारित करने के लिए पर्याप्त विस्तृत डेटा नहीं है कि आपका स्कोर क्यों कम है। कुछ अभ्यास परीक्षण पूरे करें और मैं आपके प्रदर्शन का विश्लेषण कर सकती हूँ।'
            : "I don't have enough detailed attempt data to determine exactly why your score is low yet. Complete a practice test and I can diagnose your performance.";
        }

        const observations: string[] = [];
        const hindiObservations: string[] = [];

        // Check latest attempt unattempted / incorrect
        const latest = analytics.recentActivity && analytics.recentActivity.length > 0 ? analytics.recentActivity[0] : null;
        if (latest) {
          const unattempted = latest.totalQuestions - latest.attemptedCount;
          const incorrect = latest.attemptedCount - latest.correctCount;

          if (unattempted >= 2) {
            observations.push(`you left ${unattempted} questions unattempted in your latest test`);
            hindiObservations.push(`आपने अपने हालिया टेस्ट में ${unattempted} प्रश्न अनुत्तरित छोड़े`);
          }
          if (incorrect >= 2) {
            observations.push(`you had ${incorrect} incorrect answers`);
            hindiObservations.push(`आपके ${incorrect} उत्तर गलत थे`);
          }
        }

        // Check weakest subject
        const subjects = analytics.subjectMetrics?.filter(s => s.attempted > 0) || [];
        if (subjects.length > 0) {
          const getSafeName = (val: any) => typeof val === 'string' ? val : (val?.title || val?.name || 'Unknown Subject');
          subjects.sort((a, b) => a.accuracy - b.accuracy);
          const weakest = subjects[0];
          const weakestName = getSafeName(weakest.subject);

          if (weakest.accuracy < 70) {
            observations.push(`your ${weakestName} accuracy is currently ${Math.round(weakest.accuracy)}% which is significantly lowering your total score`);
            hindiObservations.push(`आपकी ${weakestName} में सटीकता ${Math.round(weakest.accuracy)}% है जो आपके स्कोर को कम कर रही है`);
          }
        }

        if (observations.length > 0) {
          const summaryText = observations.join(', and ');
          const hindiSummaryText = hindiObservations.join(', और ');
          return isHindi
            ? `डेटा के अनुसार: ${hindiSummaryText}। मैं आपको कमजोर विषयों पर ध्यान देने और उत्तरों की समीक्षा करने की सलाह देती हूँ।`
            : `Based on your test data: ${summaryText}. I recommend focusing on your weakest areas and reviewing answer explanations to prevent losing marks.`;
        }

        return isHindi
          ? `आपके पिछले परीक्षणों में सटीकता ${analytics.averageAccuracy}% है। स्कोर सुधारने के लिए नियमित अभ्यास जारी रखें।`
          : `Your overall accuracy across recorded tests is ${analytics.averageAccuracy}%. Consistent practice and reviewing incorrect answers will help boost your score.`;
      } catch (e) {
        return isHindi ? 'मैं अभी आपके आंकड़े प्राप्त नहीं कर सकती।' : 'I cannot fetch your analytics right now.';
      }

    case 'WHAT_ARE_MY_WEAK_TOPICS':
      try {
        const analytics = await getCandidateDashboardAnalytics();
        if (analytics.completedAttemptsCount === 0) {
          return isHindi
            ? 'मेरे पास अभी आपके कमजोर विषयों का विश्लेषण करने के लिए पर्याप्त प्रदर्शन डेटा नहीं है।'
            : "I don't have enough performance data yet to analyze your topics.";
        }

        const normalizeSubject = (input?: string) => {
          if (!input) return '';
          const clean = input.toLowerCase().trim();
          if (clean.includes('math') || clean.includes('quant') || clean.includes('arithmetic') || clean.includes('numerical')) {
            return 'Quantitative Aptitude';
          }
          if (clean.includes('reason') || clean.includes('logic')) {
            return 'Reasoning';
          }
          if (clean.includes('english') || clean.includes('verbal') || clean.includes('grammar')) {
            return 'English';
          }
          if (clean.includes('gk') || clean.includes('general knowledge') || clean.includes('current affairs') || clean.includes('general awareness')) {
            return 'General Knowledge';
          }
          return input;
        };

        const reqSubject = payload?.subject ? normalizeSubject(payload.subject) : null;
        const topicMetrics = analytics.topicMetrics || [];

        let filteredTopics = topicMetrics.filter(t => t.attempted > 0);
        if (reqSubject) {
          filteredTopics = filteredTopics.filter(t =>
            t.subject.toLowerCase() === reqSubject.toLowerCase() ||
            t.subject.toLowerCase().includes(reqSubject.toLowerCase())
          );
        }

        if (filteredTopics.length > 0) {
          filteredTopics.sort((a, b) => a.accuracy - b.accuracy);
          const weakTopics = filteredTopics.filter(t => t.accuracy < 70);
          const targetList = weakTopics.length > 0 ? weakTopics : filteredTopics.slice(0, 2);

          const formatted = targetList.map(t =>
            isHindi
              ? `${t.topic} (${Math.round(t.accuracy)} प्रतिशत सटीकता)`
              : `${t.topic} at ${Math.round(t.accuracy)}% accuracy`
          );

          const joined = formatted.join(isHindi ? ' और ' : ' and ');
          const subjLabel = reqSubject ? reqSubject : 'your tests';
          const hindiSubjLabel = reqSubject ? reqSubject : 'आपके परीक्षणों';

          return isHindi
            ? `${hindiSubjLabel} में आपके कमजोर टॉपिक हैं: ${joined}।`
            : `Your weakest ${reqSubject ? reqSubject + ' ' : ''}topics are ${joined}.`;
        }

        if (reqSubject) {
          const subj = analytics.subjectMetrics?.find(s =>
            s.subject.toLowerCase() === reqSubject.toLowerCase() ||
            s.subject.toLowerCase().includes(reqSubject.toLowerCase())
          );
          if (subj && subj.attempted > 0) {
            return isHindi
              ? `मेरे पास ${reqSubject} के लिए अभी टॉपिक-स्तरीय प्रदर्शन डेटा नहीं है, लेकिन आपकी कुल ${reqSubject} सटीकता ${Math.round(subj.accuracy)} प्रतिशत है।`
              : `I don't have enough topic-level performance data for ${reqSubject} yet, but your overall ${reqSubject} accuracy is ${Math.round(subj.accuracy)}%.`;
          }
          return isHindi
            ? `मेरे पास ${reqSubject} के लिए अभी पर्याप्त प्रदर्शन डेटा नहीं है।`
            : `I don't have enough performance data for ${reqSubject} yet.`;
        }

        const weakestSubj = analytics.subjectMetrics?.[0];
        if (weakestSubj) {
          const getSafeName = (val: any) => typeof val === 'string' ? val : (val?.title || val?.name || 'Unknown Subject');
          return isHindi
            ? `मेरे पास अभी विस्तृत टॉपिक-स्तरीय डेटा नहीं है, लेकिन आपका सबसे कमजोर विषय ${getSafeName(weakestSubj.subject)} (${Math.round(weakestSubj.accuracy)}%) है।`
            : `I don't have detailed topic-level data yet, but your weakest subject is ${getSafeName(weakestSubj.subject)} at ${Math.round(weakestSubj.accuracy)}% accuracy.`;
        }

        return isHindi
          ? 'मेरे पास अभी टॉपिक-स्तरीय प्रदर्शन डेटा नहीं है।'
          : "I don't have enough topic-level performance data yet.";
      } catch (e) {
        return isHindi ? 'मैं अभी आपके आंकड़े प्राप्त नहीं कर सकती।' : 'I cannot fetch your analytics right now.';
      }

    case 'SET_GOAL_GUIDANCE': {
      try {
        const analytics = await getCandidateDashboardAnalytics();
        const subjects = analytics.subjectMetrics?.filter(s => s.attempted > 0) || [];
        if (subjects.length === 0) {
          return isHindi
            ? 'अभी के लिए पर्याप्त प्रदर्शन डेटा नहीं है, इसलिए मैं लक्ष्य-आधारित सुधार योजना नहीं बना सकता।'
            : "I don't have enough performance data yet to build a goal-based improvement plan.";
        }

        const targetSubject = payload?.subject
          ? subjects.find(s => s.subject.toLowerCase().includes(String(payload.subject).toLowerCase())) || subjects[0]
          : subjects[0];

        const targetName = targetSubject.subject;
        const currentAccuracy = Math.round(targetSubject.accuracy);
        const targetAccuracy = Math.min(95, Math.max(currentAccuracy + 15, 75));
        const gap = Math.max(0, targetAccuracy - currentAccuracy);

        return isHindi
          ? `आपका लक्ष्य ${targetName} में ${currentAccuracy}% से ${targetAccuracy}% तक सुधार करना है। इसके लिए आपको ${gap} प्रतिशत अंकों के अंतर को पाटने के लिए ${targetName} पर लगातार अभ्यास, गलत उत्तरों की समीक्षा और छोटे परीक्षणों का उपयोग करना चाहिए।`
          : `Your goal is to improve ${targetName} from ${currentAccuracy}% to ${targetAccuracy}% accuracy. To do that, focus on targeted practice in ${targetName}, review incorrect answers, and take short timed drills until you close the ${gap}-point gap.`;
      } catch {
        return isHindi ? 'मैं अपने लक्ष्य विश्लेषण को अभी अपडेट नहीं कर सकता।' : 'I cannot compute a goal plan right now.';
      }
    }

    case 'GET_WEEKLY_FOCUS': {
      try {
        const analytics = await getCandidateDashboardAnalytics();
        const subjects = analytics.subjectMetrics?.filter(s => s.attempted > 0) || [];
        if (subjects.length === 0) {
          return isHindi
            ? 'इस सप्ताह के लिए कोई व्यक्तिगत फोकस नहीं बनाया जा सकता क्योंकि अभी पर्याप्त डेटा उपलब्ध नहीं है।'
            : "I don't have enough data to build this week's specific focus yet.";
        }

        subjects.sort((a, b) => a.accuracy - b.accuracy);
        const weakest = subjects[0];
        const next = subjects[1] || weakest;
        const focusParts = [
          isHindi ? `${weakest.subject} पर अधिक समय` : `${weakest.subject} deserves the most attention`,
          isHindi ? `${next.subject} पर छोटे, उच्च-आवृत्ति अभ्यास` : `short timed drills for ${next.subject}`
        ];

        return isHindi
          ? `इस सप्ताह आपका मुख्य फोकस ${focusParts[0]} होगा, और उसके बाद ${focusParts[1]} करना चाहिए।`
          : `This week's focus is ${focusParts[0]}, followed by ${focusParts[1]}.`;
      } catch {
        return isHindi ? 'मैं इस सप्ताह का फोकस अभी नहीं बना सकता।' : 'I cannot set this week\'s focus right now.';
      }
    }

    case 'GENERATE_STUDY_PLAN': {
      try {
        const analytics = await getCandidateDashboardAnalytics();
        const subjects = analytics.subjectMetrics?.filter(s => s.attempted > 0) || [];
        if (subjects.length === 0) {
          return isHindi
            ? 'अभी पर्याप्त प्रदर्शन डेटा नहीं है, इसलिए मैं व्यक्तिगत अध्ययन योजना नहीं बना सकता।'
            : "I don't have enough performance data yet to build a personalized study plan.";
        }

        subjects.sort((a, b) => a.accuracy - b.accuracy);
        const weakest = subjects[0];
        const second = subjects[1] || weakest;
        const totalMinutes = 90;

        return isHindi
          ? `आपकी अध्ययन योजना: पहले ${totalMinutes / 2} मिनट ${weakest.subject} पर, फिर ${totalMinutes / 3} मिनट ${second.subject} पर, और最後 ${totalMinutes / 6} मिनट सामान्य रीविजन पर।`
          : `Your study plan: spend ${Math.round(totalMinutes / 2)} minutes on ${weakest.subject}, ${Math.round(totalMinutes / 3)} minutes on ${second.subject}, then ${Math.round(totalMinutes / 6)} minutes on quick revision.`;
      } catch {
        return isHindi ? 'मैं आपकी अध्ययन योजना अभी नहीं बना सकता।' : 'I cannot generate a study plan right now.';
      }
    }

    case 'GET_EXAM_TIME_REMAINING':
      if (typeof window !== 'undefined') {
        const examCtx = (window as any).__sarthi_exam_context;
        if (examCtx && typeof examCtx.timeRemaining === 'number') {
          const mins = Math.floor(examCtx.timeRemaining / 60);
          const secs = examCtx.timeRemaining % 60;
          return isHindi
            ? `आपके पास ${mins} मिनट और ${secs} सेकंड बचे हैं।`
            : `You have ${mins} minutes and ${secs} seconds remaining.`;
        }
      }
      return isHindi ? 'आप अभी किसी सक्रिय परीक्षा में नहीं हैं।' : 'You are not currently in an active exam with a timer.';

    case 'GET_CURRENT_EXAM_PERFORMANCE':
      if (typeof window !== 'undefined') {
        const examCtx = (window as any).__sarthi_exam_context;
        if (examCtx && typeof examCtx.answeredCount === 'number') {
          return isHindi
            ? `आपने अब तक ${examCtx.total} में से ${examCtx.answeredCount} प्रश्नों के उत्तर दिए हैं।`
            : `You have answered ${examCtx.answeredCount} out of ${examCtx.total} questions so far.`;
        }
      }
      return isHindi ? 'मैं अभी परीक्षा का विवरण नहीं पढ़ सकती।' : 'I cannot read the current exam details right now.';

    case 'CLOSE_SARTHI':
      return isHindi ? 'धन्यवाद, सारथी बंद हो रहा है।' : 'Closing Sarthi. Let me know if you need help later.';

    case 'HELP_CAPABILITIES':
      return isHindi
        ? 'मैं EXAMSARTHI को नेविगेट करने, एक्सेसिबिलिटी सेटिंग बदलने, परीक्षा के प्रश्न और विकल्प पढ़ने, परीक्षा क्रियाओं को नियंत्रित करने और आपके प्रदर्शन को समझने में मदद कर सकती हूँ।'
        : 'I can help you navigate EXAMSARTHI, change accessibility settings, analyze your performance, recommend what to practice, and guide you through the platform.';

    case 'GENERAL_RESPONSE':
      break;

    default:
      console.warn('Unknown Sarthi Action:', action);
  }

  return spokenResponse || null;
}
