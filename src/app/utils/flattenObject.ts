export type DataGeneric = string | number | boolean | null;
export type FlattenedObject = [string, DataGeneric];

export function flattenObject(obj: Record<string, unknown>, parentKey = ''): FlattenedObject[] {
    let entries: FlattenedObject[] = [];

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            entries = entries.concat(flattenObject(value as Record<string, unknown>, fullKey));
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                    entries = entries.concat(flattenObject(item as Record<string, unknown>, `${fullKey}[${index}]`));
                }
            });
        } else {
            entries.push([fullKey, value as DataGeneric]);
        }
    }

    return entries;
}