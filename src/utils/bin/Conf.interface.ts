export interface Conf {
    readmeUrl:    string;
    title:        string;
    name:         string;
    ascii:        string;
    social:       Social;
    projects:     Project[];
    skills:       string[];
    email:        string;
    ps1_hostname: string;
    ps1_username: string;
    repo:         string;
    resume_url:   string;
    donate_urls:  DonateUrls;
    colors:       Colors;
  }
  
  export interface Colors {
    light: Dark;
    dark:  Dark;
  }
  
  export interface Dark {
    background: string;
    foreground: string;
    yellow:     string;
    green:      string;
    gray:       string;
    blue:       string;
    red:        string;
  }
  
  export interface DonateUrls {
    paypal:  string;
    patreon: string;
  }
  
  export interface Project {
    name: string;
    desc: string;
    link: string;
  }
  
  export interface Social {
    github:   string;
    linkedin: string;
  }
  