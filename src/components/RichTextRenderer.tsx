// src/components/RichTextRenderer.tsx
import React from 'react';
import DOMPurify from 'dompurify';

type RichTextRendererProps = {
  html: string;
  className?: string;
};

export default function RichTextRenderer({ html, className = '' }: RichTextRendererProps) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'img',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'div', 'span',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'width', 'height',
      'class', 'style', 'colspan', 'rowspan',
    ],
  });

  return (
    <div
      className={`prose prose-invert prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
