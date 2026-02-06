/**
 * Utility functions for exporting and printing table data
 */

/**
 * Converts table data to CSV format
 */
export function exportToCSV<T>(
  data: T[],
  columns: Array<{ id?: string; accessorKey?: string; header: string; cell?: (row: { original: T }) => any }>,
  filename: string
): void {
  // Extract headers (excluding actions column)
  const headers = columns
    .filter(col => col.id !== 'actions')
    .map(col => col.header);

  // Extract rows
  const rows = data.map(item => {
    return columns
      .filter(col => col.id !== 'actions')
      .map(col => {
        if (col.accessorKey) {
          const value = (item as any)[col.accessorKey];
          return value ?? '';
        } else if (col.id) {
          // Handle custom columns
          if (col.cell) {
            const cellValue = col.cell({ original: item } as any);
            // Extract text from React elements or return string
            if (typeof cellValue === 'string') {
              return cellValue;
            }
            // For complex cells, try to extract text content
            return '';
          }
          return '';
        }
        return '';
      });
  });

  // Convert to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        // Escape commas and quotes in cell values
        const cellStr = String(cell ?? '').replace(/"/g, '""');
        return `"${cellStr}"`;
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Extracts text content from table cells for CSV export
 */
function extractTextFromCell(cell: any): string {
  if (typeof cell === 'string' || typeof cell === 'number') {
    return String(cell);
  }
  if (cell === null || cell === undefined) {
    return '';
  }
  
  // Handle arrays (like React children)
  if (Array.isArray(cell)) {
    return cell.map(c => extractTextFromCell(c)).filter(Boolean).join(' ');
  }
  
  // For React elements or complex objects, try to extract meaningful text
  if (typeof cell === 'object') {
    // Check for common React element patterns
    if (cell.props) {
      const children = cell.props.children;
      if (children !== undefined) {
        return extractTextFromCell(children);
      }
    }
    
    // Check for specific data structures
    if (cell.original) {
      // This might be a row object, try to get meaningful data
      return '';
    }
    
    // Try to find text in object properties
    if (cell.textContent) {
      return cell.textContent;
    }
  }
  
  return '';
}

/**
 * Prints the table data
 */
export function printTable<T>(
  data: T[],
  columns: Array<{ id?: string; accessorKey?: string; header: string }>,
  title: string
): void {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('Failed to open print window');
    return;
  }

  // Extract headers
  const headers = columns
    .filter(col => col.id !== 'actions')
    .map(col => col.header);

  // Extract rows
  const rows = data.map(item => {
    return columns
      .filter(col => col.id !== 'actions')
      .map(col => {
        if (col.accessorKey) {
          const value = (item as any)[col.accessorKey];
          return value ?? '';
        }
        return '';
      });
  });

  // Create HTML table
  const tableHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            @page {
              margin: 1cm;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            h1 {
              margin-bottom: 10px;
            }
            .print-date {
              margin-bottom: 20px;
              color: #666;
            }
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="print-date">Printed on: ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => 
              `<tr>${row.map(cell => `<td>${String(cell ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(tableHTML);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
}
