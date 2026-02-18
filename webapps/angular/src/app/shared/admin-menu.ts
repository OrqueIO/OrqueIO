import {
  faTachometerAlt,
  faUsers,
  faUsersCog,
  faBuilding,
  faShieldAlt,
  faServer
} from '@fortawesome/free-solid-svg-icons';
import { NavMenuItem } from './navbar/navbar';

export const ADMIN_MENU_ITEMS: NavMenuItem[] = [
  {
    icon: faTachometerAlt,
    label: 'admin.menu.dashboard',
    route: '/admin',
    exact: true
  },
  {
    icon: faUsers,
    label: 'admin.menu.users',
    route: '/admin/users',
    exact: false
  },
  {
    icon: faUsersCog,
    label: 'admin.menu.groups',
    route: '/admin/groups',
    exact: false
  },
  {
    icon: faBuilding,
    label: 'admin.menu.tenants',
    route: '/admin/tenants',
    exact: false
  },
  {
    icon: faShieldAlt,
    label: 'admin.menu.authorizations',
    route: '/admin/authorizations',
    exact: false
  },
  {
    icon: faServer,
    label: 'admin.menu.system',
    route: '/admin/system',
    exact: false
  }
];
