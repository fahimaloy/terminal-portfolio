// src/components/ui/IconPicker.tsx
import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';

type IconPickerProps = {
  value: string | null;
  onChange: (iconName: string | null) => void;
  disabled?: boolean;
};

export default function IconPicker({
  value,
  onChange,
  disabled,
}: IconPickerProps) {
  const [search, setSearch] = useState('');

  const allIcons = useMemo(() => {
    const iconRecord = LucideIcons as Record<string, any>;
    return Object.keys(iconRecord).filter(
      (name) =>
        typeof iconRecord[name] === 'object' &&
        name !== 'default' &&
        !name.startsWith('create'),
    );
  }, []);

  const filteredIcons = useMemo(() => {
    if (!search) return allIcons;
    return allIcons.filter((name) =>
      name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allIcons, search]);

  const icons = LucideIcons as Record<string, any>;
  const SelectedIcon = value ? icons[value] || null : null;

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1 uppercase">
        Icon:
      </label>

      {/* Current selection preview */}
      <div className="flex items-center gap-2 p-2 bg-white/[0.03] clip-notch-sm border border-white/10">
        {SelectedIcon ? (
          <div className="flex items-center gap-2">
            <SelectedIcon size={20} className="text-neon-purple" />
            <span className="text-sm text-text-primary">{value}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="ml-auto text-xs text-text-muted hover:text-neon-red"
              disabled={disabled}
            >
              Clear
            </button>
          </div>
        ) : (
          <span className="text-sm text-text-muted">No icon selected</span>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search icons..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="form-premium-input w-full p-2 text-sm"
        disabled={disabled}
      />

      {/* Icon grid */}
      <div className="max-h-48 overflow-y-auto clip-notch-sm border border-white/10 p-2 bg-bg-smoke">
        <div className="grid grid-cols-6 gap-1">
          {filteredIcons.map((name) => {
            const Icon = icons[name];
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                className={`p-2 clip-notch-sm hover:bg-white/10 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:border focus-visible:border-neon-cyan focus-visible:shadow-[0_0_12px_var(--glow-cyan-sm)] ${
                  value === name
                    ? 'bg-neon-purple/20 border border-neon-purple/50'
                    : 'border border-transparent'
                }`}
                title={name}
                disabled={disabled}
              >
                <Icon
                  size={18}
                  className={
                    value === name ? 'text-neon-purple' : 'text-text-muted'
                  }
                />
              </button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <div className="text-center text-text-muted text-sm py-4">
            No icons found
          </div>
        )}
      </div>
    </div>
  );
}
