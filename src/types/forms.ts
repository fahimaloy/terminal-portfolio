// src/types/forms.ts
/* Submission lifecycle shared by the chat-overlay forms.
 *
 * Only the forms that end in an explicit "submitted" acknowledgement share this
 * (ContactForm, MeetingForm). ProjectMatchForm does not: it goes to 'result'
 * when the match lands and has no submitted state, so it keeps its own local
 * union rather than pretending to be the same shape. */

export type FormState = 'filling' | 'submitting' | 'submitted' | 'error';
