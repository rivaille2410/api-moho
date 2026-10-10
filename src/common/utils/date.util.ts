export function formatDateVi(
  date: Date | null | undefined,
  empty = '—',
): string {
  return date ? date.toLocaleDateString('vi-VN') : empty;
}
