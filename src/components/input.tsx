import React from 'react';
import { commandExists } from '../utils/commandExists';
import { shell } from '../utils/shell';
import {
  getMatchingCommands,
  handleTabCompletion,
} from '../utils/tabCompletion';
import { Ps1 } from './Ps1';

const QUICK_ACTIONS = ['about', 'repo', 'resume', 'skills', 'projects'];

export const Input = ({
  inputRef,
  containerRef,
  command,
  history,
  lastCommandIndex,
  setCommand,
  setHistory,
  setLastCommandIndex,
  clearHistory,
}) => {
  const [isFocused, setIsFocused] = React.useState<boolean>(true);

  const commandSuggestions = React.useMemo(() => {
    if (!command.trim()) {
      return [];
    }
    const matches = getMatchingCommands(command.trim().toLowerCase());
    return matches.slice(0, 7);
  }, [command]);

  const runCommand = async (rawCommand: string) => {
    setLastCommandIndex(0);
    await shell(rawCommand, setHistory, clearHistory, setCommand);
    containerRef.current.scrollTo(0, containerRef.current.scrollHeight);
  };

  const onSubmit = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    const commands: string[] = history
      .map(({ command: historyCommand }) => historyCommand)
      .filter((historyCommand: string) => historyCommand);

    if (event.key === 'c' && event.ctrlKey) {
      event.preventDefault();
      setCommand('');
      setHistory('');
      setLastCommandIndex(0);
      return;
    }

    if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      clearHistory();
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      handleTabCompletion(command, setCommand);
      return;
    }

    if (event.key === 'Enter' || event.code === '13') {
      event.preventDefault();
      await runCommand(command);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!commands.length) {
        return;
      }
      const index: number = lastCommandIndex + 1;
      if (index <= commands.length) {
        setLastCommandIndex(index);
        setCommand(commands[commands.length - index]);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!commands.length) {
        return;
      }
      const index: number = lastCommandIndex - 1;
      if (index > 0) {
        setLastCommandIndex(index);
        setCommand(commands[commands.length - index]);
      } else {
        setLastCommandIndex(0);
        setCommand('');
      }
    }
  };

  const onChange = ({
    target: { value },
  }: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(value);
  };

  const showQuickActions = isFocused && command.trim().length === 0;

  const showSuggestions =
    isFocused && command.trim().length > 0 && commandSuggestions.length > 0;

  return (
    <div>
      {showQuickActions ? (
        <div className="terminal-input-actions">
          {QUICK_ACTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="terminal-action-btn"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      {showSuggestions ? (
        <div className="terminal-input-actions">
          {commandSuggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="terminal-action-btn terminal-action-btn-suggest"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setCommand(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-row space-x-2">
        <label htmlFor="prompt" className="flex-shrink">
          <Ps1 />
        </label>

        <input
          ref={inputRef}
          id="prompt"
          type="text"
          className={`bg-dark-background dark:bg-dark-background focus:outline-none flex-grow ${
            commandExists(command) || command === ''
              ? 'text-dark-green'
              : 'text-dark-red'
          }`}
          value={command}
          onChange={onChange}
          autoFocus
          onKeyDown={onSubmit}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete="off"
          spellCheck="false"
          placeholder="type a command"
        />
      </div>
    </div>
  );
};

export default Input;
