// src/components/ui/SearchableMultiSelect.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';

type Option = {
  id: number;
  label: string;
  icon?: React.ReactNode;
  sublabel?: string;
};

type SearchableMultiSelectProps = {
  options: Option[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxDisplay?: number;
};

export default function SearchableMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Search...',
  disabled = false,
  maxDisplay = 3,
}: SearchableMultiSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  const selectedOptions = useMemo(
    () => options.filter((opt) => selectedIds.includes(opt.id)),
    [options, selectedIds],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const remove = (id: number) => {
    onChange(selectedIds.filter((i) => i !== id));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected chips display */}
      <div
        className="form-premium-input w-full p-2 flex items-center gap-1 flex-wrap cursor-pointer min-h-[44px]"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedOptions.length > 0 ? (
          selectedOptions.slice(0, maxDisplay).map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-neon-purple/20 border border-neon-purple/30 clip-notch-sm text-xs text-neon-purple/80"
            >
              {opt.icon}
              {opt.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(opt.id);
                  }}
                  className="ml-0.5 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-sm text-text-muted">{placeholder}</span>
        )}
        {selectedOptions.length > maxDisplay && (
          <span className="text-xs text-text-muted">
            +{selectedOptions.length - maxDisplay}
          </span>
        )}
        <div className="ml-auto">
          {isOpen ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-bg-ash border border-white/10 clip-notch-sm shadow-xl max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center gap-2 px-2 bg-white/[0.03] clip-notch-sm">
              <Search size={14} className="text-text-muted" />
              <input
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-text-primary py-1.5 focus:outline-none focus-visible:outline-none placeholder:text-text-muted"
                autoFocus
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggle(opt.id)}
                className={`w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:bg-white/[0.05] ${
                  selectedIds.includes(opt.id) ? 'bg-neon-purple/10' : ''
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedIds.includes(opt.id)
                      ? 'bg-neon-purple border-neon-purple'
                      : 'border-white/20'
                  }`}
                >
                  {selectedIds.includes(opt.id) && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5L4 7L8 3"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                {opt.icon}
                <span className="text-text-primary">{opt.label}</span>
                {opt.sublabel && (
                  <span className="text-text-muted text-xs ml-auto">
                    {opt.sublabel}
                  </span>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-text-muted text-sm py-4">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
