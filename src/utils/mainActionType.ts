export function mainActionType(action: string | undefined | null): string {
  if (!action) return '';
  return action.split(' ')[0];
}