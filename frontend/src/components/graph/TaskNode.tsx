import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Task } from '../../types';

interface TaskNodeProps {
  data: {
    task: Task;
    isSelected: boolean;
    color: string;
  };
}

// React Flow node component - tested via integration tests
/* v8 ignore start */
function TaskNode({ data }: TaskNodeProps) {
  const { task, isSelected, color } = data;

  return (
    <div
      style={{
        padding: '10px',
        minWidth: 180,
        maxWidth: 220,
        borderLeft: `4px solid ${color}`,
        borderRadius: 0,
        backgroundColor: isSelected ? '#272A34' : '#10131C',
        border: isSelected
          ? `1px solid #00E5FF`
          : '1px solid rgba(59, 73, 76, 0.15)',
        borderLeftWidth: 4,
        borderLeftColor: color,
        boxShadow: isSelected
          ? '4px 4px 0px rgba(0, 0, 0, 0.5), 0 0 12px rgba(0, 229, 255, 0.3)'
          : '4px 4px 0px rgba(0, 0, 0, 0.5)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        opacity: task.is_complete ? 0.6 : 1,
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#00E5FF',
          width: 8,
          height: 8,
          border: '2px solid #10131C',
          borderRadius: 0,
        }}
      />

      {/* Content */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {task.is_complete ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00E5FF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginTop: 2, flexShrink: 0 }}
          >
            <path d="M5 12l5 5l10 -10" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3B494C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginTop: 2, flexShrink: 0 }}
          >
            <rect x="4" y="4" width="16" height="16" rx="0" />
          </svg>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '0.8125rem',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: task.is_complete ? 'line-through' : 'none',
              color: task.is_complete ? '#5A5E66' : '#E0E0E0',
            }}
          >
            {task.icon && <span style={{ marginRight: 4 }}>{task.icon}</span>}
            {task.title}
          </div>
          {task.project && (
            <div
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.625rem',
                color: '#5A5E66',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 2,
              }}
            >
              {task.project}
            </div>
          )}
          {/* Status badge */}
          <div
            style={{
              display: 'inline-block',
              marginTop: 4,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.5625rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: task.is_complete ? '#5A5E66' : color,
              backgroundColor: task.is_complete ? 'rgba(90, 94, 102, 0.1)' : `${color}1A`,
              border: `1px solid ${task.is_complete ? 'rgba(90, 94, 102, 0.2)' : `${color}33`}`,
              padding: '1px 5px',
            }}
          >
            {task.is_complete ? 'DONE' : (task.status || 'TODO').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#00E5FF',
          width: 8,
          height: 8,
          border: '2px solid #10131C',
          borderRadius: 0,
        }}
      />
    </div>
  );
}
/* v8 ignore stop */

export default memo(TaskNode);
