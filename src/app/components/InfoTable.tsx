import type React from 'react';
import type { FlattenedObject } from '../utils/flattenObject';

export const InfoTable: React.FC<{
  data: FlattenedObject[];
}> = ({ data }) => {
  if (data?.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left border border-gray-300">
        <thead className="font-semibold">
          <tr>
            <th className="p-2 border-b">Field</th>
            <th className="p-2 border-b">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map(([field, value]) => (
            <tr
              key={field}
              className="border-t hover:bg-gray-50 hover:text-black"
            >
              <td className="p-2 border-r font-mono">{field}</td>
              <td className="p-2">{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
