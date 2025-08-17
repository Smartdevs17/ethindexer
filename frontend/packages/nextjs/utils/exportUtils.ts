// Export utility functions for blockchain data

export interface ExportableBlock {
  id: string;
  number: number;
  hash: string;
  timestamp: string;
  transactions: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  difficulty: string;
  totalDifficulty: string;
  size: number;
  extraData: string;
  nonce: string;
  baseFeePerGas: string;
}

export interface FormattedBlock {
  'Block Number': number;
  'Block Hash': string;
  'Timestamp': string;
  'Transactions': number;
  'Gas Used': string;
  'Gas Limit': string;
  'Miner': string;
  'Difficulty': string;
  'Total Difficulty': string;
  'Size (bytes)': number;
  'Extra Data': string;
  'Nonce': string;
  'Base Fee Per Gas': string;
}

// Format block data for export
export const formatBlocksForExport = (blocks: ExportableBlock[]): FormattedBlock[] => {
  return blocks.map(block => ({
    'Block Number': block.number,
    'Block Hash': block.hash,
    'Timestamp': new Date(block.timestamp).toISOString(),
    'Transactions': block.transactions,
    'Gas Used': block.gasUsed,
    'Gas Limit': block.gasLimit,
    'Miner': block.miner,
    'Difficulty': block.difficulty,
    'Total Difficulty': block.totalDifficulty,
    'Size (bytes)': block.size,
    'Extra Data': block.extraData,
    'Nonce': block.nonce,
    'Base Fee Per Gas': block.baseFeePerGas,
  }));
};

// Export data as CSV
export const exportAsCSV = (data: any[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  downloadBlob(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
};

// Export data as JSON
export const exportAsJSON = (data: any[], filename: string): void => {
  if (data.length === 0) return;
  
  const jsonContent = JSON.stringify(data, null, 2);
  downloadBlob(jsonContent, `${filename}.json`, 'application/json;charset=utf-8;');
};

// Export data as Excel (XLSX) - using tab-separated format for Excel compatibility
export const exportAsExcel = (data: any[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const tsvContent = [
    headers.join('\t'),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape tabs and quotes
        if (typeof value === 'string' && (value.includes('\t') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join('\t')
    )
  ].join('\n');

  downloadBlob(tsvContent, `${filename}.xlsx`, 'application/vnd.ms-excel;charset=utf-8;');
};

// Helper function to download blob data
const downloadBlob = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Generate filename based on export scope and date
export const generateFilename = (scope: string, currentPage?: number): string => {
  const date = new Date().toISOString().split('T')[0];
  
  switch (scope) {
    case 'current':
      return `blocks-page-${currentPage || 1}-${date}`;
    case 'all':
      return `all-blocks-${date}`;
    case 'filtered':
      return `filtered-blocks-${date}`;
    default:
      return `blocks-${date}`;
  }
};
