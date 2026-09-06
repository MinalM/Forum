import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { renderMarkdown } from '../../utils/markdown';

// Wraps (or, with nothing selected, inserts placeholder text for) the
// current textarea selection and reports the pending cursor/selection range
// so the caller can restore it once the controlled value re-renders.
function wrapSelection(value, start, end, before, after, placeholder) {
  const selected = value.slice(start, end) || placeholder;
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end);
  const selectionStart = start + before.length;
  const selectionEnd = selectionStart + selected.length;
  return { newValue, selectionStart, selectionEnd };
}

function prefixLines(value, start, end, prefix, placeholder) {
  const target = value.slice(start, end) || placeholder;
  const prefixed = target
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  const newValue = value.slice(0, start) + prefixed + value.slice(end);
  return { newValue, selectionStart: start, selectionEnd: start + prefixed.length };
}

function insertLink(value, start, end, placeholder) {
  const linkText = value.slice(start, end) || placeholder;
  const markdown = `[${linkText}](url)`;
  const newValue = value.slice(0, start) + markdown + value.slice(end);
  const urlStart = start + linkText.length + 3; // "[" + linkText + "]("
  const urlEnd = urlStart + 3; // length of the "url" placeholder
  return { newValue, selectionStart: urlStart, selectionEnd: urlEnd };
}

// A textarea with a Markdown formatting toolbar and a Write/Preview toggle.
// The stored value is always the raw Markdown string - Preview renders it
// through the same renderMarkdown() the post/comment display side uses, so
// what a user previews is exactly what other members will see.
const MarkdownComposer = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  rows,
  required,
  className
}) => {
  const [mode, setMode] = useState('write');
  const textareaRef = useRef(null);
  const pendingSelectionRef = useRef(null);

  useEffect(() => {
    if (pendingSelectionRef.current && textareaRef.current) {
      const { start, end } = pendingSelectionRef.current;
      pendingSelectionRef.current = null;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
    }
  }, [value]);

  const applyEdit = ({ newValue, selectionStart, selectionEnd }) => {
    pendingSelectionRef.current = { start: selectionStart, end: selectionEnd };
    onChange({ target: { name, value: newValue } });
  };

  const withSelection = (transform) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    applyEdit(transform(value, textarea.selectionStart, textarea.selectionEnd));
  };

  const actions = [
    {
      key: 'bold',
      label: 'Bold',
      icon: 'fa-bold',
      onClick: () =>
        withSelection((v, s, e) => wrapSelection(v, s, e, '**', '**', 'bold text'))
    },
    {
      key: 'code',
      label: 'Inline code',
      icon: 'fa-code',
      onClick: () => withSelection((v, s, e) => wrapSelection(v, s, e, '`', '`', 'code'))
    },
    {
      key: 'codeblock',
      label: 'Code block',
      icon: 'fa-file-code',
      onClick: () =>
        withSelection((v, s, e) => wrapSelection(v, s, e, '```\n', '\n```', 'code'))
    },
    {
      key: 'link',
      label: 'Link',
      icon: 'fa-link',
      onClick: () => withSelection((v, s, e) => insertLink(v, s, e, 'link text'))
    },
    {
      key: 'list',
      label: 'Bulleted list',
      icon: 'fa-list-ul',
      onClick: () => withSelection((v, s, e) => prefixLines(v, s, e, '- ', 'list item'))
    }
  ];

  return (
    <div className="markdown-composer">
      <div className="markdown-composer-toolbar">
        <div className="markdown-composer-format-actions" role="toolbar" aria-label="Formatting">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              className="markdown-toolbar-btn"
              onClick={action.onClick}
              disabled={mode === 'preview'}
              aria-label={action.label}
              title={action.label}
            >
              <i className={`fas ${action.icon}`}></i>
            </button>
          ))}
        </div>
        <div className="markdown-composer-tabs" role="tablist" aria-label="Write or preview">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'write'}
            className={`markdown-tab-btn${mode === 'write' ? ' active' : ''}`}
            onClick={() => setMode('write')}
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'preview'}
            className={`markdown-tab-btn${mode === 'preview' ? ' active' : ''}`}
            onClick={() => setMode('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          id={id}
          name={name}
          className={className}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          required={required}
        ></textarea>
      ) : (
        <div
          className={`markdown-composer-preview ${className}`}
          data-testid="markdown-composer-preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      )}
    </div>
  );
};

MarkdownComposer.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  rows: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  required: PropTypes.bool,
  className: PropTypes.string
};

MarkdownComposer.defaultProps = {
  id: undefined,
  name: undefined,
  placeholder: undefined,
  rows: 6,
  required: false,
  className: 'form-control'
};

export default MarkdownComposer;
