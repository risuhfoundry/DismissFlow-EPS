"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

export type TabItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};

/**
 * Accessible tabs: roving Tab/Arrow navigation, role=tablist/tab/tabpanel,
 * and proper aria-selected / aria-controls wiring.
 */
export function Tabs({
  items,
  defaultTab,
  className
}: {
  items: TabItem[];
  defaultTab?: string;
  className?: string;
}) {
  const baseId = useId();
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (idx + dir + items.length) % items.length;
      if (!items[next].disabled) {
        setActive(items[next].id);
        refs.current[items[next].id]?.focus();
      }
    }
  };

  return (
    <div className={clsx("w-full", className)}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex gap-1 border-b border-border"
      >
        {items.map((it, i) => {
          const selected = it.id === active;
          return (
            <button
              key={it.id}
              ref={(el) => {
                refs.current[it.id] = el;
              }}
              role="tab"
              id={`${baseId}-tab-${it.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${it.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={it.disabled}
              onClick={() => setActive(it.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={clsx(
                "inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring rounded-t-md",
                selected
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
                it.disabled && "opacity-50 pointer-events-none"
              )}
            >
              {it.icon}
              {it.label}
            </button>
          );
        })}
      </div>
      {items.map((it) => (
        <div
          key={it.id}
          role="tabpanel"
          id={`${baseId}-panel-${it.id}`}
          aria-labelledby={`${baseId}-tab-${it.id}`}
          hidden={it.id !== active}
          tabIndex={0}
          className="py-4 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          {it.id === active && it.content}
        </div>
      ))}
    </div>
  );
}
