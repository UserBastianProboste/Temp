import { Stack, TextField } from '@mui/material';

interface Props {
  search: string;
  onSearchChange: (val: string) => void;
}

export function PracticeFilters({
  search,
  onSearchChange,
}: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
      <TextField
        label="Buscar"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        fullWidth
      />
    </Stack>
  );
}