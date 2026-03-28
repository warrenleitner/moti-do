import { Button } from '@mantine/core';
import type { ButtonProps } from '@mantine/core';
import type { ReactNode, MouseEventHandler } from 'react';

interface ArcadeButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  primary: {
    root: {
      backgroundColor: '#81ecff',
      color: '#00626E',
      border: 'none',
      boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
      '&:hover': {
        backgroundColor: '#00d1eb',
        boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5), 0 0 12px rgba(129, 236, 255, 0.4)',
      },
      '&:active': {
        transform: 'translate(1px, 1px)',
        boxShadow: '1px 1px 0px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  secondary: {
    root: {
      backgroundColor: '#ffadc2',
      color: '#ffffff',
      border: 'none',
      borderBottom: '3px solid #8F0044',
      boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
      '&:hover': {
        backgroundColor: '#ff5c9a',
        boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 107, 155, 0.4)',
      },
      '&:active': {
        borderBottomWidth: '0px',
        transform: 'translate(1px, 3px)',
        boxShadow: '1px 1px 0px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  ghost: {
    root: {
      backgroundColor: 'transparent',
      color: '#a8aab7',
      border: '1px solid rgba(69, 71, 82, 0.15)',
      boxShadow: 'none',
      '&:hover': {
        color: '#81ecff',
        borderColor: '#81ecff',
        boxShadow: '0 0 8px rgba(129, 236, 255, 0.2)',
      },
    },
  },
  gradient: {
    root: {
      background: 'linear-gradient(90deg, #81ecff, #ff6b9b)',
      color: '#0B0E17',
      border: 'none',
      fontWeight: 700,
      boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
      '&:hover': {
        boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5), 0 0 16px rgba(129, 236, 255, 0.35), 0 0 16px rgba(255, 107, 155, 0.25)',
      },
      '&:active': {
        transform: 'translate(1px, 1px)',
        boxShadow: '1px 1px 0px rgba(0, 0, 0, 0.8)',
      },
    },
  },
};

export function ArcadeButton({
  variant = 'primary',
  children,
  ...props
}: ArcadeButtonProps) {
  return (
    <Button
      radius={0}
      styles={variantStyles[variant]}
      {...props}
    >
      {children}
    </Button>
  );
}
