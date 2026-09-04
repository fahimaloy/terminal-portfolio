// src/components/ui/IconPicker.tsx
import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';

type IconPickerProps = {
  value: string | null;
  onChange: (iconName: string | null) => void;
  disabled?: boolean;
};

export default function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const allIcons = useMemo(() => {
    const iconRecord = LucideIcons as Record<string, any>;
    return Object.keys(iconRecord).filter(
      (name) => typeof iconRecord[name] === 'object' && name !== 'default' && !name.startsWith('create'),
    );
  }, []);

  const filteredIcons = useMemo(() => {
    if (!search) return allIcons;
    return allIcons.filter((name) =>
      name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allIcons, search]);

  const icons = LucideIcons as Record<string, any>;
  const SelectedIcon = value ? (icons[value] || null) : null;

  return (
    <div className="space-y-2">
      <label className="block text-sm text-gray-400 mb-1">Icon:</label>

      {/* Current selection preview */}
      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-gray-800">
        {SelectedIcon ? (
          <div className="flex items-center gap-2">
            <SelectedIcon size={20} className="text-neon-purple" />
            <span className="text-sm text-white">{value}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="ml-auto text-xs text-gray-500 hover:text-red-400"
              disabled={disabled}
            >
              Clear
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-500">No icon selected</span>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search icons..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="form-premium-input w-full rounded-xl p-2 text-white text-sm focus:outline-none placeholder-gray-500"
        disabled={disabled}
      />

      {/* Icon grid */}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-800 p-2">
        <div className="grid grid-cols-6 gap-1">
          {filteredIcons.map((name) => {
            const Icon = icons[name];
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                className={`p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center ${
                  value === name ? 'bg-neon-purple/20 border border-neon-purple/50' : ''
                }`}
                title={name}
                disabled={disabled}
              >
                <Icon size={18} className={value === name ? 'text-neon-purple' : 'text-gray-400'} />
              </button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-4">No icons found</div>
        )}
      </div>
    </div>
  );
}
