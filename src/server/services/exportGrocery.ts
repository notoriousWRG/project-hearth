import type { GroceryItem } from '../../shared/types.js';

const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  protein: 'Protein',
  pantry: 'Pantry',
  dairy: 'Dairy',
  household: 'Household',
  other: 'Other',
};

export function formatGroceryAsText(items: GroceryItem[]): string {
  const unchecked = items.filter((i) => !i.checked);
  const grouped = new Map<string, string[]>();

  for (const item of unchecked) {
    const list = grouped.get(item.category);
    if (list) {
      list.push(item.name);
    } else {
      grouped.set(item.category, [item.name]);
    }
  }

  const lines: string[] = [];
  for (const [category, names] of grouped) {
    lines.push(CATEGORY_LABELS[category] ?? category);
    for (const name of names) {
      lines.push(`- ${name}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
