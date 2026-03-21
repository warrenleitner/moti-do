import { Badge } from '../../ui';
import { IconFolder } from '../../ui/icons';
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
  const mantineSize = size === 'small' ? 'sm' : 'md';

  return (
    <Badge
      size={mantineSize}
      variant="outline"
      leftSection={<IconFolder size={size === 'small' ? 14 : 18} />}
      onClick={onClick}
      style={{
        backgroundColor: color ? `${color}20` : undefined,
        color: color || undefined,
        borderColor: color || undefined,
        // Conditional cursor tested via integration tests
        /* v8 ignore next 1 */
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {project}
    </Badge>
  );
}
