// src/components/__tests__/ContactForm.test.tsx
//
// P3.4 — WCAG 3.3.2 (Labels or Instructions) and 4.1.2 (Name, Role, Value).
//
// Before: zero <label> elements, zero aria-* attributes. The four fields
// carried their only label in `placeholder`, which vanishes on first keystroke
// and is not a name source at all. Validation pushed every failure into one
// top-of-form string that no control pointed at, so a screen-reader user heard
// "Message is required" with no idea which of the four fields it meant.
//
// These tests assert the whole announcement path: name → validity → description,
// plus focus landing on the offending control.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

vi.mock('axios', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: { ok: true } }) },
}));

import ContactForm from '../ContactForm';
import axios from 'axios';

const mockedPost = vi.mocked(axios.post);

/** jsdom has no matchMedia; isReducedMotion() in config/animations reads it. */
function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function renderForm(onBackToChat = vi.fn()) {
  return render(<ContactForm onBackToChat={onBackToChat} />);
}

function getForm(): HTMLFormElement {
  return screen.getByTestId('contact-form') as HTMLFormElement;
}

/**
 * Resolve everything a control is described by.
 *
 * `aria-describedby` is a space-separated *list* of ids, not a single one, and
 * the textarea uses that: it keeps its static format hint described at all
 * times and appends the error id once it has one
 * (`ContactForm.tsx` FieldTextarea). `document.getElementById()` cannot parse
 * that list — it looks up one literal string, finds nothing, and reports the
 * wiring as broken when every node is present. Resolving the list is also what
 * tells the two kinds of description apart: the error is a live `role="alert"`,
 * the hint is a static note and must never be asserted to announce.
 */
function describedByTargets(el: HTMLElement): HTMLElement[] {
  const raw = el.getAttribute('aria-describedby') ?? '';
  const ids = raw.split(/\s+/).filter(Boolean);
  expect(
    ids.length,
    `${el.tagName} must be described by something`,
  ).toBeGreaterThan(0);
  return ids.map((id) => {
    const node = document.getElementById(id);
    // A dangling id is silent for a screen reader: the description is simply
    // not read. Assert per id so the failure names the broken one.
    expect(
      node,
      `aria-describedby target #${id} is missing from the DOM`,
    ).not.toBeNull();
    return node as HTMLElement;
  });
}

/** The live `role="alert"` among a control's descriptions, if it has one. */
function liveDescription(el: HTMLElement): HTMLElement | undefined {
  return describedByTargets(el).find((t) => t.getAttribute('role') === 'alert');
}

/** The four controls, in the visual/reading order the form renders them. */
function controls(container: HTMLElement): HTMLElement[] {
  return [
    container.querySelector('input[id$="-name"]')!,
    container.querySelector('input[id$="-email"]')!,
    container.querySelector('input[id$="-subject"]')!,
    container.querySelector('textarea[id$="-message"]')!,
  ] as HTMLElement[];
}

describe('ContactForm — accessibility (P3.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPost.mockResolvedValue({ data: { ok: true } });
    mockMatchMedia();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line
    delete (window as any).matchMedia;
  });

  describe('labels and accessible names', () => {
    it('every control has a real <label for> and a non-empty accessible name', () => {
      const { container } = renderForm();

      const [name, email, subject, message] = controls(container);
      for (const el of [name, email, subject, message]) {
        expect(el).toBeInTheDocument();
        const id = el.getAttribute('id')!;
        expect(id).toBeTruthy();

        // A real <label for>, not a wrapper div and not a placeholder.
        const label = container.querySelector(`label[for="${id}"]`);
        expect(label).not.toBeNull();
        expect(label!.tagName).toBe('LABEL');

        // WCAG 4.1.2: the control must have a non-empty accessible name.
        const accessibleName =
          el.getAttribute('aria-label') ?? label!.textContent ?? '';
        expect(accessibleName.replace(/\s+/g, ' ').trim()).not.toHaveLength(0);
      }
    });

    it('required vs optional reaches the accessible name, not just the colour', () => {
      const { container } = renderForm();
      const [name, email, subject, message] = controls(container);

      // The coral asterisk is aria-hidden on purpose, so the accessible name
      // gets an sr-only "(required)" twin instead of reading as a bare NAME.
      expect(name).toHaveAccessibleName('NAME (required)');
      expect(email).toHaveAccessibleName('EMAIL (required)');
      expect(message).toHaveAccessibleName('MESSAGE (required)');
      expect(subject).toHaveAccessibleName('SUBJECT (optional)');

      // The visible half is still there for sighted users, and the dash/asterisk
      // is not the only signal — a word accompanies it in both branches.
      const subjectLabel = container.querySelector(
        `label[for="${subject.getAttribute('id')}"]`,
      )!;
      expect(subjectLabel.textContent).toContain('—');
      expect(subjectLabel.textContent).toContain('(optional)');
    });

    it('the optional field is the only one without the native required attribute', () => {
      const { container } = renderForm();
      const [name, email, subject, message] = controls(container);

      expect(name).toBeRequired();
      expect(email).toBeRequired();
      expect(message).toBeRequired();
      expect(subject).not.toBeRequired();
    });

    it('no control relies on its placeholder as a label', () => {
      const { container } = renderForm();
      // Placeholders are now examples ("Ada Lovelace"), not labels. If one ever
      // drifts back to naming the field, the accessible name check above would
      // pass by accident — this pins the separation.
      for (const el of controls(container)) {
        const placeholder = el.getAttribute('placeholder');
        const label = container.querySelector(
          `label[for="${el.getAttribute('id')}"]`,
        )!;
        expect(placeholder).toBeTruthy();
        expect(label.textContent ?? '').not.toContain(placeholder!);
      }
    });

    it('ids are per-instance, so two forms on one page cannot collide', () => {
      const a = renderForm();
      const b = renderForm();
      const idsA = controls(a.container).map((el) => el.getAttribute('id'));
      const idsB = controls(b.container).map((el) => el.getAttribute('id'));

      expect(new Set(idsA).size).toBe(4);
      expect(new Set(idsB).size).toBe(4);
      // No id is shared between the two mounted forms.
      for (const id of idsA) expect(idsB).not.toContain(id);
      // And they are usable as CSS selectors (React 19 ships guillemets in
      // useId output, which need escaping; the id is sanitised here).
      for (const id of idsA) {
        expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(a.container.querySelector(`#${id}`)).not.toBeNull();
      }
    });

    it('the form states which fields are required in text, not colour alone', () => {
      const { container } = renderForm();
      const instruction = screen.getByText(/fields marked/i);
      expect(instruction).toBeInTheDocument();
      // The asterisk glyph is hidden from the a11y tree, so the asterisk glyph
      // existing twice (here + on each label) is a purely visual cue backed by
      // per-field sr-only text. Assert the visual cue is present at all.
      expect(container.querySelectorAll('.sr-only').length).toBeGreaterThan(0);
    });
  });

  describe('error announcement', () => {
    it('failed submit marks each offending field invalid and describes it', () => {
      const { container } = renderForm();
      fireEvent.submit(getForm());

      const [name, email, subject, message] = controls(container);

      // aria-invalid on the offenders…
      expect(name).toHaveAttribute('aria-invalid', 'true');
      expect(email).toHaveAttribute('aria-invalid', 'true');
      expect(message).toHaveAttribute('aria-invalid', 'true');
      // …and not on the field that is actually fine.
      expect(subject).not.toHaveAttribute('aria-invalid');

      // …each pointing at a message node that exists and is announced.
      for (const el of [name, email, message]) {
        // Every id in the list must resolve — a dangling one is a description
        // the screen reader silently skips.
        describedByTargets(el);

        // role="alert" (or an equivalent live region) is what makes the text
        // speak when it is inserted, not only when focus reaches the field. A
        // control may be described by more than one node — the textarea keeps
        // its static format hint alongside the error — and only the live one is
        // an alert, so the alert is asserted to be among the targets rather
        // than to be all of them.
        const alert = liveDescription(el);
        expect(alert).toBeDefined();
        expect(alert!.textContent!.trim()).not.toHaveLength(0);
      }

      // The message node is a sibling of the control's label, inside the form,
      // so it is reachable and not trapped in an aria-hidden subtree.
      // `getByText` matches the innermost element holding the text — the error
      // node wraps its copy in a <span> beside the icon — so containment is
      // what "the described-by node is the one saying this" means.
      const messageDesc = liveDescription(message)!;
      expect(messageDesc).toContainElement(
        within(getForm()).getByText(/Enter a message\./),
      );
    });

    it('focus moves to the first invalid control in reading order', () => {
      const { container } = renderForm();
      fireEvent.submit(getForm());
      const [name] = controls(container);
      // Not to a banner string, and not to the last field checked.
      expect(document.activeElement).toBe(name);
    });

    it('focus skips already-valid fields to the first one that is actually wrong', () => {
      const { container } = renderForm();
      const [name, email, subject, message] = controls(container);

      fireEvent.change(name, { target: { value: 'Ada Lovelace' } });
      fireEvent.change(email, { target: { value: 'ada@company.com' } });
      fireEvent.change(message, { target: { value: 'too short' } });
      fireEvent.submit(getForm());

      // name and email are valid now, so the message textarea is the target.
      expect(name).not.toHaveAttribute('aria-invalid');
      expect(email).not.toHaveAttribute('aria-invalid');
      expect(message).toHaveAttribute('aria-invalid', 'true');
      expect(document.activeElement).toBe(message);
    });

    it('an error clears as soon as that field is edited, and only that field', () => {
      const { container } = renderForm();
      fireEvent.submit(getForm());
      const [name, email, , message] = controls(container);
      expect(email).toHaveAttribute('aria-invalid', 'true');

      fireEvent.change(name, { target: { value: 'Ada Lovelace' } });

      expect(name).not.toHaveAttribute('aria-invalid');
      expect(name).not.toHaveAttribute('aria-describedby');
      // The email problem is untouched — fixing one field must not imply the
      // rest of the form is now fine.
      expect(email).toHaveAttribute('aria-invalid', 'true');
      expect(message).toHaveAttribute('aria-invalid', 'true');
    });

    it('the too-short message error counts characters for the user', () => {
      const { container } = renderForm();
      const [, , , message] = controls(container);
      fireEvent.change(message, { target: { value: 'hi' } });
      fireEvent.submit(getForm());

      const desc = liveDescription(message)!;
      expect(desc).not.toBeNull();
      expect(desc.textContent).toContain('at least 10 characters');
      expect(desc.textContent).toContain('2 so far');
    });

    it('the message hint is described while the field is valid', () => {
      const { container } = renderForm();
      const [, , , message] = controls(container);
      // A valid field points at its format hint, not at nothing.
      const descId = message.getAttribute('aria-describedby')!;
      const desc = document.getElementById(descId);
      expect(desc).not.toBeNull();
      expect(desc!.textContent).toContain('Minimum 10 characters.');
    });

    it('a rejected submit is announced as an alert, and the form stays usable', async () => {
      mockedPost.mockRejectedValueOnce(new Error('boom'));
      const { container } = renderForm();
      const [name, email, subject, message] = controls(container);
      fireEvent.change(name, { target: { value: 'Ada Lovelace' } });
      fireEvent.change(email, { target: { value: 'ada@company.com' } });
      fireEvent.change(subject, { target: { value: 'Project collaboration' } });
      fireEvent.change(message, {
        target: { value: 'Tell me about the project timeline please.' },
      });
      fireEvent.submit(getForm());

      await vi.waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
      // The server failure is announced. It is the only alert here — validation
      // passed, so no per-field message is showing.
      await vi.waitFor(() =>
        expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1),
      );
      const alert = container.querySelector('[role="alert"]')!;
      expect(alert.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      expect(screen.getByRole('alert')).toBe(alert);

      // The form is still on screen and the values survived, so the user can
      // fix and retry rather than retyping everything.
      expect(screen.getByTestId('contact-form')).toBeInTheDocument();
      expect(
        (container.querySelector('input[id$="-name"]') as HTMLInputElement)
          .value,
      ).toBe('Ada Lovelace');
    });
  });

  describe('happy path', () => {
    it('a valid submit posts and replaces the form with a status region', async () => {
      const { container } = renderForm();
      const [name, email, subject, message] = controls(container);
      fireEvent.change(name, { target: { value: 'Ada Lovelace' } });
      fireEvent.change(email, { target: { value: 'ada@company.com' } });
      fireEvent.change(subject, { target: { value: 'Project collaboration' } });
      fireEvent.change(message, {
        target: { value: 'Tell me about the project timeline please.' },
      });
      fireEvent.submit(getForm());

      await vi.waitFor(() => expect(mockedPost).toHaveBeenCalledTimes(1));
      await vi.waitFor(() =>
        expect(screen.queryByTestId('contact-form')).toBeNull(),
      );
      // The confirmation is a status region so the swap is announced, not a
      // silent DOM replacement.
      const status = container.querySelector('[role="status"]');
      expect(status).not.toBeNull();
      expect(status!.textContent).toContain('Ada Lovelace');
    });
  });

  describe('touch targets (P3.7)', () => {
    // NeonButton sizes itself from an inline style map (`sizeStyles` in
    // src/components/ui/NeonButton.tsx), not from Tailwind padding classes.
    // `className` therefore can never contain `py-4`, and asserting it did
    // only ever measured a class that was never applied. The signal that
    // actually decides the control's height is the padding that `size="lg"`
    // writes into the inline style, so that is what gets asserted.
    const LG_PADDING = '1rem 2rem'; // sizeStyles.lg
    const MD_PADDING = '0.75rem 1.5rem'; // sizeStyles.md — the default

    /** Total top+bottom padding in px, from a rem-based CSS shorthand. */
    const blockPaddingPx = (shorthand: string): number => {
      const rootPx =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return parseFloat(shorthand.split(' ')[0]) * rootPx * 2;
    };

    it('submit and cancel use the large button size, not the ~40px default', () => {
      renderForm();
      const submit = screen.getByRole('button', { name: /send message/i });
      const cancel = screen.getByRole('button', { name: /cancel/i });

      for (const btn of [submit, cancel]) {
        expect(btn.style.padding).toBe(LG_PADDING);
        // 1rem top + 1rem bottom = 32px; the 0.75rem text line box on top of
        // that clears the 44px minimum.
        expect(blockPaddingPx(btn.style.padding)).toBeGreaterThanOrEqual(32);
        expect(btn.style.fontSize).toBe('0.75rem');
      }

      // The size the form must not ship: 0.75rem block padding is 24px, which
      // with the same line box lands at the ~40px control this test exists to
      // catch. If the size map ever regresses to md, that 24px is what shows.
      expect(blockPaddingPx(MD_PADDING)).toBeLessThan(32);
    });
  });
});
