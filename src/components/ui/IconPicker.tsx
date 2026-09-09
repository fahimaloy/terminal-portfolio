// src/components/ui/IconPicker.tsx
import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import * as LucideIcons from 'lucide-react';
import { TECH_ICONS, resolveTechIcon } from '../../lib/techIcons';

type IconPickerProps = {
  value: string | null;
  onChange: (iconName: string | null) => void;
  disabled?: boolean;
  mode?: 'lucide' | 'tech' | 'all';
  showColor?: boolean;
};

const RECENT_KEY = 'icon-picker-recent';
const RECENT_MAX = 8;

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === 'string')
      .slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

function persistRecent(next: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

export default function IconPicker({
  value,
  onChange,
  disabled,
  mode = 'all',
  showColor = true,
}: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [isColored, setIsColored] = useState(true);

  const allowLucide = mode !== 'tech';
  const allowTech = mode !== 'lucide';

  const [active, setActive] = useState<'general' | 'stack'>(() => {
    if (!allowLucide) return 'stack';
    if (!allowTech) return 'general';
    if (value && value.startsWith('si:')) return 'stack';
    return 'general';
  });

  // Keep active in sync when mode or value changes across mounts
  useEffect(() => {
    setActive((prev) => {
      if (!allowLucide && prev !== 'stack') return 'stack';
      if (!allowTech && prev !== 'general') return 'general';
      return prev;
    });
  }, [allowLucide, allowTech]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  const didPersistMountRef = useRef(false);
  useEffect(() => {
    if (!didPersistMountRef.current) {
      didPersistMountRef.current = true;
      return;
    }
    persistRecent(recent);
  }, [recent]);

  const pushRecent = useCallback((nextVal: string) => {
    setRecent((prev) =>
      [nextVal, ...prev.filter((v) => v !== nextVal)].slice(0, RECENT_MAX),
    );
  }, []);

  const handleSelect = useCallback(
    (nextVal: string) => {
      if (disabled) return;
      pushRecent(nextVal);
      onChange(nextVal);
    },
    [disabled, onChange, pushRecent],
  );

  const handleClear = useCallback(() => {
    if (disabled) return;
    onChange(null);
  }, [disabled, onChange]);

  const allIcons = useMemo(() => {
    const iconRecord = LucideIcons as Record<string, unknown>;
    return Object.keys(iconRecord).filter(
      (name) =>
        typeof iconRecord[name] === 'object' &&
        name !== 'default' &&
        !name.startsWith('create'),
    );
  }, []);

  const filteredLucideIcons = useMemo(() => {
    if (!search) return allIcons;
    const q = search.toLowerCase();
    return allIcons.filter((name) => name.toLowerCase().includes(q));
  }, [allIcons, search]);

  const filteredTechIcons = useMemo(() => {
    if (!search) return TECH_ICONS;
    const q = search.toLowerCase();
    return TECH_ICONS.filter((entry) => {
      if (entry.id.toLowerCase().includes(q)) return true;
      if (entry.label.toLowerCase().includes(q)) return true;
      if (entry.aliases.some((a) => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [search]);

  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{
      size?: number;
      className?: string;
      style?: React.CSSProperties;
    }>
  >;
  const isSiValue = Boolean(value && value.startsWith('si:'));
  const resolvedTech = useMemo(() => {
    if (!isSiValue || !value) return null;
    return resolveTechIcon(value.slice(3));
  }, [isSiValue, value]);
  const SelectedLucideIcon = !isSiValue && value ? icons[value] || null : null;

  const showTabs = mode === 'all';

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-display tracking-[2px] text-text-muted mb-1 uppercase">
        Icon:
      </label>

      {/* Current selection preview */}
      <div className="flex items-center gap-2 p-2 bg-white/[0.03] clip-notch-sm border border-white/10">
        {value ? (
          <div className="flex items-center gap-2 w-full">
            {isSiValue ? (
              resolvedTech ? (
                <resolvedTech.Component
                  size={20}
                  color={showColor && isColored ? resolvedTech.hex : undefined}
                  style={
                    !isColored || !showColor
                      ? { color: 'var(--fg-1)' }
                      : undefined
                  }
                  aria-hidden
                />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center text-text-muted text-[10px]">
                  ?
                </span>
              )
            ) : SelectedLucideIcon ? (
              <SelectedLucideIcon size={20} className="text-neon-purple" />
            ) : (
              <span className="w-5 h-5 flex items-center justify-center text-text-muted text-[10px]">
                ?
              </span>
            )}
            <span className="text-sm text-text-primary truncate">{value}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-auto text-xs text-text-muted hover:text-neon-red"
              disabled={disabled}
              aria-label="Clear icon selection"
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
        aria-label="Search icons"
      />

      {/* Tabs + color toggle */}
      {showTabs ? (
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Icon type"
            className="inline-flex p-1 gap-1 bg-white/[0.03] border border-white/10 clip-notch-sm"
          >
            <button
              type="button"
              role="tab"
              aria-selected={active === 'general'}
              aria-controls="icon-grid-general"
              id="icon-tab-general"
              onClick={() => setActive('general')}
              disabled={disabled || !allowLucide}
              className={`px-3 py-1 text-xs font-display tracking-[1px] uppercase transition-colors clip-notch-sm border ${
                active === 'general'
                  ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-white/10'
              }`}
            >
              General
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={active === 'stack'}
              aria-controls="icon-grid-stack"
              id="icon-tab-stack"
              onClick={() => setActive('stack')}
              disabled={disabled || !allowTech}
              className={`px-3 py-1 text-xs font-display tracking-[1px] uppercase transition-colors clip-notch-sm border ${
                active === 'stack'
                  ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-white/10'
              }`}
            >
              Stack
            </button>
          </div>

          {active === 'stack' && showColor ? (
            <div className="ml-auto inline-flex p-1 gap-1 bg-white/[0.03] border border-white/10 clip-notch-sm">
              <button
                type="button"
                aria-pressed={isColored}
                aria-label="Colored icons"
                onClick={() => setIsColored(true)}
                disabled={disabled}
                className={`px-2 py-1 text-[10px] font-display tracking-[1px] uppercase transition-colors clip-notch-sm border ${
                  isColored
                    ? 'bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan'
                    : 'border-transparent text-text-muted hover:text-text-primary hover:bg-white/10'
                }`}
              >
                Color
              </button>
              <button
                type="button"
                aria-pressed={!isColored}
                aria-label="Monochrome icons"
                onClick={() => setIsColored(false)}
                disabled={disabled}
                className={`px-2 py-1 text-[10px] font-display tracking-[1px] uppercase transition-colors clip-notch-sm border ${
                  !isColored
                    ? 'bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan'
                    : 'border-transparent text-text-muted hover:text-text-primary hover:bg-white/10'
                }`}
              >
                Mono
              </button>
            </div>
          ) : null}
        </div>
      ) : active === 'stack' && showColor ? (
        <div className="flex justify-end">
          <div className="inline-flex p-1 gap-1 bg-white/[0.03] border border-white/10 clip-notch-sm">
            <button
              type="button"
              aria-pressed={isColored}
              aria-label="Colored icons"
              onClick={() => setIsColored(true)}
              disabled={disabled}
              className={`px-2 py-1 text-[10px] font-display tracking-[1px] uppercase transition-colors clip-notch-sm border ${
                isColored
                  ? 'bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-white/10'
              }`}
            >
              Color
            </button>
            <button
              type="button"
              aria-pressed={!isColored}
              aria-label="Monochrome icons"
              onClick={() => setIsColored(false)}
              disabled={disabled}
              className={`px-2 py-1 text-[10px] font-display tracking-[1px] uppercase transition-colors clip-notch-sm border ${
                !isColored
                  ? 'bg-neon-cyan/20 border-neon-cyan/50 text-neon-cyan'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:bg-white/10'
              }`}
            >
              Mono
            </button>
          </div>
        </div>
      ) : null}

      {/* Recent */}
      {recent.length > 0 ? (
        <div className="bg-white/[0.02] border border-white/10 clip-notch-sm p-2">
          <div className="text-[10px] font-display tracking-[2px] text-text-muted uppercase mb-1">
            Recent
          </div>
          <div className="flex flex-wrap gap-1">
            {recent.map((r) => {
              const isRecentSi = r.startsWith('si:');
              const hit = isRecentSi ? resolveTechIcon(r.slice(3)) : null;
              const LucideComp = !isRecentSi
                ? (icons[r] as
                    | React.ComponentType<{ size?: number; className?: string }>
                    | undefined)
                : null;
              const isSelected = value === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelect(r)}
                  disabled={disabled}
                  title={r}
                  aria-label={`Recent ${r}`}
                  className={`w-8 h-8 flex items-center justify-center clip-notch-sm border transition-colors ${
                    isSelected
                      ? 'bg-neon-purple/20 border-neon-purple/50'
                      : 'border-transparent bg-white/[0.03] hover:bg-white/10'
                  }`}
                >
                  {isRecentSi ? (
                    hit ? (
                      <hit.Component
                        size={16}
                        color={showColor && isColored ? hit.hex : undefined}
                        style={
                          !isColored || !showColor
                            ? { color: 'var(--fg-1)' }
                            : undefined
                        }
                        aria-hidden
                      />
                    ) : (
                      <span className="text-[9px] text-text-muted">?</span>
                    )
                  ) : LucideComp ? (
                    <LucideComp
                      size={16}
                      className={
                        isSelected ? 'text-neon-purple' : 'text-text-muted'
                      }
                    />
                  ) : (
                    <span className="text-[9px] text-text-muted">?</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Icon grid */}
      <div className="max-h-48 overflow-y-auto clip-notch-sm border border-white/10 p-2 bg-bg-smoke">
        {active === 'general' && allowLucide ? (
          <>
            <div
              id="icon-grid-general"
              role="tabpanel"
              aria-labelledby="icon-tab-general"
              className="grid grid-cols-6 gap-1"
            >
              {filteredLucideIcons.map((name) => {
                const Icon = icons[name];
                if (!Icon) return null;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelect(name)}
                    className={`p-2 clip-notch-sm hover:bg-white/10 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:border focus-visible:border-neon-cyan focus-visible:shadow-[0_0_12px_var(--glow-cyan-sm)] ${
                      value === name
                        ? 'bg-neon-purple/20 border border-neon-purple/50'
                        : 'border border-transparent'
                    }`}
                    title={name}
                    disabled={disabled}
                    aria-label={name}
                    aria-pressed={value === name}
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
            {filteredLucideIcons.length === 0 && (
              <div className="text-center text-text-muted text-sm py-4">
                No icons found
              </div>
            )}
          </>
        ) : null}

        {active === 'stack' && allowTech ? (
          <>
            <div
              id="icon-grid-stack"
              role="tabpanel"
              aria-labelledby="icon-tab-stack"
              className="grid grid-cols-6 gap-1"
            >
              {filteredTechIcons.map((entry) => {
                const val = `si:${entry.id}`;
                const isSelected = value === val;
                const SiComp = entry.icon;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelect(val)}
                    className={`p-2 clip-notch-sm hover:bg-white/10 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:border focus-visible:border-neon-cyan focus-visible:shadow-[0_0_12px_var(--glow-cyan-sm)] ${
                      isSelected
                        ? 'bg-neon-purple/20 border border-neon-purple/50'
                        : 'border border-transparent'
                    }`}
                    title={`${entry.label} (${val})`}
                    disabled={disabled}
                    aria-label={entry.label}
                    aria-pressed={isSelected}
                  >
                    <SiComp
                      size={18}
                      color={showColor && isColored ? entry.hex : undefined}
                      style={
                        !isColored || !showColor
                          ? { color: 'var(--fg-1)' }
                          : undefined
                      }
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
            {filteredTechIcons.length === 0 && (
              <div className="text-center text-text-muted text-sm py-4">
                No icons found
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
