import React from 'react';

interface ExplanationRendererProps {
  text: string;
  onPathClick: (path: string) => void;
}

export function ExplanationRenderer({ text, onPathClick }: ExplanationRendererProps) {
  // Split into paragraphs
  const paragraphs = text.split(/\n\s*\n/);

  return (
    <div className="space-y-4 text-[11px] leading-relaxed text-foreground/90">
      {paragraphs.map((para, i) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Check if it's a list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split(/\n[-*] /).map(item => item.replace(/^[-*] /, ''));
          return (
            <ul key={i} className="space-y-1 my-2">
              {items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-muted">•</span>
                  <span>{renderSpan(item, onPathClick)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{renderSpan(trimmed, onPathClick)}</p>;
      })}
    </div>
  );
}

function renderSpan(text: string, onPathClick: (path: string) => void) {
  // We need to handle:
  // 1. **bold**
  // 2. `inline code` (which might be a path)
  
  const tokens: (string | React.ReactNode)[] = [];
  let currentPos = 0;

  // Combined regex for **bold** and `code`
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > currentPos) {
      tokens.push(text.substring(currentPos, match.index));
    }

    const value = match[0];
    if (value.startsWith('**')) {
      tokens.push(
        <strong key={match.index} className="font-bold text-foreground">
          {value.substring(2, value.length - 2)}
        </strong>
      );
    } else if (value.startsWith('`')) {
      const code = value.substring(1, value.length - 1);
      // Check if it looks like a path (has / or .)
      const isPath = code.includes('/') || code.includes('.');
      
      if (isPath) {
        tokens.push(
          <button
            key={match.index}
            onClick={() => onPathClick(code)}
            className="font-mono bg-surface px-1 rounded-sm text-accent hover:underline decoration-accent/30 underline-offset-2 transition-colors cursor-pointer"
          >
            {code}
          </button>
        );
      } else {
        tokens.push(
          <code key={match.index} className="font-mono bg-surface px-1 rounded-sm text-foreground/80">
            {code}
          </code>
        );
      }
    }

    currentPos = regex.lastIndex;
  }

  // Add remaining text
  if (currentPos < text.length) {
    tokens.push(text.substring(currentPos));
  }

  return tokens;
}
