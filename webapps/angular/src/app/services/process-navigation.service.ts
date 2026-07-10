import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ProcessNavigationService {
  fromKey: string | null = null;
  fromName: string | null = null;
  fromContext: 'definition' | 'instance' | null = null;
}
