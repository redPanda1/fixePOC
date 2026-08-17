import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { NavLink } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';

export default function SideMenu() {
  const person = useAppSelector((state) => state.auth.person);
  const isAdmin = person?.userType === 'ADMIN';

  const navItems = isAdmin
    ? [
        { label: 'Dashboard', to: '/', icon: <DashboardOutlinedIcon /> },
        { label: 'Chat', to: '/chat', icon: <ChatOutlinedIcon /> },
        { label: 'Receipts', to: '/receipts', icon: <ReceiptLongOutlinedIcon /> },
      ]
    : [{ label: 'Dashboard', to: '/dashboard', icon: <DashboardOutlinedIcon /> }];

  return (
    <List sx={{ px: 1, py: 2 }}>
      {navItems.map((item) => (
        <ListItemButton
          key={item.to}
          component={NavLink}
          to={item.to}
          end={item.to === '/'}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            color: 'rgba(255, 255, 255, 0.85)',
            '&.active': {
              bgcolor: 'rgba(56, 210, 159, 0.16)',
              color: '#38d29f',
              '& .MuiListItemIcon-root': { color: '#38d29f' },
            },
          }}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  );
}
