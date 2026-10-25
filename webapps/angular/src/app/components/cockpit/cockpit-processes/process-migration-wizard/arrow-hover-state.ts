/**
 * Pure state machine for arrow hover logic.
 *
 * Prevents handle vibration by ensuring handles stay visible when:
 * - Arrow zone is hovered, OR
 * - Handle itself is hovered, OR
 * - Dragging is active
 *
 * Key rule: Entering a handle while the zone is being left does NOT hide handles.
 * Handles only hide when BOTH zone and handles are left AND no drag is active.
 */

export interface HoverState {
  /** Is the arrow zone (group) currently hovered? */
  zoneHovered: boolean;
  /** Is a handle currently hovered? */
  handleHovered: boolean;
  /** Is a drag operation in progress? */
  dragging: boolean;
}

/**
 * Determines if handles should be visible based on hover state.
 *
 * @param state Current hover state
 * @returns true if handles should be visible, false otherwise
 */
export function shouldShowHandles(state: HoverState): boolean {
  // Handles visible if: zone hovered, OR handle hovered, OR dragging
  return state.zoneHovered || state.handleHovered || state.dragging;
}

/**
 * State transition when entering the arrow zone (group).
 */
export function onZoneEnter(state: HoverState): HoverState {
  return {
    ...state,
    zoneHovered: true
  };
}

/**
 * State transition when leaving the arrow zone (group).
 * Note: This might fire when entering a handle, but handleHovered will be set.
 */
export function onZoneLeave(state: HoverState): HoverState {
  return {
    ...state,
    zoneHovered: false
  };
}

/**
 * State transition when entering a handle.
 */
export function onHandleEnter(state: HoverState): HoverState {
  return {
    ...state,
    handleHovered: true
  };
}

/**
 * State transition when leaving a handle.
 */
export function onHandleLeave(state: HoverState): HoverState {
  return {
    ...state,
    handleHovered: false
  };
}

/**
 * State transition when starting a drag.
 */
export function onDragStart(state: HoverState): HoverState {
  return {
    ...state,
    dragging: true
  };
}

/**
 * State transition when ending a drag.
 */
export function onDragEnd(state: HoverState): HoverState {
  return {
    ...state,
    dragging: false
  };
}
