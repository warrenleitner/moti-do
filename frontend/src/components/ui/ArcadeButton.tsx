import { Button } from '@mantine/core';
import type { ButtonProps } from '@mantine/core';
import type { ReactNode, MouseEventHandler } from 'react';

interface ArcadeButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  primary: {
    root: {
      backgroundColor: '#00E5FF',
      color: '#00626E',
      border: 'none',
      boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
      '&:hover': {
        backgroundColor: '#00d1eb',
        boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5), 0 0 12px rgba(0, 229, 255, 0.4)',
      },
      '&:active': {
        transform: 'translate(1px, 1px)',
        boxShadow: '1px 1px 0px rgba(0, 0, 0, 0.8)',
      },
    },
  },
  secondary: {
    root: {
      backgroundColor: '#FF4A8D',
      color: '#ffffff',
      border: 'none',
      borderBottom: '3px solid #8F0044',
      boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
      '&:hover': {
        backgroundColor: '#ff5c9a',
        boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 0, 127, 0.4)',
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
      color: '#8A8F98',
      border: '1px solid rgba(59, 73, 76, 0.15)',
      boxShadow: 'none',
      '&:hover': {
        color: '#00E5FF',
        borderColor: '#00E5FF',
        boxShadow: '0 0 8px rgba(0, 229, 255, 0.2)',
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
