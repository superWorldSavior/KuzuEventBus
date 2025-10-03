import React from "react";

type Props = {
  results?: any[] | null;
};

export function PreviewTable({ results }: Props) {
  if (!results || results.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full text-xs text-gray-500">
        Aucune donnée de preview pour cet instant
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-auto p-3 bg-white" data-testid="preview-table">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-2 py-1 border-b border-gray-200">#</th>
            <th className="text-left px-2 py-1 border-b border-gray-200">Row</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr key={i} className="align-top">
              <td className="px-2 py-1 border-b border-gray-100 text-gray-500">{i + 1}</td>
              <td className="px-2 py-1 border-b border-gray-100">
                <pre className="whitespace-pre-wrap break-all text-[11px] leading-snug bg-gray-50 p-2 rounded border border-gray-100">{JSON.stringify(row, null, 2)}</pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
