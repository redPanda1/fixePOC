import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  FormGroup,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AvatarUploader from '../components/profile/AvatarUploader';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { FETCH_PERSON_PROFILE, UPDATE_PERSON } from '../store/authSlice';
import { FETCH_ORGANIZATION, UPDATE_ORGANIZATION } from '../store/organizationSlice';
import type { CommunicationPreference } from '../types/person';

const COMMUNICATION_PREFERENCE_OPTIONS: { value: CommunicationPreference; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'textMessage', label: 'Text message' },
  { value: 'fixeApp', label: 'FIXE app' },
];

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const person = useAppSelector((state) => state.auth.person);
  const personStatus = useAppSelector((state) => state.auth.personStatus);
  const personUpdateStatus = useAppSelector((state) => state.auth.personUpdateStatus);
  const authError = useAppSelector((state) => state.auth.error);
  const organization = useAppSelector((state) => state.organization.organization);
  const organizationStatus = useAppSelector((state) => state.organization.status);
  const organizationUpdateStatus = useAppSelector((state) => state.organization.updateStatus);
  const organizationError = useAppSelector((state) => state.organization.error);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [communicationPreferences, setCommunicationPreferences] = useState<
    CommunicationPreference[]
  >([]);
  const [prevPersonId, setPrevPersonId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [prevOrgId, setPrevOrgId] = useState<string | null>(null);
  const [personSaved, setPersonSaved] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  useEffect(() => {
    void dispatch(FETCH_PERSON_PROFILE());
    void dispatch(FETCH_ORGANIZATION());
  }, [dispatch]);

  // Seed the editable fields from the server record the first time it loads,
  // without clobbering in-progress edits on later re-renders (e.g. after save).
  if (person && person.personId !== prevPersonId) {
    setPrevPersonId(person.personId);
    setFirstName(person.firstName);
    setLastName(person.lastName);
    setCommunicationPreferences(person.communicationPreferences ?? []);
  }
  if (organization && organization.orgId !== prevOrgId) {
    setPrevOrgId(organization.orgId);
    setOrgName(organization.name);
  }

  const handleSavePerson = (event: FormEvent) => {
    event.preventDefault();
    setPersonSaved(false);
    dispatch(UPDATE_PERSON({ firstName, lastName, communicationPreferences }))
      .unwrap()
      .then(() => setPersonSaved(true))
      .catch(() => undefined);
  };

  const handleToggleCommunicationPreference = (value: CommunicationPreference, checked: boolean) => {
    setCommunicationPreferences((current) =>
      checked ? [...current, value] : current.filter((item) => item !== value),
    );
  };

  const handleSaveOrganization = (event: FormEvent) => {
    event.preventDefault();
    setOrgSaved(false);
    dispatch(UPDATE_ORGANIZATION({ name: orgName }))
      .unwrap()
      .then(() => setOrgSaved(true))
      .catch(() => undefined);
  };

  const handlePersonAvatarUploaded = async (fileUrl: string) => {
    await dispatch(UPDATE_PERSON({ firstName, lastName, avatarUrl: fileUrl })).unwrap();
  };

  const handleOrgAvatarUploaded = async (fileUrl: string) => {
    await dispatch(UPDATE_ORGANIZATION({ name: orgName, avatarUrl: fileUrl })).unwrap();
  };

  const initials = person ? `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}` : '';

  const bothSettled =
    (personStatus === 'succeeded' || personStatus === 'failed') &&
    (organizationStatus === 'succeeded' || organizationStatus === 'failed');

  if (!bothSettled) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
        Edit profile
      </Typography>

      <Stack spacing={3}>
        <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb' }}>
          {!person ? (
            <Alert severity="error">Your profile could not be loaded.</Alert>
          ) : (
            <Stack spacing={3}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Your profile
              </Typography>
              <AvatarUploader
                target="person"
                label="Photo"
                currentAvatarUrl={person.avatarUrl}
                initials={initials}
                onUploaded={handlePersonAvatarUploaded}
              />
              <Divider />
              {authError && <Alert severity="error">{authError}</Alert>}
              {personSaved && personUpdateStatus === 'succeeded' && (
                <Alert severity="success">Profile updated.</Alert>
              )}
              <Box component="form" onSubmit={handleSavePerson}>
                <Stack spacing={2}>
                  <TextField
                    label="First name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Last name"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                    fullWidth
                  />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      Communication preferences
                    </Typography>
                    <FormGroup>
                      {COMMUNICATION_PREFERENCE_OPTIONS.map((option) => (
                        <FormControlLabel
                          key={option.value}
                          control={
                            <Checkbox
                              checked={communicationPreferences.includes(option.value)}
                              onChange={(event) =>
                                handleToggleCommunicationPreference(option.value, event.target.checked)
                              }
                            />
                          }
                          label={option.label}
                        />
                      ))}
                    </FormGroup>
                  </Box>
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    disabled={personUpdateStatus === 'loading'}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {personUpdateStatus === 'loading' ? 'Saving…' : 'Save'}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          )}
        </Paper>

        <Paper elevation={0} sx={{ p: 4, border: '1px solid #e3e7eb' }}>
          {!organization ? (
            <Alert severity="error">The organization could not be loaded.</Alert>
          ) : (
            <Stack spacing={3}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Organization
              </Typography>
              <AvatarUploader
                target="organization"
                label="Logo"
                currentAvatarUrl={organization.avatarUrl}
                initials={organization.name?.[0] ?? ''}
                onUploaded={handleOrgAvatarUploaded}
              />
              <Divider />
              {organizationError && <Alert severity="error">{organizationError}</Alert>}
              {orgSaved && organizationUpdateStatus === 'succeeded' && (
                <Alert severity="success">Organization updated.</Alert>
              )}
              <Box component="form" onSubmit={handleSaveOrganization}>
                <Stack spacing={2}>
                  <TextField
                    label="Organization name"
                    value={orgName}
                    onChange={(event) => setOrgName(event.target.value)}
                    required
                    fullWidth
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    disabled={organizationUpdateStatus === 'loading'}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {organizationUpdateStatus === 'loading' ? 'Saving…' : 'Save'}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
