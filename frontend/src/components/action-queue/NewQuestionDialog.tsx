import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createNewThread } from '../../store/actionQueueSlice';
import type { MessageOption, ReferenceInput } from '../../types/actionQueue';
import ReferencePickerDialog from './ReferencePickerDialog';

interface OptionRow {
  key: string;
  label: string;
  value: string;
}

interface NewQuestionDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewQuestionDialog({ open, onClose }: NewQuestionDialogProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const person = useAppSelector((state) => state.auth.person);
  const organizations = useAppSelector((state) => state.organization.organizations);
  const createStatus = useAppSelector((state) => state.actionQueue.createStatus);

  const [orgId, setOrgId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [references, setReferences] = useState<ReferenceInput[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedOrg = organizations.find((org) => org.orgId === orgId);
  const assignedToId = selectedOrg?.defaultAmId ?? person?.personId ?? '';

  const resetState = () => {
    setOrgId('');
    setSubject('');
    setBody('');
    setReferences([]);
    setOptions([]);
    setSubmitError(null);
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const addOptionRow = () => {
    setOptions((prev) => [...prev, { key: crypto.randomUUID(), label: '', value: '' }]);
  };

  const updateOptionRow = (key: string, field: 'label' | 'value', text: string) => {
    setOptions((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: text } : row)));
  };

  const removeOptionRow = (key: string) => {
    setOptions((prev) => prev.filter((row) => row.key !== key));
  };

  const handleSubmit = async () => {
    if (!orgId || !subject.trim() || !body.trim() || !assignedToId) return;
    setSubmitError(null);

    const cleanOptions: MessageOption[] = options
      .filter((row) => row.label.trim() && row.value.trim())
      .map((row) => ({ id: row.key, label: row.label.trim(), value: row.value.trim() }));

    try {
      const thread = await dispatch(
        createNewThread({
          orgId,
          assignedToId,
          subject: subject.trim(),
          body: body.trim(),
          references,
          options: cleanOptions,
        }),
      ).unwrap();
      resetState();
      onClose();
      navigate(`/action-queue/${thread.threadId}`);
    } catch {
      setSubmitError('The question could not be created. Try again.');
    }
  };

  const creating = createStatus === 'loading';

  return (
    <>
      <Dialog open={open} onClose={creating ? undefined : handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New question</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="new-question-org-label">Customer</InputLabel>
              <Select
                labelId="new-question-org-label"
                label="Customer"
                value={orgId}
                onChange={(event: SelectChangeEvent) => setOrgId(event.target.value)}
              >
                {organizations.map((org) => (
                  <MenuItem key={org.orgId} value={org.orgId}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {orgId && !selectedOrg?.defaultAmId && (
              <Alert severity="info">No default Account Manager is set for this org — it will be assigned to you.</Alert>
            )}

            <TextField
              label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Question"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              fullWidth
              multiline
              minRows={3}
              size="small"
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                References
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
                {references.map((ref, index) => (
                  <Chip
                    key={index}
                    label={ref.label ?? (ref.type === 'receipt' ? 'Receipt' : ref.url)}
                    onDelete={() => setReferences((prev) => prev.filter((_, i) => i !== index))}
                  />
                ))}
              </Stack>
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setPickerOpen(true)} disabled={!orgId}>
                Add reference
              </Button>
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Options
              </Typography>
              <Stack spacing={1}>
                {options.map((row) => (
                  <Stack key={row.key} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TextField
                      placeholder="Label"
                      value={row.label}
                      onChange={(event) => updateOptionRow(row.key, 'label', event.target.value)}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      placeholder="Value"
                      value={row.value}
                      onChange={(event) => updateOptionRow(row.key, 'value', event.target.value)}
                      size="small"
                      fullWidth
                    />
                    <IconButton size="small" onClick={() => removeOptionRow(row.key)} aria-label="Remove option">
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={addOptionRow} sx={{ mt: 1 }}>
                Add option
              </Button>
            </Box>

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
            disabled={!orgId || !subject.trim() || !body.trim() || creating}
            onClick={() => void handleSubmit()}
            startIcon={creating ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            {creating ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ReferencePickerDialog
        open={pickerOpen}
        orgId={orgId || null}
        onClose={() => setPickerOpen(false)}
        onSelect={(reference) => setReferences((prev) => [...prev, reference])}
      />
    </>
  );
}
