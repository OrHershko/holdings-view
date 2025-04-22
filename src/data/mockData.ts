import { NavItem, User } from '../types';

export const mockUser: User = {
  id: '1',
  name: 'Or',
  avatarUrl: 'https://img.freepik.com/free-psd/contact-icon-illustration-isolated_23-2151903337.jpg?t=st=1745326411~exp=1745330011~hmac=d71d7c11541d20acd7b0cb435800c8fd97b0dd47aa07bee47ff06269bd8f475a?auto=compress&cs=tinysrgb&w=100',
  accountType: 'Personal account'
};


export const mockNavItems: NavItem[] = [
  { id: 'home', name: 'Home', icon: 'home', path: '/' },
];