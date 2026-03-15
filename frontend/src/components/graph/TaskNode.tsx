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
        padding: 'var(--mantine-spacing-sm, 10px)',
        minWidth: 180,
        maxWidth: 220,
        borderLeft: `4px solid ${color}`,
        borderRadius: 'var(--mantine-radius-sm, 4px)',
        backgroundColor: isSelected
          ? 'var(--mantine-color-gray-1, #f1f3f5)'
          : 'var(--mantine-color-white, #fff)',
        boxShadow: isSelected
          ? '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.12)'
          : '0 1px 2px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#666',
          width: 8,
          height: 8,
        }}
      />

      {/* Content */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {task.is_complete ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--mantine-color-green-6, #2b8a3e)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginTop: 2, flexShrink: 0 }}
          >
            <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336z" fill="var(--mantine-color-green-6, #2b8a3e)" stroke="none" />
            <path d="M15 9l-6 6" stroke="white" />
            <path d="M9 9l6 6" stroke="white" transform="rotate(90 12 12)" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--mantine-color-gray-5, #adb5bd)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginTop: 2, flexShrink: 0 }}
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 'var(--mantine-font-size-sm, 14px)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: task.is_complete ? 'line-through' : 'none',
              color: task.is_complete
                ? 'var(--mantine-color-dimmed, #868e96)'
                : 'var(--mantine-color-text, #212529)',
            }}
          >
            {task.icon && <span style={{ marginRight: 4 }}>{task.icon}</span>}
            {task.title}
          </div>
          {task.project && (
            <div
              style={{
                fontSize: 'var(--mantine-font-size-xs, 12px)',
                color: 'var(--mantine-color-dimmed, #868e96)',
              }}
            >
              {task.project}
            </div>
          )}
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#666',
          width: 8,
          height: 8,
        }}
      />
    </div>
  );
}
/* v8 ignore stop */

export default memo(TaskNode);
