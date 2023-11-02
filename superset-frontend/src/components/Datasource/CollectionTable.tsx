/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { ReactNode, useState, useCallback } from "react";
import shortid from 'shortid';

import { InfoTooltipWithTrigger } from '@superset-ui/chart-controls';
import { t, styled } from '@superset-ui/core';

import Button from 'src/components/Button';
import Icons from 'src/components/Icons';
import Fieldset from './Fieldset';
import { recurseReactClone } from './utils';

interface CRUDCollectionProps {
  allowAddItem?: boolean;
  allowDeletes?: boolean;
  collection: Array<object>;
  columnLabels?: object;
  columnLabelTooltips?: object;
  emptyMessage?: ReactNode;
  expandFieldset?: ReactNode;
  extraButtons?: ReactNode;
  itemGenerator?: () => any;
  itemCellProps?: ((
    val: unknown,
    label: string,
    record: any,
  ) => React.DetailedHTMLProps<
    React.TdHTMLAttributes<HTMLTableCellElement>,
    HTMLTableCellElement
  >)[];
  itemRenderers?: ((
    val: unknown,
    onChange: () => void,
    label: string,
    record: any,
  ) => ReactNode)[];
  onChange?: (arg0: any) => void;
  tableColumns: Array<any>;
  sortColumns: Array<string>;
  stickyHeader?: boolean;
}

type Sort = number | string | boolean | any;

enum SortOrder {
  asc = 1,
  desc = 2,
  unsort = 0,
}

interface CRUDCollectionState {
  collection: object;
  collectionArray: Array<object>;
  expandedColumns: object;
  sortColumn: string;
  sort: SortOrder;
}

function createCollectionArray(collection: object) {
  return Object.keys(collection).map(k => collection[k]);
}

function createKeyedCollection(arr: Array<object>) {
  const collectionArray = arr.map((o: any) => ({
    ...o,
    id: o.id || shortid.generate(),
  }));

  const collection = {};
  collectionArray.forEach((o: any) => {
    collection[o.id] = o;
  });

  return {
    collection,
    collectionArray,
  };
}

const CrudTableWrapper = styled.div<{ stickyHeader?: boolean }>`
  ${({ stickyHeader }) =>
    stickyHeader &&
    `
      height: 350px;
      overflow-y: auto;
      overflow-x: auto;

      .table {
        min-width: 800px;
      }
      thead th {
        background: #fff;
        position: sticky;
        top: 0;
        z-index: 9;
        min
      }
    `}
  ${({ theme }) => `
    th span {
      vertical-align: ${theme.gridUnit * -2}px;
    }
    .text-right {
      text-align: right;
    }
    .empty-collection {
      padding: ${theme.gridUnit * 2 + 2}px;
    }
    .tiny-cell {
      width: ${theme.gridUnit + 1}px;
    }
    i.fa-caret-down,
    i.fa-caret-up {
      width: ${theme.gridUnit + 1}px;
    }
    td.expanded {
      border-top: 0;
      padding: 0;
    }
  `}
`;

const CrudButtonWrapper = styled.div`
  text-align: right;
  ${({ theme }) => `margin-bottom: ${theme.gridUnit * 2}px`}
`;

const StyledButtonWrapper = styled.span`
  ${({ theme }) => `
    margin-top: ${theme.gridUnit * 3}px;
    margin-left: ${theme.gridUnit * 3}px;
  `}
`;

const CRUDCollection = (props: CRUDCollectionProps) => {
const { collection, collectionArray } = createKeyedCollection(
      props.collection,
    );

    const [expandedColumns, setExpandedColumns] = useState({});
    const [sortColumn, setSortColumn] = useState('');
    const [sort, setSort] = useState(0);
    const [collection, setCollection] = useState<object | undefined>(undefined);
    const [collectionArray, setCollectionArray] = useState<Array<object> | undefined>(undefined);

    const UNSAFE_componentWillReceivePropsHandler = useCallback((nextProps: CRUDCollectionProps) => {
    if (nextProps.collection !== props.collection) {
      const { collection, collectionArray } = createKeyedCollection(
        nextProps.collection,
      );
      setCollection(collection)
    setCollectionArray(collectionArray);
    }
  }, [collection, collectionArray]);
    const onCellChangeHandler = useCallback((id: number, col: string, val: boolean) => {
    changeCollectionHandler({
      ...collection,
      [id]: {
        ...collection[id],
        [col]: val,
      },
    });
  }, [collection]);
    const onAddItemHandler = useCallback(() => {
    if (props.itemGenerator) {
      let newItem = props.itemGenerator();
      if (!newItem.id) {
        newItem = { ...newItem, id: shortid.generate() };
      }
      changeCollectionHandler(collection, newItem);
    }
  }, [collection]);
    const onFieldsetChangeHandler = useCallback((item: any) => {
    changeCollectionHandler({
      ...collection,
      [item.id]: item,
    });
  }, [collection]);
    const getLabelHandler = useCallback((col: any) => {
    const { columnLabels } = props;
    let label = columnLabels?.[col] ? columnLabels[col] : col;
    if (label.startsWith('__')) {
      // special label-free columns (ie: caret for expand, delete cross)
      label = '';
    }
    return label;
  }, []);
    const getTooltipHandler = useCallback((col: string) => {
    const { columnLabelTooltips } = props;
    return columnLabelTooltips?.[col];
  }, []);
    const changeCollectionHandler = useCallback((collection: any, newItem?: object) => {
    setCollection(collection);
    if (props.onChange) {
      const collectionArray = collectionArray
        .map((c: { id: number }) => collection[c.id])
        // filter out removed items
        .filter(c => c !== undefined);

      if (newItem) {
        collectionArray.unshift(newItem);
      }
      props.onChange(collectionArray);
    }
  }, [collection, collectionArray]);
    const deleteItemHandler = useCallback((id: number) => {
    const newColl = { ...collection };
    delete newColl[id];
    changeCollectionHandler(newColl);
  }, [collection]);
    const effectiveTableColumnsHandler = useCallback(() => {
    const { tableColumns, allowDeletes, expandFieldset } = props;
    const cols = allowDeletes
      ? tableColumns.concat(['__actions'])
      : tableColumns;
    return expandFieldset ? ['__expand'].concat(cols) : cols;
  }, []);
    const toggleExpandHandler = useCallback((id: any) => {
    onCellChangeHandler(id, '__expanded', false);
    setStateHandler(prevState => ({
      expandedColumns: {
        ...prevState.expandedColumns,
        [id]: !prevState.expandedColumns[id],
      },
    }));
  }, []);
    const sortColumnHandler = useCallback((col: string, sort = SortOrder.unsort) => {
    const { sortColumns } = props;
    // default sort logic sorting string, boolean and number
    const compareSort = (m: Sort, n: Sort) => {
      if (typeof m === 'string') {
        return (m || ' ').localeCompare(n);
      }
      return m - n;
    };
    return () => {
      if (sortColumns?.includes(col)) {
        // display in unsorted order if no sort specified
        if (sort === SortOrder.unsort) {
          const { collection } = createKeyedCollection(props.collection);
          const collectionArray = createCollectionArray(collection);
          setCollectionArray(collectionArray)
    setSortColumn('')
    setSort(sort);
          return;
        }

        // newly ordered collection
        const sorted = [...collectionArray].sort(
          (a: object, b: object) => compareSort(a[col], b[col]),
        );
        const newCollection =
          sort === SortOrder.asc ? sorted : sorted.reverse();

        setStateHandler(prevState => ({
          ...prevState,
          collectionArray: newCollection,
          sortColumn: col,
          sort,
        }));
      }
    };
  }, [sort, collectionArray, collection]);
    const renderSortIconHandler = useCallback((col: string) => {
    if (sortColumn === col && sort === SortOrder.asc) {
      return <Icons.SortAsc onClick={sortColumn(col, 2)} />;
    }
    if (sortColumn === col && sort === SortOrder.desc) {
      return <Icons.SortDesc onClick={sortColumn(col, 0)} />;
    }
    return <Icons.Sort onClick={sortColumn(col, 1)} />;
  }, [sortColumn, sort]);
    const renderTHHandler = useCallback((col: string, sortColumns: Array<string>) => {
    const tooltip = getTooltipHandler(col);
    return (
      <th key={col} className="no-wrap">
        {getLabelHandler(col)}
        {tooltip && (
          <>
            {' '}
            <InfoTooltipWithTrigger
              label={t('description')}
              tooltip={tooltip}
            />
          </>
        )}
        {sortColumns?.includes(col) && renderSortIconHandler(col)}
      </th>
    );
  }, []);
    const renderHeaderRowHandler = useCallback(() => {
    const cols = effectiveTableColumnsHandler();
    const { allowDeletes, expandFieldset, extraButtons, sortColumns } =
      props;
    return (
      <thead>
        <tr>
          {expandFieldset && <th aria-label="Expand" className="tiny-cell" />}
          {cols.map(col => renderTHHandler(col, sortColumns))}
          {extraButtons}
          {allowDeletes && (
            <th key="delete-item" aria-label="Delete" className="tiny-cell" />
          )}
        </tr>
      </thead>
    );
  }, []);
    const renderExpandableSectionHandler = useCallback((item: any) => {
    const propsGenerator = () => ({ item, onChange: onFieldsetChangeHandler });
    return recurseReactClone(
      props.expandFieldset,
      Fieldset,
      propsGenerator,
    );
  }, []);
    const getCellPropsHandler = useCallback((record: any, col: any) => {
    const cellPropsFn = props.itemCellProps?.[col];
    const val = record[col];
    return cellPropsFn ? cellPropsFn(val, getLabelHandler(col), record) : {};
  }, []);
    const renderCellHandler = useCallback((record: any, col: any) => {
    const renderer = props.itemRenderers?.[col];
    const val = record[col];
    const onChange = onCellChangeHandler.bind(this, record.id, col);
    return renderer ? renderer(val, onChange, getLabelHandler(col), record) : val;
  }, []);
    const renderItemHandler = useCallback((record: any) => {
    const { allowAddItem, allowDeletes, expandFieldset, tableColumns } =
      props;
    /* eslint-disable no-underscore-dangle */
    const isExpanded =
      !!expandedColumns[record.id] || record.__expanded;
    let tds = [];
    if (expandFieldset) {
      tds.push(
        <td key="__expand" className="expand">
          <i
            role="button"
            aria-label="Toggle expand"
            tabIndex={0}
            className={`fa fa-caret-${
              isExpanded ? 'down' : 'right'
            } text-primary pointer`}
            onClick={toggleExpandHandler.bind(this, record.id)}
          />
        </td>,
      );
    }
    tds = tds.concat(
      tableColumns.map(col => (
        <td {...getCellPropsHandler(record, col)} key={col}>
          {renderCellHandler(record, col)}
        </td>
      )),
    );
    if (allowAddItem) {
      tds.push(<td key="add" />);
    }
    if (allowDeletes) {
      tds.push(
        <td
          key="__actions"
          data-test="crud-delete-option"
          className="text-primary"
        >
          <Icons.Trash
            aria-label="Delete item"
            className="pointer"
            data-test="crud-delete-icon"
            role="button"
            tabIndex={0}
            onClick={deleteItemHandler.bind(this, record.id)}
          />
        </td>,
      );
    }
    const trs = [
      <tr {...{ 'data-test': 'table-row' }} className="row" key={record.id}>
        {tds}
      </tr>,
    ];
    if (isExpanded) {
      trs.push(
        <tr className="exp" key={`exp__${record.id}`}>
          <td
            colSpan={effectiveTableColumnsHandler().length}
            className="expanded"
          >
            <div>{renderExpandableSectionHandler(record)}</div>
          </td>
        </tr>,
      );
    }
    return trs;
  }, [expandedColumns]);
    const renderEmptyCellHandler = useCallback(() => {
    return (
      <tr>
        <td className="empty-collection">{props.emptyMessage}</td>
      </tr>
    );
  }, []);
    const renderTableBodyHandler = useCallback(() => {
    const data = collectionArray;
    const content = data.length
      ? data.map(d => renderItemHandler(d))
      : renderEmptyCellHandler();
    return <tbody data-test="table-content-rows">{content}</tbody>;
  }, [collectionArray]);

    return (
      <>
        <CrudButtonWrapper>
          {props.allowAddItem && (
            <StyledButtonWrapper>
              <Button
                buttonSize="small"
                buttonStyle="tertiary"
                onClick={onAddItemHandler}
                data-test="add-item-button"
              >
                <i data-test="crud-add-table-item" className="fa fa-plus" />{' '}
                {t('Add item')}
              </Button>
            </StyledButtonWrapper>
          )}
        </CrudButtonWrapper>
        <CrudTableWrapper
          className="CRUD"
          stickyHeader={props.stickyHeader}
        >
          <table data-test="crud-table" className="table">
            {renderHeaderRowHandler()}
            {renderTableBodyHandler()}
          </table>
        </CrudTableWrapper>
      </>
    ); 
};

export default CRUDCollection;



