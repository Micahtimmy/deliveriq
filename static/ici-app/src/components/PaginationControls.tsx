import React from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  pageSizeOptions?: number[];
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#FAFBFC',
        borderTop: '1px solid #DFE1E6',
        borderRadius: '0 0 10px 10px',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '13px',
        color: '#42526E',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems}</strong> items
        </span>

        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#5E6C84' }}>Per Page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid #C1C7D0',
                fontSize: '12px',
                background: '#FFFFFF',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: '1px solid #DFE1E6',
            background: currentPage <= 1 ? '#F4F5F7' : '#FFFFFF',
            color: currentPage <= 1 ? '#A5ADBA' : '#0747A6',
            fontWeight: 600,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s ease',
          }}
        >
          ← Prev
        </button>

        <span style={{ padding: '0 6px', fontWeight: 600, color: '#172B4D' }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: '1px solid #DFE1E6',
            background: currentPage >= totalPages ? '#F4F5F7' : '#FFFFFF',
            color: currentPage >= totalPages ? '#A5ADBA' : '#0747A6',
            fontWeight: 600,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            transition: 'all 0.2s ease',
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};
