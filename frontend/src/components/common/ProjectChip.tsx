import { Chip } from '@mui/material';
import { FolderOutlined } from '@mui/icons-material';
import { useDefinedProjects } from '../../store/userStore';

interface ProjectChipProps {
  project: string;
  size?: 'small' | 'medium';
  onClick?: () => void;
}

export default function ProjectChip({ project, size = 'small', onClick }: ProjectChipProps) {
  const definedProjects = useDefinedProjects();

  // Look up the project color from defined projects
  const projectDef = definedProjects.find((p) => p.name === project);
  const color = projectDef?.color;

  return (
    <Chip
      icon={<FolderOutlined sx={{ fontSize: size === 'small' ? 14 : 18 }} />}
      label={project}
      size={size}
      onClick={onClick}
      sx={{
        backgroundColor: color ? `${color}20` : 'action.selected',
        color: color || 'text.primary',
        borderColor: color || 'divider',
        cursor: onClick ? 'pointer' : 'default',
        // Conditional hover style tested via integration tests
        /* v8 ignore next 1 */
        '&:hover': onClick ? { backgroundColor: color ? `${color}30` : 'action.hover' } : {},
      }}
      variant="outlined"
    />
  );
}
