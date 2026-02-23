import { QueryParams } from './query-params.model';

/**
 * Authorization types
 */
export const AUTHORIZATION_TYPE = {
  GLOBAL: 0,
  ALLOW: 1,
  DENY: 2
} as const;

export type AuthorizationType = typeof AUTHORIZATION_TYPE[keyof typeof AUTHORIZATION_TYPE];

/**
 * Authorization type labels for UI
 */
export const AUTHORIZATION_TYPE_LABELS: Record<AuthorizationType, string> = {
  [AUTHORIZATION_TYPE.GLOBAL]: 'AUTHORIZATION_GLOBAL',
  [AUTHORIZATION_TYPE.ALLOW]: 'AUTHORIZATION_ALLOW',
  [AUTHORIZATION_TYPE.DENY]: 'AUTHORIZATION_DENY'
};

/**
 * Resource types with their IDs
 */
export const RESOURCE_TYPE = {
  APPLICATION: 0,
  USER: 1,
  GROUP: 2,
  GROUP_MEMBERSHIP: 3,
  AUTHORIZATION: 4,
  FILTER: 5,
  PROCESS_DEFINITION: 6,
  TASK: 7,
  PROCESS_INSTANCE: 8,
  DEPLOYMENT: 9,
  DECISION_DEFINITION: 10,
  TENANT: 11,
  TENANT_MEMBERSHIP: 12,
  BATCH: 13,
  DECISION_REQUIREMENTS_DEFINITION: 14,
  OPERATION_LOG: 17,
  HISTORIC_TASK: 19,
  HISTORIC_PROCESS_INSTANCE: 20,
  SYSTEM: 21
} as const;

export type ResourceType = typeof RESOURCE_TYPE[keyof typeof RESOURCE_TYPE];

/**
 * Resource type information for UI display
 */
export interface ResourceTypeInfo {
  id: ResourceType;
  labelKey: string;
  permissions: string[];
}

/**
 * All resource types with their permissions
 */
export const RESOURCE_TYPES: ResourceTypeInfo[] = [
  {
    id: RESOURCE_TYPE.APPLICATION,
    labelKey: 'AUTHORIZATION_APPLICATION',
    permissions: ['ACCESS']
  },
  {
    id: RESOURCE_TYPE.USER,
    labelKey: 'AUTHORIZATION_USER',
    permissions: ['READ', 'UPDATE', 'CREATE', 'DELETE']
  },
  {
    id: RESOURCE_TYPE.GROUP,
    labelKey: 'AUTHORIZATION_GROUP',
    permissions: ['READ', 'UPDATE', 'CREATE', 'DELETE']
  },
  {
    id: RESOURCE_TYPE.GROUP_MEMBERSHIP,
    labelKey: 'AUTHORIZATION_GROUP_MEMBERSHIP',
    permissions: ['CREATE', 'DELETE']
  },
  {
    id: RESOURCE_TYPE.AUTHORIZATION,
    labelKey: 'AUTHORIZATION_AUTHORIZATION',
    permissions: ['READ', 'UPDATE', 'CREATE', 'DELETE']
  },
  {
    id: RESOURCE_TYPE.FILTER,
    labelKey: 'AUTHORIZATION_FILTER',
    permissions: ['CREATE', 'READ', 'UPDATE', 'DELETE']
  },
  {
    id: RESOURCE_TYPE.PROCESS_DEFINITION,
    labelKey: 'AUTHORIZATION_PROCESS_DEFINITION',
    permissions: [
      'READ', 'UPDATE', 'DELETE', 'SUSPEND',
      'CREATE_INSTANCE', 'READ_INSTANCE', 'UPDATE_INSTANCE',
      'RETRY_JOB', 'SUSPEND_INSTANCE', 'DELETE_INSTANCE', 'MIGRATE_INSTANCE',
      'READ_TASK', 'UPDATE_TASK', 'TASK_ASSIGN', 'TASK_WORK',
      'READ_TASK_VARIABLE', 'READ_HISTORY', 'READ_HISTORY_VARIABLE',
      'DELETE_HISTORY', 'READ_INSTANCE_VARIABLE', 'UPDATE_INSTANCE_VARIABLE',
      'UPDATE_TASK_VARIABLE', 'UPDATE_HISTORY'
    ]
  },
  {
    id: RESOURCE_TYPE.TASK,
    labelKey: 'AUTHORIZATION_TASK',
    permissions: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'TASK_ASSIGN', 'TASK_WORK', 'UPDATE_VARIABLE', 'READ_VARIABLE'
    ]
  },
  {
    id: RESOURCE_TYPE.PROCESS_INSTANCE,
    labelKey: 'AUTHORIZATION_PROCESS_INSTANCE',
    permissions: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'RETRY_JOB', 'SUSPEND', 'UPDATE_VARIABLE'
    ]
  },
  {
    id: RESOURCE_TYPE.DEPLOYMENT,
    labelKey: 'AUTHORIZATION_DEPLOYMENT',
    permissions: ['CREATE', 'READ', 'DELETE']
  },
  {
    id: RESOURCE_TYPE.DECISION_DEFINITION,
    labelKey: 'AUTHORIZATION_DECISION_DEFINITION',
    permissions: ['READ', 'UPDATE', 'CREATE_INSTANCE', 'READ_HISTORY', 'DELETE_HISTORY']
  },
  {
    id: RESOURCE_TYPE.TENANT,
    labelKey: 'AUTHORIZATION_TENANT',
    permissions: ['READ', 'UPDATE', 'CREATE', 'DELETE']
  },
  {
    id: RESOURCE_TYPE.TENANT_MEMBERSHIP,
    labelKey: 'AUTHORIZATION_TENANT_MEMBERSHIP',
    permissions: ['CREATE', 'DELETE']
  },
  {
    id: RESOURCE_TYPE.BATCH,
    labelKey: 'AUTHORIZATION_BATCH',
    permissions: [
      'READ', 'UPDATE', 'CREATE', 'DELETE',
      'READ_HISTORY', 'DELETE_HISTORY',
      'CREATE_BATCH_MIGRATE_PROCESS_INSTANCES',
      'CREATE_BATCH_MODIFY_PROCESS_INSTANCES',
      'CREATE_BATCH_RESTART_PROCESS_INSTANCES',
      'CREATE_BATCH_DELETE_RUNNING_PROCESS_INSTANCES',
      'CREATE_BATCH_DELETE_FINISHED_PROCESS_INSTANCES',
      'CREATE_BATCH_DELETE_DECISION_INSTANCES',
      'CREATE_BATCH_SET_JOB_RETRIES',
      'CREATE_BATCH_SET_REMOVAL_TIME',
      'CREATE_BATCH_SET_EXTERNAL_TASK_RETRIES',
      'CREATE_BATCH_UPDATE_PROCESS_INSTANCES_SUSPEND',
      'CREATE_BATCH_SET_VARIABLES'
    ]
  },
  {
    id: RESOURCE_TYPE.DECISION_REQUIREMENTS_DEFINITION,
    labelKey: 'AUTHORIZATION_DECISION_REQUIREMENTS_DEFINITION',
    permissions: ['READ']
  },
  {
    id: RESOURCE_TYPE.OPERATION_LOG,
    labelKey: 'AUTHORIZATION_OPERATION_LOG',
    permissions: ['READ', 'DELETE', 'UPDATE']
  },
  {
    id: RESOURCE_TYPE.HISTORIC_TASK,
    labelKey: 'AUTHORIZATION_HISTORIC_TASK',
    permissions: ['READ', 'READ_VARIABLE']
  },
  {
    id: RESOURCE_TYPE.HISTORIC_PROCESS_INSTANCE,
    labelKey: 'AUTHORIZATION_HISTORIC_PROCESS_INSTANCE',
    permissions: ['READ']
  },
  {
    id: RESOURCE_TYPE.SYSTEM,
    labelKey: 'AUTHORIZATION_SYSTEM',
    permissions: ['READ', 'SET', 'DELETE']
  }
];

/**
 * Get permissions for a specific resource type
 */
export function getPermissionsForResourceType(resourceType: ResourceType): string[] {
  const resource = RESOURCE_TYPES.find(r => r.id === resourceType);
  return resource?.permissions ?? [];
}

/**
 * Get resource type info by ID
 */
export function getResourceTypeInfo(resourceType: ResourceType): ResourceTypeInfo | undefined {
  return RESOURCE_TYPES.find(r => r.id === resourceType);
}

/**
 * Identity type for authorization
 */
export type IdentityType = 'user' | 'group';

/**
 * Authorization entity
 */
export interface Authorization {
  id?: string;
  type: AuthorizationType;
  resourceType: ResourceType;
  resourceId: string;
  permissions: string[];
  userId?: string;
  groupId?: string;
}

/**
 * Request to create an authorization
 */
export interface CreateAuthorizationRequest {
  type: AuthorizationType;
  resourceType: ResourceType;
  resourceId: string;
  permissions: string[];
  userId?: string;
  groupId?: string;
}

/**
 * Request to update an authorization
 * Note: Camunda API requires the full authorization object for updates
 * Only userId OR groupId should be provided, not both
 */
export interface UpdateAuthorizationRequest {
  id: string;
  type: AuthorizationType;
  resourceType: ResourceType;
  resourceId: string;
  permissions: string[];
  userId?: string;
  groupId?: string;
}

/**
 * Authorization check parameters
 */
export interface CheckAuthorizationParams {
  permissionName: string;
  resourceName: string;
  resourceType: ResourceType;
  resourceId?: string;
}

/**
 * Authorization check response
 */
export interface CheckAuthorizationResponse {
  permissionName: string;
  resourceName: string;
  resourceId: string;
  isAuthorized: boolean;
}

/**
 * Query parameters for authorization list
 */
export interface AuthorizationQueryParams extends QueryParams {
  id?: string;
  type?: AuthorizationType;
  userIdIn?: string;
  groupIdIn?: string;
  resourceType?: ResourceType;
  resourceId?: string;
}

/**
 * Format permissions for display
 * Returns 'ALL' if all permissions are granted, 'NONE' if empty, otherwise comma-separated list
 */
export function formatPermissions(permissions: string[], availablePermissions: string[]): string {
  if (!permissions || permissions.length === 0) {
    return 'NONE';
  }
  if (permissions.includes('ALL') ||
      (permissions.length === availablePermissions.length &&
       availablePermissions.every(p => permissions.includes(p)))) {
    return 'ALL';
  }
  return permissions.filter(p => p !== 'NONE').join(', ');
}

/**
 * Get identity info from authorization
 */
export function getIdentityInfo(auth: Authorization): { type: IdentityType; id: string } {
  if (auth.userId) {
    return { type: 'user', id: auth.userId };
  }
  if (auth.groupId) {
    return { type: 'group', id: auth.groupId };
  }
  return { type: 'user', id: '' };
}

/**
 * Normalize authorization data from API response
 * Ensures type and resourceType are numbers (API might return strings)
 */
export function normalizeAuthorization(auth: Authorization): Authorization {
  return {
    ...auth,
    type: typeof auth.type === 'string' ? parseInt(auth.type, 10) as AuthorizationType : auth.type,
    resourceType: typeof auth.resourceType === 'string' ? parseInt(auth.resourceType, 10) as ResourceType : auth.resourceType
  };
}
