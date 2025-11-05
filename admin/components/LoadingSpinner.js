import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  text = 'Loading...', 
  centered = false,
  className = '',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg',
    xl: 'spinner-border-xl'
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-info',
    light: 'text-light',
    dark: 'text-dark',
    white: 'text-white'
  };

  const spinnerClasses = `spinner-border ${sizeClasses[size]} ${colorClasses[color]} ${className}`;
  
  const containerClasses = centered ? 'd-flex flex-column align-items-center justify-content-center' : 'd-flex align-items-center';

  return (
    <div className={containerClasses}>
      <div className={spinnerClasses} role="status" aria-hidden="true">
        <span className="visually-hidden">Loading...</span>
      </div>
      {showText && text && (
        <span className={`ms-2 ${colorClasses[color]}`}>
          {text}
        </span>
      )}
    </div>
  );
};

// Full page loading spinner
export const FullPageSpinner = ({ text = 'Loading...', color = 'primary' }) => (
  <div 
    className="d-flex flex-column align-items-center justify-content-center position-fixed w-100 h-100"
    style={{ 
      top: 0, 
      left: 0, 
      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
      zIndex: 9999 
    }}
  >
    <LoadingSpinner size="lg" color={color} text={text} centered />
  </div>
);

// Button loading spinner
export const ButtonSpinner = ({ size = 'sm', color = 'white' }) => (
  <LoadingSpinner 
    size={size} 
    color={color} 
    text="" 
    showText={false}
    className="me-2"
  />
);

// Table loading spinner
export const TableSpinner = ({ colSpan = 8, text = 'Loading properties...' }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-5">
      <LoadingSpinner size="lg" color="primary" text={text} centered />
    </td>
  </tr>
);

// Card loading spinner
export const CardSpinner = ({ text = 'Loading...', height = '200px' }) => (
  <div 
    className="d-flex align-items-center justify-content-center"
    style={{ height }}
  >
    <LoadingSpinner size="lg" color="primary" text={text} centered />
  </div>
);

export default LoadingSpinner;
