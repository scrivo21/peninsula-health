import React from 'react';
import { IconProps } from '../../types/common';

export const MedicalCrossIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = 'currentColor', 
  className = '' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2V22M2 12H22"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="9"
        width="6"
        height="6"
        fill={color}
        rx="1"
      />
    </svg>
  );
};