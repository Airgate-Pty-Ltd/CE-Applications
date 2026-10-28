import { normalizeArray, analyzeForeignKeys } from '../backend/src/services/dbIntrospectService.js';

describe('normalizeArray', () => {
  test('handles postgres text array string', () => {
    expect(normalizeArray('{"a","b"}')).toEqual(['a', 'b']);
  });

  test('handles JSON array string', () => {
    expect(normalizeArray('["x","y"]')).toEqual(['x', 'y']);
  });

  test('handles native arrays', () => {
    expect(normalizeArray(['foo', 'bar'])).toEqual(['foo', 'bar']);
  });

  test('handles scalar values', () => {
    expect(normalizeArray('single')).toEqual(['single']);
  });

  test('handles null', () => {
    expect(normalizeArray(null)).toEqual([]);
  });
});

describe('analyzeForeignKeys', () => {
  test('returns no issues when FK references exist with matching types', () => {
    const fkRows = [
      {
        constraint_name: 'fk_example',
        table_name: { schema: 'public', name: 'child' },
        columns: ['parent_id'],
        foreign_table_name: { schema: 'public', name: 'parent' },
        foreign_columns: ['id']
      }
    ];

    const columnMap = new Map([
      [
        'public.child',
        new Map([
          ['parent_id', { data_type: 'uuid' }]
        ])
      ],
      [
        'public.parent',
        new Map([
          ['id', { data_type: 'uuid' }]
        ])
      ]
    ]);

    const pkUniqueMap = new Map([
      [
        'parent::parent_pkey',
        { columns: ['id'] }
      ]
    ]);

    const creationOrder = {
      parent: 0,
      child: 1
    };

    const result = analyzeForeignKeys(fkRows, columnMap, pkUniqueMap, creationOrder);
    expect(result.missingReferencedColumns).toHaveLength(0);
    expect(result.mismatchedTypes).toHaveLength(0);
    expect(result.missingReferencedUnique).toHaveLength(0);
    expect(result.creationOrderHazards).toHaveLength(0);
  });
});

