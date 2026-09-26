/**
 * Standard ActionResult type for all server actions.
 * Use this to return errors instead of throwing.
 *
 * @example
 * type Result = ActionResult<{ id: string; name: string }>;
 * return { success: true, data: { id: '123', name: 'John' } };
 * return { success: false, error: 'User not found' };
 */
export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string };
