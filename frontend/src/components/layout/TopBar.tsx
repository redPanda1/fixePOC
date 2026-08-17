import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { LOGOUT } from '../../store/authSlice';
import { fetchThreads } from '../../store/actionQueueSlice';
import logo from '../../assets/fixe-logo.png';

export const DRAWER_WIDTH = 240;

export default function TopBar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const person = useAppSelector((state) => state.auth.person);
  const threads = useAppSelector((state) => state.actionQueue.items);
  const threadsListStatus = useAppSelector((state) => state.actionQueue.listStatus);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const fullName = person ? `${person.firstName} ${person.lastName}` : '';
  const initials = person ? `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}` : '';
  const isAdmin = person?.userType === 'ADMIN';
  const roleLabel = person ? (isAdmin ? 'Administrator' : 'Member') : '';

  useEffect(() => {
    if (threadsListStatus === 'idle') {
      void dispatch(fetchThreads());
    }
  }, [dispatch, threadsListStatus]);

  const attentionCount = useMemo(() => {
    if (isAdmin) {
      return threads.filter((thread) => thread.status === 'waiting_on_internal').length;
    }
    return threads.filter((thread) => thread.status !== 'complete' && thread.status !== 'archived').length;
  }, [threads, isAdmin]);

  const handleAlertClick = () => {
    navigate(isAdmin ? '/action-queue?filter=waiting_on_internal' : '/action-queue?filter=open');
  };

  const handleOpenMenu = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);
  const handleEditProfile = () => {
    handleCloseMenu();
    navigate('/profile');
  };
  const handleLogout = () => {
    handleCloseMenu();
    dispatch(LOGOUT());
  };

  return (
    <AppBar
      position="fixed"
      sx={{ width: `calc(100% - ${DRAWER_WIDTH}px)`, ml: `${DRAWER_WIDTH}px` }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <img src={logo} alt="FIXE" height={28} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={handleAlertClick} color="inherit" aria-label="Action Queue items needing attention">
            <Badge badgeContent={attentionCount} color="error">
              <NotificationsOutlinedIcon />
            </Badge>
          </IconButton>
          <Box onClick={handleOpenMenu} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {fullName}
              </Typography>
              {roleLabel && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {roleLabel}
                </Typography>
              )}
            </Box>
            <Avatar
              src={person?.avatarUrl ?? undefined}
              sx={{ bgcolor: '#38d29f', color: '#132030', width: 36, height: 36 }}
            >
              {initials}
            </Avatar>
          </Box>
        </Box>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
          <MenuItem disabled>{person?.email}</MenuItem>
          <Divider />
          <MenuItem onClick={handleEditProfile}>
            <ListItemIcon>
              <PersonOutlineOutlinedIcon fontSize="small" />
            </ListItemIcon>
            Edit profile
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutOutlinedIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
