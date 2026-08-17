import { Paper, Typography } from '@mui/material';
import { useAppSelector } from '../hooks/redux';

export default function MemberDashboardPage() {
  const person = useAppSelector((state) => state.auth.person);

  return (
    <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb' }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Dashboard
      </Typography>
      <Typography color="text.secondary">
        Welcome{person ? `, ${person.firstName}` : ''}.
      </Typography>
    </Paper>
  );
}
