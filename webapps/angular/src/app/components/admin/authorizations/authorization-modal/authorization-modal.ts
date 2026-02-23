import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUser, faUsers, faTimes, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe } from '../../../../i18n/translate.pipe';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap, of } from 'rxjs';
import { UserService } from '../../../../services/admin/user.service';
import { GroupService } from '../../../../services/admin/group.service';
import { User } from '../../../../models/admin/user.model';
import { Group } from '../../../../models/admin/group.model';
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
export class AuthorizationModalComponent implements OnInit, OnChanges, OnDestroy {
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

  // Autocomplete
  suggestions: Array<{ id: string; label: string }> = [];
  showSuggestions = false;
  isLoadingSuggestions = false;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private groupService: GroupService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupAutocomplete();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

    // Update identity control state when type changes
    this.form.get('type')?.valueChanges.subscribe((type) => {
      const identityControl = this.form.get('identityId');
      if (type === AUTHORIZATION_TYPE.GLOBAL) {
        identityControl?.setValue('*');
        identityControl?.disable();
        this.identityType = 'user';
      } else {
        identityControl?.enable();
      }
      identityControl?.updateValueAndValidity();
    });

    // Set initial disabled state based on current type
    if (auth?.type === AUTHORIZATION_TYPE.GLOBAL) {
      this.form.get('identityId')?.disable();
    }

    // Disable type field in edit mode (type cannot be changed after creation)
    if (auth?.id) {
      this.form.get('type')?.disable();
    }
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
    this.suggestions = [];
    this.showSuggestions = false;
  }

  private setupAutocomplete(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
      switchMap(searchTerm => {
        if (!searchTerm || searchTerm.length < 1) {
          return of([]);
        }
        this.isLoadingSuggestions = true;
        if (this.identityType === 'user') {
          return this.userService.getUsers({ idLike: `%${searchTerm}%`, maxResults: 10 });
        } else {
          return this.groupService.getGroups({ idLike: `%${searchTerm}%`, maxResults: 10 });
        }
      })
    ).subscribe({
      next: (results) => {
        this.isLoadingSuggestions = false;
        if (this.identityType === 'user') {
          this.suggestions = (results as User[]).map(u => ({
            id: u.id,
            label: u.firstName && u.lastName ? `${u.id} (${u.firstName} ${u.lastName})` : u.id
          }));
        } else {
          this.suggestions = (results as Group[]).map(g => ({
            id: g.id,
            label: g.name ? `${g.id} (${g.name})` : g.id
          }));
        }
        this.showSuggestions = this.suggestions.length > 0;
      },
      error: () => {
        this.isLoadingSuggestions = false;
        this.suggestions = [];
        this.showSuggestions = false;
      }
    });
  }

  onIdentityInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  selectSuggestion(suggestion: { id: string; label: string }): void {
    this.form.get('identityId')?.setValue(suggestion.id);
    this.showSuggestions = false;
    this.suggestions = [];
  }

  hideSuggestions(): void {
    // Delay to allow click on suggestion
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
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

    // Use getRawValue() to include disabled controls (identityId when GLOBAL)
    const formValue = this.form.getRawValue();
    // Ensure type is a number (select might return string in some cases)
    const typeValue = typeof formValue.type === 'string' ? parseInt(formValue.type, 10) : formValue.type;
    const request: CreateAuthorizationRequest = {
      type: typeValue as AuthorizationType,
      resourceType: this.resourceType as ResourceType,
      resourceId: formValue.resourceId,
      permissions: Array.from(this.selectedPermissions)
    };

    // For GLOBAL type, set userId to '*' (matching AngularJS behavior)
    // Otherwise, set the appropriate identity field
    if (this.isGlobalType) {
      request.userId = '*';
    } else if (this.identityType === 'user') {
      request.userId = formValue.identityId;
    } else {
      request.groupId = formValue.identityId;
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
