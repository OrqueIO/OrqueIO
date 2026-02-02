/*
 * Copyright 2026 OrqueIO (https://www.orqueio.io/).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at:
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';

/**
 * Validation errors structure
 */
export interface ValidationErrors {
  name?: string;
  type?: string;
  value?: string;
}

/**
 * Variable for validation
 */
export interface ValidatableVariable {
  name: string;
  type: string;
  value: any;
  fixedName?: boolean;
  originalValue?: any;
  errors?: ValidationErrors;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  variables: ValidatableVariable[];
}

/**
 * Service for validating form variables.
 *
 * This service provides validation logic for task form variables,
 * including:
 * - Variable name validation (identifier rules, duplicates)
 * - Type-specific value validation
 * - Real-time validation support
 */
@Injectable({
  providedIn: 'root'
})
export class FormValidationService {
  // Valid identifier pattern (starts with letter or underscore, alphanumeric)
  private readonly IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  /**
   * Validate all variables in the form
   *
   * @param variables - Array of variables to validate
   * @returns ValidationResult with isValid flag and updated variables with errors
   */
  validateAll(variables: ValidatableVariable[]): ValidationResult {
    let isValid = true;
    const variableNames = new Set<string>();
    const validatedVariables = variables.map(v => ({ ...v, errors: {} as ValidationErrors }));

    for (const variable of validatedVariables) {
      // Skip validation for loaded variables with fixedName (they're already valid)
      if (variable.fixedName && variable.originalValue !== undefined) {
        if (variable.name) {
          variableNames.add(variable.name);
        }
        continue;
      }

      // Validate name
      const nameError = this.validateName(variable.name, variableNames);
      if (nameError) {
        variable.errors!.name = nameError;
        isValid = false;
      }

      if (variable.name) {
        variableNames.add(variable.name);
      }

      // Validate type
      if (!variable.type) {
        variable.errors!.type = 'tasklist.validation.typeRequired';
        isValid = false;
      }

      // Validate value based on type
      if (variable.type && variable.value !== undefined && variable.value !== null && variable.value !== '') {
        const valueError = this.validateValue(variable.value, variable.type);
        if (valueError) {
          variable.errors!.value = valueError;
          isValid = false;
        }
      }
    }

    return { isValid, variables: validatedVariables };
  }

  /**
   * Validate a single variable
   *
   * @param variable - The variable to validate
   * @param existingNames - Set of existing variable names (for duplicate check)
   * @param currentIndex - Index of current variable (to exclude from duplicate check)
   * @returns ValidationErrors object (empty if valid)
   */
  validateSingle(
    variable: ValidatableVariable,
    allVariables: ValidatableVariable[],
    currentIndex: number
  ): ValidationErrors {
    const errors: ValidationErrors = {};

    // Skip validation for loaded variables with fixedName
    if (variable.fixedName && variable.originalValue !== undefined) {
      return errors;
    }

    // Build set of other variable names
    const otherNames = new Set<string>();
    allVariables.forEach((v, i) => {
      if (i !== currentIndex && v.name) {
        otherNames.add(v.name);
      }
    });

    // Validate name (but only show error if name is provided)
    if (variable.name && variable.name.trim() !== '') {
      if (!this.IDENTIFIER_PATTERN.test(variable.name)) {
        errors.name = 'tasklist.validation.nameInvalid';
      } else if (otherNames.has(variable.name)) {
        errors.name = 'tasklist.validation.nameDuplicate';
      }
    }

    // Validate value based on type
    if (variable.type && variable.value !== undefined && variable.value !== null && variable.value !== '') {
      const valueError = this.validateValue(variable.value, variable.type);
      if (valueError) {
        errors.value = valueError;
      }
    }

    return errors;
  }

  /**
   * Validate variable name
   *
   * @param name - The name to validate
   * @param existingNames - Set of existing names (for duplicate check)
   * @returns Error message key or null if valid
   */
  validateName(name: string | undefined, existingNames: Set<string>): string | null {
    if (!name || name.trim() === '') {
      return 'tasklist.validation.nameRequired';
    }

    if (!this.IDENTIFIER_PATTERN.test(name)) {
      return 'tasklist.validation.nameInvalid';
    }

    if (existingNames.has(name)) {
      return 'tasklist.validation.nameDuplicate';
    }

    return null;
  }

  /**
   * Validate a value for a specific type
   *
   * @param value - The value to validate
   * @param type - The variable type
   * @returns Error message key or null if valid
   */
  validateValue(value: any, type: string): string | null {
    if (value === '' || value === null || value === undefined) {
      return null; // Empty values are allowed
    }

    switch (type) {
      case 'Integer':
      case 'Long':
      case 'Short':
        if (!Number.isInteger(Number(value))) {
          return 'tasklist.validation.integerRequired';
        }
        break;

      case 'Double':
        if (isNaN(Number(value))) {
          return 'tasklist.validation.numberRequired';
        }
        break;

      case 'Date':
        if (isNaN(Date.parse(value))) {
          return 'tasklist.validation.dateInvalid';
        }
        break;

      case 'Boolean':
        // Boolean values are always valid (true/false/string)
        break;

      case 'Object':
        // Object values should be valid JSON if string
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            return 'tasklist.validation.jsonInvalid';
          }
        }
        break;
    }

    return null;
  }

  /**
   * Check if a variable has any validation errors
   */
  hasErrors(errors: ValidationErrors | undefined): boolean {
    if (!errors) return false;
    return !!(errors.name || errors.type || errors.value);
  }

  /**
   * Check if any variable in the list has validation errors
   */
  hasAnyErrors(variables: ValidatableVariable[]): boolean {
    return variables.some(v => this.hasErrors(v.errors));
  }
}
