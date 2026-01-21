export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface UserProfile extends User {
  // Additional profile information
}

export interface UserCredentials {
  authenticatedUserPassword: string;
  password: string;
}

export interface CreateUserRequest {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}
