import * as bin from './bin';

export const commandExists = (command: string) => {
  const commands = ['clear', 'sudosuperuser-ostaad', ...Object.keys(bin)];
  const input = command.split(' ')[0].toLowerCase();
  if (input === 'sudosuperuser-ostaad') {
    return true;
  }
  return commands.indexOf(input) !== -1;
};
