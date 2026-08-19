import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import NewQuestionForm from './NewQuestionForm';
import { useNewQuestionForm } from './useNewQuestionForm';

interface NewQuestionDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewQuestionDialog({ open, onClose }: NewQuestionDialogProps) {
  const form = useNewQuestionForm(onClose);

  const handleCancel = () => {
    form.resetState();
    onClose();
  };

  return (
    <Dialog open={open} onClose={form.creating ? undefined : handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>New question</DialogTitle>
      <DialogContent>
        <NewQuestionForm form={form} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleCancel} disabled={form.creating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={!form.canSubmit}
          onClick={() => void form.handleSubmit()}
          startIcon={form.creating ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {form.creating ? 'Creating…' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
