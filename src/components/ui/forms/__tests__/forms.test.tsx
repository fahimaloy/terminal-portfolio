// src/components/ui/forms/__tests__/forms.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextInput from '../TextInput';
import TextArea from '../TextArea';
import Select from '../Select';
import Toggle from '../Toggle';
import TagInput from '../TagInput';

describe('TextInput', () => {
  it('associates the label with the input', () => {
    render(<TextInput id="t" label="Title" value="" onChange={() => {}} />);
    // getByLabelText only succeeds if htmlFor/id are wired correctly.
    expect(screen.getByLabelText(/Title/)).toBeInTheDocument();
  });

  it('marks the field invalid and shows the error', () => {
    render(
      <TextInput
        id="t"
        label="Title"
        value=""
        onChange={() => {}}
        error="Required"
      />,
    );
    expect(screen.getByLabelText(/Title/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('hides the hint once an error is present', () => {
    const { rerender } = render(
      <TextInput
        id="t"
        label="T"
        value=""
        onChange={() => {}}
        hint="Helpful"
      />,
    );
    expect(screen.getByText('Helpful')).toBeInTheDocument();
    rerender(
      <TextInput
        id="t"
        label="T"
        value=""
        onChange={() => {}}
        hint="Helpful"
        error="Bad"
      />,
    );
    expect(screen.queryByText('Helpful')).not.toBeInTheDocument();
  });
});

describe('TextArea', () => {
  it('renders a live character counter', () => {
    render(
      <TextArea
        id="a"
        label="Body"
        value="hello"
        maxLength={100}
        showCount
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });
});

describe('Select', () => {
  it('renders options and placeholder', () => {
    render(
      <Select
        id="s"
        label="Status"
        value=""
        onChange={() => {}}
        placeholder="Pick one"
        options={[
          { value: 'draft', label: 'Draft' },
          { value: 'published', label: 'Published' },
        ]}
      />,
    );
    expect(
      screen.getByRole('option', { name: 'Pick one' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Draft' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Published' }),
    ).toBeInTheDocument();
  });
});

describe('Toggle', () => {
  it('exposes a real checkbox and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <Toggle id="g" label="Featured" checked={false} onChange={onChange} />,
    );
    const box = screen.getByRole('checkbox', { name: /Featured/ });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('TagInput', () => {
  it('adds a tag on Enter, lowercased', async () => {
    const onChange = vi.fn();
    render(<TagInput id="tg" label="Tags" value={[]} onChange={onChange} />);
    const input = screen.getByLabelText(/Tags/);
    await userEvent.type(input, 'NextJS{Enter}');
    expect(onChange).toHaveBeenCalledWith(['nextjs']);
  });

  it('does not add duplicates', async () => {
    const onChange = vi.fn();
    render(
      <TagInput id="tg" label="Tags" value={['react']} onChange={onChange} />,
    );
    await userEvent.type(screen.getByLabelText(/Tags/), 'react{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes the last tag on Backspace in an empty field', async () => {
    const onChange = vi.fn();
    render(
      <TagInput id="tg" label="Tags" value={['a', 'b']} onChange={onChange} />,
    );
    await userEvent.type(screen.getByLabelText(/Tags/), '{Backspace}');
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('renders existing tags uppercased', () => {
    render(
      <TagInput id="tg" label="Tags" value={['react']} onChange={() => {}} />,
    );
    expect(screen.getByText('REACT')).toBeInTheDocument();
  });
});
