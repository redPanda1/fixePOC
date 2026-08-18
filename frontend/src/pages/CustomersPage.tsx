import { useEffect } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CustomerTable from '../components/customers/CustomerTable';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { LIST_ORGANIZATIONS } from '../store/organizationSlice';

export default function CustomersPage() {
  const dispatch = useAppDispatch();
  const listStatus = useAppSelector((state) => state.organization.listStatus);
  const listError = useAppSelector((state) => state.organization.error);

  useEffect(() => {
    if (listStatus === 'idle') {
      void dispatch(LIST_ORGANIZATIONS());
    }
  }, [dispatch, listStatus]);

  return (
    <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Customers
        </Typography>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<RefreshRoundedIcon />}
          loading={listStatus === 'loading'}
          onClick={() => void dispatch(LIST_ORGANIZATIONS())}
        >
          Refresh
        </Button>
      </Stack>

      {listStatus === 'failed' && listError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {listError}
        </Alert>
      )}

      <CustomerTable />
    </Paper>
  );
}
