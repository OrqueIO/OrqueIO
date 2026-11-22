/**
 * Event Trigger Rules for BPMN Migration
 *
 * Determines whether an activity has a persistent event trigger and how the
 * updateEventTrigger flag should be handled during migration.
 *
 * Based on Camunda 7 engine's UpdateEventTriggersValidator and migration semantics.
 */

export interface EventTriggerState {
  available: boolean;
  checkedByDefault: boolean;
  forced: boolean;
  unavailableReason?: 'noMessageRef' | 'noPersistentTrigger' | null;
}

/**
 * @param element
 * @returns
 */
export function getEventTriggerState(element: Element | null): EventTriggerState {
  const unavailable: EventTriggerState = { available: false, checkedByDefault: false, forced: false, unavailableReason: null };

  if (!element) {
    return unavailable;
  }

  try {
    const tagName = element.tagName;

    if (tagName.includes('receiveTask')) {
      const messageRef = element.getAttribute('messageRef');
      const hasMessageRef = !!messageRef && messageRef.trim() !== '';

      if (!hasMessageRef) {
        return {
          available: false,
          checkedByDefault: false,
          forced: false,
          unavailableReason: 'noMessageRef'
        };
      }

      return {
        available: true,
        checkedByDefault: true,
        forced: false,
        unavailableReason: null
      };
    }

    if (tagName.includes('boundaryEvent') || tagName.includes('intermediateCatchEvent')) {
      const hasTimer = !!element.querySelector('timerEventDefinition');
      const hasMessage = !!element.querySelector('messageEventDefinition');
      const hasSignal = !!element.querySelector('signalEventDefinition');
      const hasConditional = !!element.querySelector('conditionalEventDefinition');

      if (hasMessage) {
        return {
          available: true,
          checkedByDefault: true,
          forced: false,
          unavailableReason: null
        };
      }

      if (hasTimer || hasSignal) {
        return {
          available: true,
          checkedByDefault: false,
          forced: false,
          unavailableReason: null
        };
      }

      if (hasConditional) {
        return {
          available: true,
          checkedByDefault: true,
          forced: true,
          unavailableReason: null
        };
      }

      return {
        available: false,
        checkedByDefault: false,
        forced: false,
        unavailableReason: 'noPersistentTrigger'
      };
    }

    if (tagName.includes('startEvent')) {
      const parentSubProcess = element.parentElement;
      if (parentSubProcess?.tagName.includes('subProcess')) {
        const triggeredByEvent = parentSubProcess.getAttribute('triggeredByEvent');
        if (triggeredByEvent === 'true') {
          const hasTimer = !!element.querySelector('timerEventDefinition');
          const hasMessage = !!element.querySelector('messageEventDefinition');
          const hasSignal = !!element.querySelector('signalEventDefinition');
          const hasConditional = !!element.querySelector('conditionalEventDefinition');

          if (hasMessage) {
            return {
              available: true,
              checkedByDefault: true,
              forced: false,
              unavailableReason: null
            };
          }

          if (hasTimer || hasSignal) {
            return {
              available: true,
              checkedByDefault: false,
              forced: false,
              unavailableReason: null
            };
          }

          if (hasConditional) {
            return {
              available: true,
              checkedByDefault: true,
              forced: true,
              unavailableReason: null
            };
          }

          return {
            available: false,
            checkedByDefault: false,
            forced: false,
            unavailableReason: 'noPersistentTrigger'
          };
        }
      }

      return unavailable;
    }

    if (tagName.includes('userTask')) {
      const extensionElements = element.querySelector('extensionElements');
      if (extensionElements) {
        const taskListeners = extensionElements.querySelectorAll('*');
        for (let i = 0; i < taskListeners.length; i++) {
          const listener = taskListeners[i];
          if (listener.tagName.includes('taskListener')) {
            const eventAttr = listener.getAttribute('event');
            if (eventAttr === 'timeout') {
              return {
                available: true,
                checkedByDefault: false,
                forced: false,
                unavailableReason: null
              };
            }
          }
        }
      }

      return unavailable;
    }

    return unavailable;

  } catch (e) {
    return unavailable;
  }
}
