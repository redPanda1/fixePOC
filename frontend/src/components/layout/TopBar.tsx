import { useState, type MouseEvent } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { LOGOUT } from '../../store/authSlice';
import logo from '../../assets/fixe-logo.png';

export const DRAWER_WIDTH = 240;

export default function TopBar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const person = useAppSelector((state) => state.auth.person);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const fullName = person ? `${person.firstName} ${person.lastName}` : '';
  const initials = person ? `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}` : '';
  const roleLabel = person ? (person.userType === 'ADMIN' ? 'Administrator' : 'Member') : '';

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}>
          <Box onClick={handleOpenMenu} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
