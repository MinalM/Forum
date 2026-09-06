import React, { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MarkdownComposer from '../MarkdownComposer';

// A controlled wrapper, the same shape CreatePost/PostDetail use, so toolbar
// actions (which edit the value via onChange) are reflected back into the
// rendered textarea exactly as they would be in the real forms.
const ControlledComposer = ({ initialValue = '', ...props }) => {
  const [value, setValue] = useState(initialValue);
  return (
    <MarkdownComposer
      name="content"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      {...props}
    />
  );
};

const getTextarea = () => screen.getByRole('textbox');

const selectAll = (textarea) => {
  textarea.setSelectionRange(0, textarea.value.length);
};

describe('MarkdownComposer toolbar actions', () => {
  it('wraps a selection in ** ** for Bold', () => {
    render(<ControlledComposer initialValue="hello" />);
    const textarea = getTextarea();
    selectAll(textarea);

    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));

    expect(getTextarea()).toHaveValue('**hello**');
  });

  it('inserts placeholder bold text when nothing is selected', () => {
    render(<ControlledComposer initialValue="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));

    expect(getTextarea()).toHaveValue('**bold text**');
  });

  it('wraps a selection in backticks for inline code', () => {
    render(<ControlledComposer initialValue="np.array(x)" />);
    const textarea = getTextarea();
    selectAll(textarea);

    fireEvent.click(screen.getByRole('button', { name: 'Inline code' }));

    expect(getTextarea()).toHaveValue('`np.array(x)`');
  });

  it('wraps a selection in a fenced code block', () => {
    render(<ControlledComposer initialValue="print(1)" />);
    const textarea = getTextarea();
    selectAll(textarea);

    fireEvent.click(screen.getByRole('button', { name: 'Code block' }));

    expect(getTextarea()).toHaveValue('```\nprint(1)\n```');
  });

  it('turns a selection into link text with a replaceable url placeholder', () => {
    render(<ControlledComposer initialValue="the docs" />);
    const textarea = getTextarea();
    selectAll(textarea);

    fireEvent.click(screen.getByRole('button', { name: 'Link' }));

    expect(getTextarea()).toHaveValue('[the docs](url)');
  });

  it('inserts a link placeholder when nothing is selected', () => {
    render(<ControlledComposer initialValue="" />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));

    expect(getTextarea()).toHaveValue('[link text](url)');
  });

  it('prefixes every selected line with "- " for the list action', () => {
    render(<ControlledComposer initialValue={'first\nsecond'} />);
    const textarea = getTextarea();
    selectAll(textarea);

    fireEvent.click(screen.getByRole('button', { name: 'Bulleted list' }));

    expect(getTextarea()).toHaveValue('- first\n- second');
  });

  it('the field keeps submitting the raw markdown string, not rendered HTML', () => {
    render(<ControlledComposer initialValue="plain" />);
    const textarea = getTextarea();
    selectAll(textarea);
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));

    expect(getTextarea().value).toBe('**plain**');
  });
});

describe('MarkdownComposer Write/Preview toggle', () => {
  it('defaults to Write mode showing an editable textarea', () => {
    render(<ControlledComposer initialValue="hello" />);
    expect(screen.getByRole('tab', { name: 'Write' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('Preview renders the same output as the shared renderMarkdown() used for display', () => {
    render(<ControlledComposer initialValue="**bold** and `code`" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));

    const preview = screen.getByTestId('markdown-composer-preview');
    expect(within(preview).getByText('bold').tagName).toBe('STRONG');
    expect(within(preview).getByText('code').tagName).toBe('CODE');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('disables the formatting toolbar while in Preview mode', () => {
    render(<ControlledComposer initialValue="hello" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));

    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
  });

  it('switching back to Write keeps the underlying markdown untouched', () => {
    render(<ControlledComposer initialValue="**bold**" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Write' }));

    expect(getTextarea()).toHaveValue('**bold**');
  });
});

describe('MarkdownComposer basic textarea behavior', () => {
  it('renders with the given id, placeholder and required attribute', () => {
    render(
      <ControlledComposer
        initialValue=""
        id="content"
        placeholder="Describe your question"
        required
      />
    );
    const textarea = screen.getByPlaceholderText('Describe your question');
    expect(textarea).toHaveAttribute('id', 'content');
    expect(textarea).toBeRequired();
  });

  it('typing directly into the textarea still calls onChange with the new value', () => {
    render(<ControlledComposer initialValue="a" />);
    fireEvent.change(getTextarea(), { target: { value: 'ab' } });
    expect(getTextarea()).toHaveValue('ab');
  });
});
