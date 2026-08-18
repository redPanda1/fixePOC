import { Avatar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useAppSelector } from '../../hooks/redux';

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'
  );
}

export default function CustomerTable() {
  const organizations = useAppSelector((state) => state.organization.organizations);

  if (organizations.length === 0) {
    return <Typography color="text.secondary">No customers found.</Typography>;
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell>Name</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {organizations.map((org) => (
            <TableRow key={org.orgId} hover>
              <TableCell sx={{ width: 56 }}>
                <Avatar src={org.avatarUrl ?? undefined} sx={{ bgcolor: '#38d29f', color: '#132030', width: 32, height: 32 }}>
                  {initialsFor(org.name)}
                </Avatar>
              </TableCell>
              <TableCell>{org.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
