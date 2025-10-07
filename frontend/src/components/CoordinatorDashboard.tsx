import { Box } from '@mui/material';
import { usePracticasDashboard } from '../hooks/usePracticasDashboard';
import { PracticeFilters } from './Practices/PracticeFilters';
import { PracticeList } from './Practices/PracticeList';
import { PracticePagination } from './Practices/PracticePagination';

export default function CoordinatorDashboard() {
  const {
    search,
    setSearch,
    orderBy,
    orderDirection,
    toggleSort,
    page,
    setPage,
    totalPages,
    paginated,
    startIdx,
    endIdx,
    totalItems,
    handleApprove,
    handleReject,
  } = usePracticasDashboard();

  const range =
    totalItems === 0 ? '0–0 de 0' : `${startIdx + 1}–${endIdx} de ${totalItems}`;

  return (
    <Box>
      <PracticeFilters
        search={search}
        onSearchChange={setSearch}
      />
      <PracticeList
        records={paginated}
        orderBy={orderBy}
        orderDirection={orderDirection}
        onToggleSort={toggleSort}
        onApprove={handleApprove}
        onReject={handleReject}
      />
      <PracticePagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
        range={range}
      />
    </Box>
  );
}