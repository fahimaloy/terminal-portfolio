// List of commands that do not require API calls
import { Conf, Project } from './Conf.interface';
import * as bin from './index';
const config: Conf = require('../../../config.json');

import Photo from '../../assets/ascii_photo.png';
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
  // window.open(`https://www.linkedin.com/in/${config.social.linkedin}/`);

  return 'Sorry, Soon will update LinkedIn! Try typing github';
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

export const exit = async (args?: string[]): Promise<string> => {
  window.close();
  return `Exiting!!! Good bye!`;
};
export const shutdown = async (args?: string[]): Promise<string> => {
  window.close();
  return `Shutting Down!!! Good bye!`;
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
export const projects = async (args: string[]): Promise<string> => {
  const data = await getProjects();
 let html =  `
  <table style="text-align:center; width:100%">
  <tr>
    <th>#</th>
    <th>Stack</th>
    <th>Projects</th>
  </tr>
  `
  for (let i=0; i<data.length;i++){
    let listHtml = '<ol style="display:flex; flex-wrap:wrap; justify-content: space-eavenly align-items:center">'
    for(let j=0;j<data[i].portfolio.length;j++){
      let url = `${data[i].portfolio[j].thumbnail}`
      listHtml += `<li style="font-size:14px">${data[i].portfolio[j].title} <img height="60" width="80" src="${url}" /></li>`
    }
    listHtml += '</ol>'
    html+=`
    <tr>
    <td>${i+1}</td>
    <td> ${data[i].title}</td>
    <td> ${listHtml} </td>
    </tr>
    `
  }
  html+='</table>'
  return html
};
export const skills =  (args: string[]): string => {
  // return await getSkills();
  return ` <ul type="1">
  <li>1. <i class="fab fa-react"></i> React/Next JS</li>
  <li>2. <i class="fab fa-vuejs"></i> Vue/Nuxt JS</li>
  <li>3. <i class="fab fa-python"></i> Python</li>
  <li>4. <i class="fab fa-python"></i> Django</li>
  <li>5. <i class="fab fa-node"></i> Express</li>
  <li>6. <i class="fab fa-js"></i> Typescript</li>
  <li>7. <i class="fas fa-database"></i> MongoDB</li>
  <li>8. <i class="fas fa-database"></i> MySQL/PostgreSQL</li>
  <li>9. <i class="fab fa-cuttlefish"></i> C++</li>
  <li>10. <i class="fas fa-code"></i> Golang</li>
  <li>11. <i class="fas fa-wine-glass"></i> GIN</li>
  <li>12. <i class="fab fa-linux"></i> Nginx</li>
  <li>13. <i class="fas fa-server"></i> VPS Management</li>
  <li>14. <i class="fas fa-cogs"></i> CI/CD Pipeline</li>
  <li>15. <i class="fas fa-database"></i> Redis</li>
</ul>`
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
