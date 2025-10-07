import { useState, type MouseEvent } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Stack,
  TableSortLabel,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { StateBadge } from './StateBadge';
import type { PracticeRecord } from '../../types/practica';

interface Props {
  records: PracticeRecord[];
  orderBy: keyof PracticeRecord;
  orderDirection: 'asc' | 'desc';
  onToggleSort: (field: keyof PracticeRecord) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function PracticeList({
  records,
  orderBy,
  orderDirection,
  onToggleSort,
  onApprove,
  onReject,
}: Props) {
  const isMobile = useMediaQuery('(max-width:640px)');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const handleMenuOpen = (event: MouseEvent<HTMLButtonElement>, recordId: string) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedRecordId(recordId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedRecordId(null);
  };

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {records.map((item) => (
          <Card key={item.id}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                {item.nombre_estudiante}
              </Typography>
              <Typography variant="body2">RUT: {item.rut}</Typography>
              <Typography variant="body2">Carrera: {item.carrera}</Typography>
              <Typography variant="body2">
                Fecha envío: {new Date(item.fecha_envio).toLocaleDateString()}
              </Typography>
              <StateBadge estado={item.estado} />
            </CardContent>
            <CardActions>
              <IconButton
                aria-label="acciones"
                onClick={(event) => handleMenuOpen(event, item.id)}
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={menuAnchorEl}
                open={selectedRecordId === item.id && Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem
                  onClick={() => {
                    onApprove(item.id);
                    handleMenuClose();
                  }}
                >
                  Aprobar
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    onReject(item.id);
                    handleMenuClose();
                  }}
                >
                  Rechazar
                </MenuItem>
              </Menu>
            </CardActions>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell
            sortDirection={orderBy === 'nombre_estudiante' ? orderDirection : false}
          >
            <TableSortLabel
              active={orderBy === 'nombre_estudiante'}
              direction={orderBy === 'nombre_estudiante' ? orderDirection : 'asc'}
              onClick={() => onToggleSort('nombre_estudiante')}
            >
              Nombre
            </TableSortLabel>
          </TableCell>
          <TableCell sortDirection={orderBy === 'rut' ? orderDirection : false}>
            <TableSortLabel
              active={orderBy === 'rut'}
              direction={orderBy === 'rut' ? orderDirection : 'asc'}
              onClick={() => onToggleSort('rut')}
            >
              RUT
            </TableSortLabel>
          </TableCell>
          <TableCell sortDirection={orderBy === 'carrera' ? orderDirection : false}>
            <TableSortLabel
              active={orderBy === 'carrera'}
              direction={orderBy === 'carrera' ? orderDirection : 'asc'}
              onClick={() => onToggleSort('carrera')}
            >
              Carrera
            </TableSortLabel>
          </TableCell>
          <TableCell
            sortDirection={orderBy === 'fecha_envio' ? orderDirection : false}
          >
            <TableSortLabel
              active={orderBy === 'fecha_envio'}
              direction={orderBy === 'fecha_envio' ? orderDirection : 'desc'}
              onClick={() => onToggleSort('fecha_envio')}
            >
              Fecha de envío
            </TableSortLabel>
          </TableCell>
          <TableCell sortDirection={orderBy === 'estado' ? orderDirection : false}>
            <TableSortLabel
              active={orderBy === 'estado'}
              direction={orderBy === 'estado' ? orderDirection : 'asc'}
              onClick={() => onToggleSort('estado')}
            >
              Estado
            </TableSortLabel>
          </TableCell>
          <TableCell>Acciones</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {records.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.nombre_estudiante}</TableCell>
            <TableCell>{item.rut}</TableCell>
            <TableCell>{item.carrera}</TableCell>
            <TableCell>{new Date(item.fecha_envio).toLocaleDateString()}</TableCell>
            <TableCell>
              <StateBadge estado={item.estado} />
            </TableCell>
            <TableCell>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => onApprove(item.id)}>
                  Aprobar
                </Button>
                <Button size="small" onClick={() => onReject(item.id)}>
                  Rechazar
                </Button>
              </Stack>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}