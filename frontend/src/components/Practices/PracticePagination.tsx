import { Stack, Typography, Pagination } from '@mui/material';

interface Props {
  page: number;
  totalPages: number;
  onChange: (value: number) => void;
  range: string;
}

export function PracticePagination({ page, totalPages, onChange, range }: Props) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
      <Typography variant="body2">{range}</Typography>
      <Pagination
        page={page}
        count={totalPages}
        onChange={(_, value) => onChange(value)}
        color="primary"
        siblingCount={1}
        boundaryCount={1}
      />
    </Stack>
  );
}