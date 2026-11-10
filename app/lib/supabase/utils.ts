/**
 * Fetches all rows from a Supabase query by automatically handling pagination.
 * Supabase has a default limit of 1,000 rows per request.
 */
export async function fetchAll<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  const allData: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allData.push(...(data as T[]));

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allData;
}
