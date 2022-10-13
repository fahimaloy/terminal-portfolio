// List of commands that do not require API calls
import {Conf, Project} from "./Conf.interface"
import * as bin from './index';
const config:Conf = require('../../../config.json');

import  Photo from "../../assets/ascii_photo.png"
// Help
export const help = async (args: string[]): Promise<string> => {
  const commands = Object.keys(bin).sort().join(', ');
  var c = '';
  for (let i = 1; i <= Object.keys(bin).sort().length; i++) {
    if (i % 7 === 0) {
      c += Object.keys(bin).sort()[i - 1] + '\n';
    } else {
      c += Object.keys(bin).sort()[i - 1] + ' ';
    }
  }
  return `Welcome! Here are The Important Commands you can Try out.
Type:
  'fahim' to display summary.
  'projects' for Projects I've Already Done.
  'rep' for my Github Repository.
  'linkedin' for my LinkedIn Account.
  'email' for Contact me on my email.
  'date' for Displaying the Current Date and Time.
  'weather city_name' like: 'weather newyork' to get the current weather updates of the typed city.
  'about' for informations about me.,
  'skills' for My Skills.
  
  
Here are all the other available commands:
  \n${c}\n
[tab]: trigger completion.
[ctrl+l]/clear: clear terminal.\n

`;
};

// Redirection
export const repo = async (args: string[]): Promise<string> => {
  window.open(`${config.repo}`);
  return 'Opening Github repository...';
};
import { getProjects, getReadme, getSkills } from '../api';

// About
export const about = async (args: string[]): Promise<string> => {
  return `
${await getReadme()} 
Welcome to my website!
More about me:
'fahim' - short summary.
'resume' - my latest resume.
'readme' - my github readme.`;
};

export const resume = async (args: string[]): Promise<string> => {
  window.open(`${config.resume_url}`);
  return 'Opening resume...';
};

// Donate
export const donate = async (args: string[]): Promise<string> => {
  return `thank you for your interest. 
  You can contact me on my Email (Type: 'email') or my LinkedIn (Type: 'likedin') Profile`;
};

// Contact
export const email = async (args: string[]): Promise<string> => {
  window.open(`mailto:${config.email}`);
  return `Opening mailto:${config.email}...`;
};

export const github = async (args: string[]): Promise<string> => {
  window.open(`https://github.com/${config.social.github}/`);

  return 'Opening github...';
};

export const linkedin = async (args: string[]): Promise<string> => {
  window.open(`https://www.linkedin.com/in/${config.social.linkedin}/`);

  return 'Opening linkedin...';
};

// Search
export const google = async (args: string[]): Promise<string> => {
  window.open(`https://google.com/search?q=${args.join(' ')}`);
  return `Searching google for ${args.join(' ')}...`;
};

export const duckduckgo = async (args: string[]): Promise<string> => {
  window.open(`https://duckduckgo.com/?q=${args.join(' ')}`);
  return `Searching duckduckgo for ${args.join(' ')}...`;
};

export const bing = async (args: string[]): Promise<string> => {
  window.open(`https://bing.com/search?q=${args.join(' ')}`);
  return `Wow, really? You are using bing for ${args.join(' ')}?`;
};

export const reddit = async (args: string[]): Promise<string> => {
  window.open(`https://www.reddit.com/search/?q=${args.join(' ')}`);
  return `Searching reddit for ${args.join(' ')}...`;
};

// Typical linux commands
export const echo = async (args: string[]): Promise<string> => {
  return args.join(' ');
};

export const whoami = async (args: string[]): Promise<string> => {
  return `${config.ps1_username}`;
};

export const ls = async (args: string[]): Promise<string> => {
  return `a
bunch
of
fake
directories`;
};

export const cd = async (args: string[]): Promise<string> => {
  return `unfortunately, i cannot afford more directories.
if you want to help, you can type 'donate'.`;
};

export const date = async (args: string[]): Promise<string> => {
  return new Date().toString();
};

export const vi = async (args: string[]): Promise<string> => {
  return `woah, you still use 'vi'? just try 'vim'.`;
};

export const vim = async (args: string[]): Promise<string> => {
  return `'vim' is so outdated. how about 'nvim'?`;
};

export const nvim = async (args: string[]): Promise<string> => {
  return `'nvim'? too fancy. why not 'emacs'?`;
};

export const emacs = async (args?: string[]): Promise<string> => {
  return `you know what? just use vscode.`;
};

export const sudo = async (args?: string[]): Promise<string> => {
  window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank'); // ...I'm sorry
  return `Permission denied: with little power comes... no responsibility? `;
};

// Banner
export const banner = (args?: string[]): string => {
  return `
  <div class="flexClass">
  <img src="${Photo.src}" height="200px" width="200px"/>
  <div class="ascii_text">
  ███████╗ █████╗ ██╗  ██╗██╗███╗   ███╗ █████╗ ██╗      ██████╗ ██╗   ██╗
  ██╔════╝██╔══██╗██║  ██║██║████╗ ████║██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝
  █████╗  ███████║███████║██║██╔████╔██║███████║██║     ██║   ██║ ╚████╔╝ 
  ██╔══╝  ██╔══██║██╔══██║██║██║╚██╔╝██║██╔══██║██║     ██║   ██║  ╚██╔╝  
  ██║     ██║  ██║██║  ██║██║██║ ╚═╝ ██║██║  ██║███████╗╚██████╔╝   ██║   
  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝    ╚═╝   
  </div>
  </div>                                                                   
Type 'help' to see the list of available commands.
Type 'fahim' to display summary about me.
Type 'resume' to download my resume.
Type 'projects' to View All The projects I've Done.

`; 
};

// export const projects = (args: string[]) => {

  // let data = `<ul>`
  // config.projects.map((project:Project,index:number)=>{
  //    data+=`
  //   <li>${index+1}) ${project.name}<br/>
  //   Description: ${project.desc}.<br/>
  //   Link: <a class="text-dark-blue underline" href="${project.link}" target="_blank">${project.link}</a>
  //   </li>
  //   `
  // })
  // data += "</ul>"
  // return data
export const projects = async (args: string[]): Promise<string> => {
    return await getProjects()
};
export const skills = async (args: string[]): Promise<string> => {
  return await getSkills()
};


// export const skills = (args?: string[]): string => {
//   let data = `<ul>`
//   config.skills.map((skill:string,index:number)=>{
//      data+=`
//     <li>${index+1}) ${skill}</li>
//     `
//   })
//   data += "</ul>"
//   return data
// };

