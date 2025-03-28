# TypeScript Error Fixes for MUI v7

## Icon Import Fixes

All icon imports need to use the direct import format:

```javascript
// Old format (doesn't work in MUI v7)
import { Add as AddIcon } from '@mui/icons-material';

// New format for MUI v7
import AddIcon from '@mui/icons-material/Add';
```

## Grid Component Fixes

Grid components should use the `size` prop instead of `item` with xs/md/lg props:

```javascript
// Old format (doesn't work in MUI v7)
<Grid item xs={12} md={6}>...</Grid>

// New format for MUI v7
<Grid size={{ xs: 12, md: 6 }}>...</Grid>
```

## Files Requiring Updates

1. src/app/calendar/page.tsx - Icon imports
2. src/app/dependencies/page.tsx - Icon imports
3. src/app/habits/page.tsx - Icon imports and Grid components
4. src/app/page.tsx - Grid components
5. src/app/profile/page.tsx - Icon imports and Grid components
6. src/app/projects/page.tsx - Icon imports and Grid components
7. src/app/settings/page.tsx - Icon imports and Grid components
8. src/app/tags/page.tsx - Icon imports
9. src/components/Todo.tsx - Icon imports
