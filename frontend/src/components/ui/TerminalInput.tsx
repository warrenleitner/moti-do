import { TextInput } from '@mantine/core';
import type { TextInputProps } from '@mantine/core';

interface TerminalInputProps extends Omit<TextInputProps, 'leftSection'> {
  prefix?: string;
}

export function TerminalInput({ prefix = '>', ...props }: TerminalInputProps) {
  return (
    <TextInput
      leftSection={
        <span
          style={{
            color: '#00E5FF',
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 700,
            fontSize: '1rem',
          }}
        >
          {prefix}
        </span>
      }
      styles={{
        input: {
          backgroundColor: '#0B0E17',
          borderColor: 'rgba(59, 73, 76, 0.15)',
          color: '#E0E0E0',
          fontFamily: '"JetBrains Mono", monospace',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '&:focus': {
            borderColor: '#00E5FF',
            boxShadow: '0 0 8px rgba(0, 229, 255, 0.3)',
          },
          '&::placeholder': {
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#5A5E66',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.6875rem',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#8A8F98',
        },
      }}
      radius={0}
      {...props}
    />
  );
}
