import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createNewThread } from '../../store/actionQueueSlice';
import { LIST_ORGANIZATIONS } from '../../store/organizationSlice';
import { USER_MESSAGE } from '../../store/statusSlice';
import type { MessageOption, ReferenceInput } from '../../types/actionQueue';

export interface OptionRow {
  key: string;
  label: string;
  value: string;
}

export function useNewQuestionForm(onCreated: () => void) {
  const dispatch = useAppDispatch();
  const person = useAppSelector((state) => state.auth.person);
  const organizations = useAppSelector((state) => state.organization.organizations);
  const organizationsListStatus = useAppSelector((state) => state.organization.listStatus);
  const createStatus = useAppSelector((state) => state.actionQueue.createStatus);

  const [orgId, setOrgId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [references, setReferences] = useState<ReferenceInput[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Bumped on every reset so components that keep their own local state derived from
  // `references` (e.g. ScreenshotReferenceList's capture previews) can key off it to
  // remount and start clean, instead of syncing state in an effect.
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (organizationsListStatus === 'idle') {
      void dispatch(LIST_ORGANIZATIONS());
    }
  }, [dispatch, organizationsListStatus]);

  const selectedOrg = organizations.find((org) => org.orgId === orgId);
  const assignedToId = selectedOrg?.defaultAmId ?? person?.personId ?? '';

  const resetState = () => {
    setOrgId('');
    setSubject('');
    setBody('');
    setReferences([]);
    setOptions([]);
    setSubmitError(null);
    setResetKey((key) => key + 1);
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

  const creating = createStatus === 'loading';
  const canSubmit = Boolean(orgId && subject.trim() && body.trim() && assignedToId) && !creating;

  const handleSubmit = async () => {
    if (!orgId || !subject.trim() || !body.trim() || !assignedToId) return;
    setSubmitError(null);

    const cleanOptions: MessageOption[] = options
      .filter((row) => row.label.trim() && row.value.trim())
      .map((row) => ({ id: row.key, label: row.label.trim(), value: row.value.trim() }));

    try {
      await dispatch(
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
      dispatch(USER_MESSAGE({ message: 'Question sent.', type: 'SUCCESS' }));
      onCreated();
    } catch {
      setSubmitError('The question could not be created. Try again.');
    }
  };

  return {
    orgId,
    setOrgId,
    subject,
    setSubject,
    body,
    setBody,
    references,
    setReferences,
    options,
    pickerOpen,
    setPickerOpen,
    submitError,
    resetKey,
    organizations,
    selectedOrg,
    addOptionRow,
    updateOptionRow,
    removeOptionRow,
    canSubmit,
    creating,
    handleSubmit,
    resetState,
  };
}

export type NewQuestionFormState = ReturnType<typeof useNewQuestionForm>;
