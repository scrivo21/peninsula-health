import React from 'react';
import { IconProps } from '../../types/common';

export const LogoIcon: React.FC<IconProps> = ({ 
  size = 48, 
  color = '#FFFFFF', 
  className = '' 
}) => {
  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* Clock circle */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke={color}
          strokeWidth="3"
          fill="none"
        />
        {/* Clock hands pointing to 3 and 12 (like in logo) */}
        <line
          x1="24"
          y1="24"
          x2="24"
          y2="12"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <line
          x1="24"
          y1="24"
          x2="32"
          y2="24"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle
          cx="24"
          cy="24"
          r="2"
          fill={color}
        />
      </svg>
      
      {/* Medical cross overlay */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Cross positioned in upper right like logo */}
        <g transform="translate(28, 8)">
          <rect
            x="4"
            y="0"
            width="2"
            height="12"
            fill={color}
            rx="1"
          />
          <rect
            x="0"
            y="4"
            width="10"
            height="2"
            fill={color}
            rx="1"
          />
        </g>
      </svg>
    </div>
  );
};