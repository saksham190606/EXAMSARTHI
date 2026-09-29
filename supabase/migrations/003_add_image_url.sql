ALTER TABLE public.questions ADD COLUMN image_url TEXT;

CREATE OR REPLACE VIEW public.exam_active_questions AS
SELECT
  eq.exam_id,
  eq.section_name,
  eq.order_index,
  q.id AS question_id,
  q.type,
  q.text,
  q.subject,
  q.topic,
  q.difficulty,
  q.options,
  q.image_url,
  q.created_at
FROM public.exam_questions eq
JOIN public.questions q ON eq.question_id = q.id;
