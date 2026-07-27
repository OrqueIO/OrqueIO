import {
  faTachometerAlt,
  faProjectDiagram,
  faTable,
  faTasks,
  faLayerGroup,
  faBox,
  faCogs,
  faSearch,
  faWrench
} from '@fortawesome/free-solid-svg-icons';
import { NavMenuItem } from './navbar/navbar';

export const COCKPIT_MENU_ITEMS: NavMenuItem[] = [
  {
    icon: faTachometerAlt,
    label: 'cockpit.menu.dashboard',
    route: '/cockpit',
    exact: true
  },
  {
    icon: faProjectDiagram,
    label: 'cockpit.menu.processes',
    route: '/cockpit/processes',
    exact: false,
    subItems: [
      {
        icon: faCogs,
        label: 'cockpit.processes.tabs.definitions',
        route: '/cockpit/processes/definitions',
        exact: true
      },
      {
        icon: faSearch,
        label: 'cockpit.processes.tabs.searchInstances',
        route: '/cockpit/processes/search',
        exact: true
      }
    ]
  },
  {
    icon: faTable,
    label: 'cockpit.menu.decisions',
    route: '/cockpit/decisions',
    exact: false
  },
  {
    icon: faTasks,
    label: 'cockpit.menu.tasks',
    route: '/cockpit/tasks',
    exact: false
  }
];

export const COCKPIT_MORE_MENU_ITEMS: NavMenuItem[] = [
  {
    icon: faLayerGroup,
    label: 'cockpit.menu.batches',
    route: '/cockpit/batch',
    exact: false
  },
  {
    icon: faWrench,
    label: 'cockpit.menu.batchOperations',
    route: '/cockpit/batch/operations',
    exact: false
  },
  {
    icon: faBox,
    label: 'cockpit.menu.deployments',
    route: '/cockpit/deployments',
    exact: false
  }
];
