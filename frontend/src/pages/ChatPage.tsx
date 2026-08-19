import { Paper, Typography } from '@mui/material';
import ChatConversation from '../components/chat/ChatConversation';
import { useChatConversation } from '../components/chat/useChatConversation';

export default function ChatPage() {
  const { messages, sending, draft, setDraft, handleSubmit } = useChatConversation();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        border: '1px solid #e3e7eb',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 160px)',
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Chat
      </Typography>

      <ChatConversation
        messages={messages}
        sending={sending}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
      />
    </Paper>
  );
}
