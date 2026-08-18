import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  type SelectChangeEvent,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { addUser } from '../../store/usersSlice';

const NEW_ORG_VALUE = '__new__';

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const dispatch = useAppDispatch();
  const createStatus = useAppSelector((state) => state.users.createStatus);
  const organizations = useAppSelector((state) => state.organization.organizations);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'USER' | 'ADMIN'>('USER');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const creatingNewOrg = selectedOrgId === NEW_ORG_VALUE;

  const resetState = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole('USER');
    setSelectedOrgId('');
    setNewOrgName('');
    setSubmitError(null);
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const isValid =
    email.trim() !== '' &&
    firstName.trim() !== '' &&
    lastName.trim() !== '' &&
    (creatingNewOrg ? newOrgName.trim() !== '' : selectedOrgId !== '');

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitError(null);
    try {
      await dispatch(
        addUser({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          isAdmin: role === 'ADMIN',
          ...(creatingNewOrg ? { newOrganizationName: newOrgName.trim() } : { orgId: selectedOrgId }),
        }),
      ).unwrap();
      resetState();
      onClose();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'The user could not be created.';
      setSubmitError(message);
    }
  };

  const creating = createStatus === 'loading';

  return (
    <Dialog open={open} onClose={creating ? undefined : handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add user</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={creating}
            fullWidth
            size="small"
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="First name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={creating}
              fullWidth
              size="small"
            />
            <TextField
              label="Last name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={creating}
              fullWidth
              size="small"
            />
          </Stack>

          <FormControl fullWidth size="small" disabled={creating}>
            <InputLabel id="user-role-label">Role</InputLabel>
            <Select
              labelId="user-role-label"
              label="Role"
              value={role}
              onChange={(event: SelectChangeEvent) => setRole(event.target.value as 'USER' | 'ADMIN')}
            >
              <MenuItem value="USER">User</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" disabled={creating}>
            <InputLabel id="user-org-label">Organization</InputLabel>
            <Select
              labelId="user-org-label"
              label="Organization"
              value={selectedOrgId}
              onChange={(event: SelectChangeEvent) => setSelectedOrgId(event.target.value)}
            >
              {organizations.map((org) => (
                <MenuItem key={org.orgId} value={org.orgId}>
                  {org.name}
                </MenuItem>
              ))}
              <MenuItem value={NEW_ORG_VALUE}>+ Create new organization…</MenuItem>
            </Select>
          </FormControl>

          {creatingNewOrg && (
            <TextField
              label="Organization name"
              value={newOrgName}
              onChange={(event) => setNewOrgName(event.target.value)}
              disabled={creating}
              fullWidth
              size="small"
            />
          )}

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCancel} disabled={creating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={!isValid || creating}
          onClick={() => void handleSubmit()}
        >
          {creating ? 'Creating…' : 'Create user'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
