import {
  Alert,
  Box,
  Button,
  Chip,
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
import ReferencePickerDialog from './ReferencePickerDialog';
import ScreenshotReferenceList from './ScreenshotReferenceList';
import type { NewQuestionFormState } from './useNewQuestionForm';

interface NewQuestionFormProps {
  form: NewQuestionFormState;
  referencesMode?: 'picker' | 'screenshot';
}

export default function NewQuestionForm({ form, referencesMode = 'picker' }: NewQuestionFormProps) {
  return (
    <>
      <Stack spacing={2} sx={{ pt: 0.5 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="new-question-org-label">Customer</InputLabel>
          <Select
            labelId="new-question-org-label"
            label="Customer"
            value={form.orgId}
            onChange={(event: SelectChangeEvent) => form.setOrgId(event.target.value)}
          >
            {form.organizations.map((org) => (
              <MenuItem key={org.orgId} value={org.orgId}>
                {org.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {form.orgId && !form.selectedOrg?.defaultAmId && (
          <Alert severity="info">No default Account Manager is set for this org — it will be assigned to you.</Alert>
        )}

        <TextField
          label="Subject"
          value={form.subject}
          onChange={(event) => form.setSubject(event.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="Question"
          value={form.body}
          onChange={(event) => form.setBody(event.target.value)}
          fullWidth
          multiline
          minRows={3}
          size="small"
        />

        {referencesMode === 'screenshot' ? (
          <ScreenshotReferenceList
            key={form.resetKey}
            orgId={form.orgId || null}
            references={form.references}
            onAdd={(reference) => form.setReferences((prev) => [...prev, reference])}
            onRemove={(index) => form.setReferences((prev) => prev.filter((_, i) => i !== index))}
          />
        ) : (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              References
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
              {form.references.map((ref, index) => (
                <Chip
                  key={index}
                  label={ref.label ?? (ref.type === 'receipt' ? 'Receipt' : ref.url)}
                  onDelete={() => form.setReferences((prev) => prev.filter((_, i) => i !== index))}
                />
              ))}
            </Stack>
            <Button
              size="small"
              startIcon={<AddRoundedIcon />}
              onClick={() => form.setPickerOpen(true)}
              disabled={!form.orgId}
            >
              Add reference
            </Button>
          </Box>
        )}

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Options
          </Typography>
          <Stack spacing={1}>
            {form.options.map((row) => (
              <Stack key={row.key} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  placeholder="Label"
                  value={row.label}
                  onChange={(event) => form.updateOptionRow(row.key, 'label', event.target.value)}
                  size="small"
                  fullWidth
                />
                <TextField
                  placeholder="Value"
                  value={row.value}
                  onChange={(event) => form.updateOptionRow(row.key, 'value', event.target.value)}
                  size="small"
                  fullWidth
                />
                <IconButton size="small" onClick={() => form.removeOptionRow(row.key)} aria-label="Remove option">
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button size="small" startIcon={<AddRoundedIcon />} onClick={form.addOptionRow} sx={{ mt: 1 }}>
            Add option
          </Button>
        </Box>

        {form.submitError && <Alert severity="error">{form.submitError}</Alert>}
      </Stack>

      {referencesMode === 'picker' && (
        <ReferencePickerDialog
          open={form.pickerOpen}
          orgId={form.orgId || null}
          onClose={() => form.setPickerOpen(false)}
          onSelect={(reference) => form.setReferences((prev) => [...prev, reference])}
        />
      )}
    </>
  );
}
