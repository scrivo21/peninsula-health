import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  showText?: boolean;
  className?: string;
  customSize?: number; // Custom size in pixels for the image
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  showText = true, 
  className = '',
  customSize
}) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const sizeClass = styles[`logo${size.charAt(0).toUpperCase() + size.slice(1).replace('-', '')}`];
  
  return (
    <div className={`${styles.logoContainer} ${sizeClass} ${className}`}>
      {!imageError && (
        <img 
          src="/logo.png" 
          alt="Shift Happens Logo" 
          className={styles.logoImage}
          onError={() => {
            console.warn('Logo image failed to load, showing text only');
            setImageError(true);
          }}
          onLoad={() => {
            console.log('✅ Logo loaded successfully');
            setImageLoaded(true);
          }}
          style={{ 
            display: imageLoaded ? 'block' : 'none',
            ...(customSize && { 
              height: `${customSize}px`, 
              width: `${customSize}px` 
            })
          }}
        />
      )}
      
      {/* Always show text, but adjust styling based on image presence */}
      <div className={styles.logoText} style={{
        textAlign: imageError ? 'center' : 'left'
      }}>
        <h1 className={styles.appName}>Shift Happens</h1>
        {showText && <p className={styles.byLine}>by Dale Winzer</p>}
      </div>
    </div>
  );
};

export default Logo;