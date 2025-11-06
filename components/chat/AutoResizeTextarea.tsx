"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onHeightChange?: (height: number) => void;
};

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function AutoResizeTextarea({ onHeightChange, ...props }, externalRef) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const adjustHeight = () => {
      const element = innerRef.current;
      if (!element) return;

      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;

      onHeightChange?.(element.scrollHeight);
    };

    useImperativeHandle(externalRef, () => innerRef.current as HTMLTextAreaElement);

    useEffect(() => {
      adjustHeight();
    }, [props.value]);

    return (
      <textarea
        {...props}
        ref={innerRef}
        rows={1}
        className={`auto-textarea ${props.className ?? ""}`.trim()}
        onInput={(event) => {
          props.onInput?.(event);
          adjustHeight();
        }}
      />
    );
  }
);
