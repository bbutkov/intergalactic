import { DataTable } from '@semcore/ui/data-table';
import type { DataTableSort } from '@semcore/ui/data-table';
import React from 'react';

type Row = typeof data[number];

// fixed metric tracks narrower than caption + sort icon, after a flexible column with a space in its gtcWidth
const Demo = () => {
  const [sort, setSort] = React.useState<DataTableSort<keyof Row>>(['vol', 'desc']);
  const [showCpc, setShowCpc] = React.useState(true);
  const [rows, setRows] = React.useState(data);

  const columns = React.useMemo(
    () => [
      { name: 'keyword', children: 'Keyword', gtcWidth: 'minmax(200px, 1fr)', sortable: true },
      { name: 'kd', children: 'KD %', justifyContent: 'right' as const, gtcWidth: '50px', sortable: true, changeSortSize: true },
      ...(showCpc
        ? [{ name: 'cpc', children: 'CPC', justifyContent: 'right' as const, gtcWidth: '50px', sortable: true, changeSortSize: true }]
        : []),
      { name: 'vol', children: 'Vol.', justifyContent: 'right' as const, gtcWidth: '50px', sortable: true, changeSortSize: true },
    ],
    [showCpc],
  );

  return (
    <>
      <button type='button' onClick={() => setShowCpc((value) => !value)}>
        Toggle CPC
      </button>
      <button type='button' onClick={() => setRows((value) => [...value].reverse())}>
        Change data
      </button>
      <DataTable
        data={rows}
        sort={sort}
        onSortChange={setSort}
        columns={columns}
        aria-label='Change sort size with changing columns'
      />
    </>
  );
};

const data = [
  { keyword: 'ebay buy', kd: 77.8, cpc: 1.25, vol: 32500000 },
  { keyword: 'www.ebay.com', kd: 11.2, cpc: 3.4, vol: 65457920 },
  { keyword: 'www.ebay.com', kd: 10, cpc: 0.65, vol: 47354640 },
];

export default Demo;
