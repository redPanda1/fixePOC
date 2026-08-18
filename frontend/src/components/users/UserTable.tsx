import { useState } from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { sendPasswordReset, updateUserStatus } from '../../store/usersSlice';
import { USER_MESSAGE } from '../../store/statusSlice';
import type { UserListItem } from '../../types/user';

export default function UserTable() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.users.items);
  const statusUpdatingUsername = useAppSelector((state) => state.users.statusUpdatingUsername);
  const resetPasswordUsername = useAppSelector((state) => state.users.resetPasswordUsername);
  const currentEmail = useAppSelector((state) => state.auth.person?.email ?? null);
  const [pendingStatusChange, setPendingStatusChange] = useState<UserListItem | null>(null);

  const confirmStatusChange = () => {
    if (pendingStatusChange) {
      void dispatch(
        updateUserStatus({ username: pendingStatusChange.username, enabled: !pendingStatusChange.enabled }),
      );
      setPendingStatusChange(null);
    }
  };

  const handleResetPassword = (username: string) => {
    void dispatch(sendPasswordReset(username)).then((action) => {
      if (sendPasswordReset.fulfilled.match(action)) {
        dispatch(USER_MESSAGE({ message: `Password reset email sent to ${username}.`, type: 'SUCCESS' }));
      }
    });
  };

  if (items.length === 0) {
    return <Typography color="text.secondary">No users found.</Typography>;
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Organization</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const isSelf = currentEmail != null && item.email.toLowerCase() === currentEmail.toLowerCase();
              return (
                <TableRow key={item.username} hover>
                  <TableCell>
                    {item.hasPersonRecord ? (
                      `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() || '—'
                    ) : (
                      <Typography component="span" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        (no profile)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{item.email}</TableCell>
                  <TableCell>{item.orgName ?? '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" color={item.isAdmin ? 'secondary' : 'default'} label={item.isAdmin ? 'Admin' : 'User'} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" color={item.enabled ? 'success' : 'error'} label={item.enabled ? 'Enabled' : 'Locked'} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title={isSelf ? "You can't lock your own account" : item.enabled ? 'Lock user' : 'Unlock user'}>
                      <span>
                        <IconButton
                          size="small"
                          disabled={isSelf || statusUpdatingUsername === item.username}
                          onClick={() => setPendingStatusChange(item)}
                          aria-label={item.enabled ? 'Lock user' : 'Unlock user'}
                        >
                          {item.enabled ? <LockOutlinedIcon fontSize="small" /> : <LockOpenOutlinedIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Send password reset email">
                      <span>
                        <IconButton
                          size="small"
                          disabled={resetPasswordUsername === item.username}
                          onClick={() => handleResetPassword(item.username)}
                          aria-label="Reset password"
                        >
                          <LockResetOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={pendingStatusChange !== null} onClose={() => setPendingStatusChange(null)}>
        <DialogTitle>{pendingStatusChange?.enabled ? 'Lock this user?' : 'Unlock this user?'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingStatusChange?.enabled
              ? `${pendingStatusChange?.email} will be unable to sign in until unlocked.`
              : `${pendingStatusChange?.email} will be able to sign in again.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingStatusChange(null)}>Cancel</Button>
          <Button color={pendingStatusChange?.enabled ? 'error' : 'primary'} onClick={confirmStatusChange}>
            {pendingStatusChange?.enabled ? 'Lock' : 'Unlock'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
