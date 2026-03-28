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
            color: '#81ecff',
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
          borderColor: 'rgba(69, 71, 82, 0.15)',
          color: '#e6e7f5',
          fontFamily: '"JetBrains Mono", monospace',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          '&:focus': {
            borderColor: '#81ecff',
            boxShadow: '0 0 8px rgba(129, 236, 255, 0.3)',
          },
          '&::placeholder': {
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#525560',
          },
        },
        label: {
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.6875rem',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          color: '#a8aab7',
        },
      }}
      radius={0}
      {...props}
    />
  );
}
