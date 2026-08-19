import { type FormEvent, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { SEND_MESSAGE } from '../../store/chatSlice';

export function useChatConversation() {
  const dispatch = useAppDispatch();
  const { messages, sending } = useAppSelector((state) => state.chat);
  const [draft, setDraft] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    void dispatch(SEND_MESSAGE(trimmed));
    setDraft('');
  };

  return { messages, sending, draft, setDraft, handleSubmit };
}
