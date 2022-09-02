import React from 'react';
import config from '../../config.json';

export const Ps1 = () => {
  return (
    <div>
      <span className="text-dark-yellow dark:text-dark-yellow">
        {config.ps1_username}
      </span>
      <span className="text-dark-gray dark:text-dark-gray">@</span>
      <span className="text-dark-green dark:text-dark-green">
        {config.ps1_hostname}
      </span>
      <span className="text-dark-gray dark:text-dark-gray">:$ ~ </span>
    </div>
  );
};

export default Ps1;
