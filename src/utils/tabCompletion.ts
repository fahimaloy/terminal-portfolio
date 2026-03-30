import * as bin from './bin';

const allCommands = () => ['sudosuperuser-ostaad', ...Object.keys(bin)];

export const getMatchingCommands = (command: string): string[] => {
  const normalized = command.toLowerCase();
  return allCommands().filter((entry) => entry.startsWith(normalized));
};

export const handleTabCompletion = (
  command: string,
  setCommand: React.Dispatch<React.SetStateAction<string>>,
) => {
  const commands = getMatchingCommands(command);

  if (commands.length === 1) {
    setCommand(commands[0]);
  }
};
