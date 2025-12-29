import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser, faUsers, faTimes, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import {
  Authorization,
  CreateAuthorizationRequest,
  AUTHORIZATION_TYPE,
  AUTHORIZATION_TYPE_LABELS,
  AuthorizationType,
  ResourceType,
  getResourceTypeInfo
} from '../../../../models/admin/authorization.model';

@Component({
  selector: 'app-authorization-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, TranslatePipe],
  templateUrl: './authorization-modal.html',
  styleUrls: ['./authorization-modal.css']
})
export class AuthorizationModalComponent implements OnInit, OnChanges {
  @Input() authorization: Authorization | null = null;
  @Input() resourceType!: number;
  @Input() availablePermissions: string[] = [];

  @Output() save = new EventEmitter<CreateAuthorizationRequest>();
  @Output() cancel = new EventEmitter<void>();

  // Icons
  faUser = faUser;
  faUsers = faUsers;
  faTimes = faTimes;
  faCheck = faCheck;
  faExclamationTriangle = faExclamationTriangle;

  // Form
  form!: FormGroup;

  // Authorization types for dropdown
  authorizationTypes = [
    { value: AUTHORIZATION_TYPE.GLOBAL, labelKey: AUTHORIZATION_TYPE_LABELS[AUTHORIZATION_TYPE.GLOBAL] },
    { value: AUTHORIZATION_TYPE.ALLOW, labelKey: AUTHORIZATION_TYPE_LABELS[AUTHORIZATION_TYPE.ALLOW] },
    { value: AUTHORIZATION_TYPE.DENY, labelKey: AUTHORIZATION_TYPE_LABELS[AUTHORIZATION_TYPE.DENY] }
  ];

  // Identity type
  identityType: 'user' | 'group' = 'group';

  // Selected permissions
  selectedPermissions: Set<string> = new Set();

  // Show permissions dropdown
  showPermissionsDropdown = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['authorization'] || changes['availablePermissions']) {
      this.initForm();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.onCancel();
  }

  private initForm(): void {
    const auth = this.authorization;

    // Determine identity type
    if (auth?.userId) {
      this.identityType = 'user';
    } else {
      this.identityType = 'group';
    }

    // Initialize selected permissions
    this.selectedPermissions = new Set(auth?.permissions || ['ALL']);

    this.form = this.fb.group({
      type: [auth?.type ?? AUTHORIZATION_TYPE.ALLOW, Validators.required],
      identityId: [auth?.userId || auth?.groupId || '', this.identityRequiredValidator.bind(this)],
      resourceId: [auth?.resourceId || '*', Validators.required]
    });

    // Update identity validation when type changes
    this.form.get('type')?.valueChanges.subscribe((type) => {
      if (type === AUTHORIZATION_TYPE.GLOBAL) {
        this.form.get('identityId')?.setValue('*');
        this.identityType = 'user';
      }
      this.form.get('identityId')?.updateValueAndValidity();
    });
  }

  private identityRequiredValidator(control: any): { [key: string]: boolean } | null {
    const type = this.form?.get('type')?.value;
    if (type === AUTHORIZATION_TYPE.GLOBAL) {
      return null; // Not required for GLOBAL
    }
    return control.value ? null : { required: true };
  }

  get isGlobalType(): boolean {
    return this.form?.get('type')?.value === AUTHORIZATION_TYPE.GLOBAL;
  }

  get isEditMode(): boolean {
    return !!this.authorization?.id;
  }

  get resourceTypeInfo() {
    return getResourceTypeInfo(this.resourceType as ResourceType);
  }

  get formattedPermissions(): string {
    if (this.selectedPermissions.has('ALL')) {
      return 'ALL';
    }
    if (this.selectedPermissions.size === 0) {
      return 'NONE';
    }
    return Array.from(this.selectedPermissions).join(', ');
  }

  get showUserWarning(): boolean {
    return this.identityType === 'user' && !this.isGlobalType;
  }

  toggleIdentityType(): void {
    this.identityType = this.identityType === 'user' ? 'group' : 'user';
    this.form.get('identityId')?.setValue('');
  }

  togglePermission(permission: string): void {
    if (permission === 'ALL') {
      if (this.selectedPermissions.has('ALL')) {
        // Expand ALL to individual permissions
        this.selectedPermissions.clear();
        this.availablePermissions.forEach(p => this.selectedPermissions.add(p));
      } else {
        // Set ALL
        this.selectedPermissions.clear();
        this.selectedPermissions.add('ALL');
      }
    } else {
      // Remove ALL if present
      this.selectedPermissions.delete('ALL');

      if (this.selectedPermissions.has(permission)) {
        this.selectedPermissions.delete(permission);
      } else {
        this.selectedPermissions.add(permission);
      }

      // Check if all permissions are now selected
      if (this.selectedPermissions.size === this.availablePermissions.length &&
          this.availablePermissions.every(p => this.selectedPermissions.has(p))) {
        this.selectedPermissions.clear();
        this.selectedPermissions.add('ALL');
      }
    }
  }

  selectAllPermissions(): void {
    this.selectedPermissions.clear();
    this.selectedPermissions.add('ALL');
  }

  clearAllPermissions(): void {
    this.selectedPermissions.clear();
  }

  isPermissionSelected(permission: string): boolean {
    return this.selectedPermissions.has(permission) || this.selectedPermissions.has('ALL');
  }

  togglePermissionsDropdown(): void {
    this.showPermissionsDropdown = !this.showPermissionsDropdown;
  }

  closePermissionsDropdown(): void {
    this.showPermissionsDropdown = false;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.selectedPermissions.size === 0) {
      return;
    }

    const formValue = this.form.value;
    const request: CreateAuthorizationRequest = {
      type: formValue.type,
      resourceType: this.resourceType as ResourceType,
      resourceId: formValue.resourceId,
      permissions: Array.from(this.selectedPermissions)
    };

    if (!this.isGlobalType) {
      if (this.identityType === 'user') {
        request.userId = formValue.identityId;
      } else {
        request.groupId = formValue.identityId;
      }
    }

    this.save.emit(request);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }
}
