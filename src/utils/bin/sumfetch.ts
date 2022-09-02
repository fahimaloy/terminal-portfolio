import config from '../../../config.json';
import Photo from "../../assets/ascii_photo.png"
const fahim = async (args: string[]): Promise<string> => {
  if (config.ascii === 'cveinnt') {
    return `                                                  
             @@@@@@@@@@@@@                   fahim: summary display
        @@@@               @@@@             -----------
      @@                       @@            ABOUT
    @@                           @@          ${config.name}
  @@                               @@       ﰩ ${config.ps1_hostname}
 @@                         @@@     @@       <u><a href="${config.resume_url}" target="_blank">resume</a></u>
@@        @@@                        @@     爵 <u><a href="${config.repo}" target="_blank">Github repo</a></u>
@@                                   @@     -----------
@@             .@@@@@@@@@@.          @@      CONTACT 
 @@           @@          @@        @@       <u><a href="mailto:${config.email}" target="_blank">${config.email}</a></u>
  @@           @@        @@        @@        <u><a href="https://github.com/${config.social.github}" target="_blank">github.com/${config.social.github}</a></u>
   @@             @@@@@@          @@         <u><a href="https://linkedin.com/in/${config.social.linkedin}" target="_blank">linkedin.com/in/${config.social.linkedin}</a></u>
     @@@                        @@@         -----------
        @@@                  @@@ @@     
         @|  @@@@@@@@@@@@@@@@   @@       
         @|                      @@      

`;
  } else {
    return `
<div style="display: flex; align-items:center; justify-content:space-around">
<img style="margin-right:15px;" src="${Photo.src}" height="300px" width="300px"/>
<div>
 fahim
-----------
 ABOUT
 ${config.name}
 <u><a href="${config.resume_url}" target="_blank">resume</a></u>
爵 <u><a href="${config.repo}" target="_blank">Github repo</a></u>
-----------
 CONTACT 
 <u><a href="mailto:${config.email}" target="_blank">${config.email}</a></u>
 <u><a href="https://github.com/${config.social.github}" target="_blank">github.com/${config.social.github}</a></u>
 <u><a href="https://linkedin.com/in/${config.social.linkedin}" target="_blank">linkedin.com/in/${config.social.linkedin}</a></u>
</div>
</div>
      
        
            

`;
  }
};

export default fahim;
