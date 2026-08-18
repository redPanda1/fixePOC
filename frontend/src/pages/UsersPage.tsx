import { useEffect, useState } from 'react';
import { Alert, Button, Paper, Stack, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CreateUserDialog from '../components/users/CreateUserDialog';
import UserTable from '../components/users/UserTable';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { LIST_ORGANIZATIONS } from '../store/organizationSlice';
import { fetchUsers } from '../store/usersSlice';

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const [dialogOpen, setDialogOpen] = useState(false);
  const listStatus = useAppSelector((state) => state.users.listStatus);
  const listError = useAppSelector((state) => state.users.error);
  const organizationsListStatus = useAppSelector((state) => state.organization.listStatus);

  useEffect(() => {
    if (listStatus === 'idle') {
      void dispatch(fetchUsers());
    }
  }, [dispatch, listStatus]);

  useEffect(() => {
    if (organizationsListStatus === 'idle') {
      void dispatch(LIST_ORGANIZATIONS());
    }
  }, [dispatch, organizationsListStatus]);

  return (
    <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Users
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<RefreshRoundedIcon />}
            loading={listStatus === 'loading'}
            onClick={() => void dispatch(fetchUsers())}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddRoundedIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Add user
          </Button>
        </Stack>
      </Stack>

      {listStatus === 'failed' && listError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {listError}
        </Alert>
      )}

      <UserTable />

      <CreateUserDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Paper>
  );
}
