import React, { useRef } from "react";
import { FASTA_VALID_SEQ_REGEX } from "../homeUtils";

type FastaEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
};

export function FastaEditor({ value, onChange, placeholder, id, "aria-label": ariaLabel }: FastaEditorProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = event.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  const renderHighlightedText = () => {
    if (!value) {
      return null;
    }

    const lines = value.split("\n");
    return lines.map((line, index) => {
      const isHeader = line.startsWith(">");
      if (isHeader) {
        return (
          <React.Fragment key={index}>
            <span className="font-semibold text-slate-400">{line}</span>
            {index < lines.length - 1 && "\n"}
          </React.Fragment>
        );
      }

      // Tokenize sequence line into valid / invalid chunks
      const tokens = [];
      let currentToken = "";
      let isCurrentValid = true;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const isValidChar = FASTA_VALID_SEQ_REGEX.test(char);

        if (i === 0) {
          isCurrentValid = isValidChar;
          currentToken += char;
        } else if (isValidChar === isCurrentValid) {
          currentToken += char;
        } else {
          tokens.push({ text: currentToken, isValid: isCurrentValid });
          isCurrentValid = isValidChar;
          currentToken = char;
        }
      }

      if (currentToken) {
        tokens.push({ text: currentToken, isValid: isCurrentValid });
      }

      return (
        <React.Fragment key={index}>
          {tokens.map((token, tIndex) => (
            <span
              key={tIndex}
              className={
                token.isValid
                  ? "text-slate-700"
                  : "bg-red-50 text-red-600 underline decoration-red-500 decoration-wavy"
              }
            >
              {token.text}
            </span>
          ))}
          {index < lines.length - 1 && "\n"}
        </React.Fragment>
      );
    });
  };

  const sharedStyles =
    "m-0 box-border border-none p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words";

  return (
    <div className="relative w-full overflow-hidden rounded-none border border-border bg-white transition-shadow focus-within:ring-2 focus-within:ring-primary/30 min-h-[220px]">
      <div
        ref={backdropRef}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full overflow-hidden ${sharedStyles}`}
      >
        {renderHighlightedText()}
        {value.endsWith("\n") && <br />}
      </div>
      <textarea
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`relative z-10 block h-full min-h-[220px] w-full resize-y bg-transparent text-transparent caret-black outline-none ${sharedStyles}`}
        spellCheck="false"
      />
    </div>
  );
}
