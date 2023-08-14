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


import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { PivotData, flatKey } from './utilities';
import { Styles } from './Styles';

const parseLabel = value => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return String(value);
};

function displayHeaderCell(
  needToggle,
  ArrowIcon,
  onArrowClick,
  value,
  namesMapping,
) {
  const name = namesMapping[value] || value;
  return needToggle ? (
    <span className="toggle-wrapper">
      <span
        role="button"
        tabIndex="0"
        className="toggle"
        onClick={onArrowClick}
      >
        {ArrowIcon}
      </span>
      <span className="toggle-val">{parseLabel(name)}</span>
    </span>
  ) : (
    parseLabel(name)
  );
}

export export const TableRenderer = (props) => {


    const [collapsedRows, setCollapsedRows] = useState({});
    const [collapsedCols, setCollapsedCols] = useState({});

    const getBasePivotSettingsHandler = useCallback(() => {
    // One-time extraction of pivot settings that we'll use throughout the render.

    
    const colAttrs = props.cols;
    const rowAttrs = props.rows;

    const tableOptions = {
      rowTotals: true,
      colTotals: true,
      ...props.tableOptions,
    };
    const rowTotals = tableOptions.rowTotals || colAttrs.length === 0;
    const colTotals = tableOptions.colTotals || rowAttrs.length === 0;

    const namesMapping = props.namesMapping || {};
    const subtotalOptions = {
      arrowCollapsed: '\u25B2',
      arrowExpanded: '\u25BC',
      ...props.subtotalOptions,
    };

    const colSubtotalDisplay = {
      displayOnTop: false,
      enabled: rowTotals,
      hideOnExpand: false,
      ...subtotalOptions.colSubtotalDisplay,
    };

    const rowSubtotalDisplay = {
      displayOnTop: false,
      enabled: colTotals,
      hideOnExpand: false,
      ...subtotalOptions.rowSubtotalDisplay,
    };

    const pivotData = new PivotData(props, {
      rowEnabled: rowSubtotalDisplay.enabled,
      colEnabled: colSubtotalDisplay.enabled,
      rowPartialOnTop: rowSubtotalDisplay.displayOnTop,
      colPartialOnTop: colSubtotalDisplay.displayOnTop,
    });
    const rowKeys = pivotData.getRowKeys();
    const colKeys = pivotData.getColKeys();

    // Also pre-calculate all the callbacks for cells, etc... This is nice to have to
    // avoid re-calculations of the call-backs on cell expansions, etc...
    const cellCallbacks = {};
    const rowTotalCallbacks = {};
    const colTotalCallbacks = {};
    let grandTotalCallback = null;
    if (tableOptions.clickCallback) {
      rowKeys.forEach(rowKey => {
        const flatRowKey = flatKey(rowKey);
        if (!(flatRowKey in cellCallbacks)) {
          cellCallbacks[flatRowKey] = {};
        }
        colKeys.forEach(colKey => {
          cellCallbacks[flatRowKey][flatKey(colKey)] = clickHandlerHandler(
            pivotData,
            rowKey,
            colKey,
          );
        });
      });

      // Add in totals as well.
      if (rowTotals) {
        rowKeys.forEach(rowKey => {
          rowTotalCallbacks[flatKey(rowKey)] = clickHandlerHandler(
            pivotData,
            rowKey,
            [],
          );
        });
      }
      if (colTotals) {
        colKeys.forEach(colKey => {
          colTotalCallbacks[flatKey(colKey)] = clickHandlerHandler(
            pivotData,
            [],
            colKey,
          );
        });
      }
      if (rowTotals && colTotals) {
        grandTotalCallback = clickHandlerHandler(pivotData, [], []);
      }
    }

    return {
      pivotData,
      colAttrs,
      rowAttrs,
      colKeys,
      rowKeys,
      rowTotals,
      colTotals,
      arrowCollapsed: subtotalOptions.arrowCollapsed,
      arrowExpanded: subtotalOptions.arrowExpanded,
      colSubtotalDisplay,
      rowSubtotalDisplay,
      cellCallbacks,
      rowTotalCallbacks,
      colTotalCallbacks,
      grandTotalCallback,
      namesMapping,
    };
  }, []);
    const clickHandlerHandler = useCallback((pivotData, rowValues, colValues) => {
    const colAttrs = props.cols;
    const rowAttrs = props.rows;
    const value = pivotData.getAggregator(rowValues, colValues).value();
    const filters = {};
    const colLimit = Math.min(colAttrs.length, colValues.length);
    for (let i = 0; i < colLimit; i += 1) {
      const attr = colAttrs[i];
      if (colValues[i] !== null) {
        filters[attr] = colValues[i];
      }
    }
    const rowLimit = Math.min(rowAttrs.length, rowValues.length);
    for (let i = 0; i < rowLimit; i += 1) {
      const attr = rowAttrs[i];
      if (rowValues[i] !== null) {
        filters[attr] = rowValues[i];
      }
    }
    return e =>
      props.tableOptions.clickCallback(e, value, filters, pivotData);
  }, []);
    const clickHeaderHandlerHandler = useCallback((
    pivotData,
    values,
    attrs,
    attrIdx,
    callback,
    isSubtotal = false,
    isGrandTotal = false,
  ) => {
    const filters = {};
    for (let i = 0; i <= attrIdx; i += 1) {
      const attr = attrs[i];
      filters[attr] = values[i];
    }
    return e =>
      callback(
        e,
        values[attrIdx],
        filters,
        pivotData,
        isSubtotal,
        isGrandTotal,
      );
  }, []);
    const collapseAttrHandler = useCallback((rowOrCol, attrIdx, allKeys) => {
    return e => {
      // Collapse an entire attribute.
      e.stopPropagation();
      const keyLen = attrIdx + 1;
      const collapsed = allKeys.filter(k => k.length === keyLen).map(flatKey);

      const updates = {};
      collapsed.forEach(k => {
        updates[k] = true;
      });

      if (rowOrCol) {
        setCollapsedRows({ ...state.collapsedRows, ...updates });
      } else {
        setCollapsedCols({ ...state.collapsedCols, ...updates });
      }
    };
  }, []);
    const expandAttrHandler = useCallback((rowOrCol, attrIdx, allKeys) => {
    return e => {
      // Expand an entire attribute. This implicitly implies expanding all of the
      // parents as well. It's a bit inefficient but ah well...
      e.stopPropagation();
      const updates = {};
      allKeys.forEach(k => {
        for (let i = 0; i <= attrIdx; i += 1) {
          updates[flatKey(k.slice(0, i + 1))] = false;
        }
      });

      if (rowOrCol) {
        setCollapsedRows({ ...state.collapsedRows, ...updates });
      } else {
        setCollapsedCols({ ...state.collapsedCols, ...updates });
      }
    };
  }, []);
    const toggleRowKeyHandler = useCallback((flatRowKey) => {
    return e => {
      e.stopPropagation();
      setCollapsedRows({
          ...state.collapsedRows,
          [flatRowKey]: !state.collapsedRows[flatRowKey],
        });
    set[flatRowKey](!state.collapsedRows[flatRowKey]);
    };
  }, []);
    const toggleColKeyHandler = useCallback((flatColKey) => {
    return e => {
      e.stopPropagation();
      setCollapsedCols({
          ...state.collapsedCols,
          [flatColKey]: !state.collapsedCols[flatColKey],
        });
    set[flatColKey](!state.collapsedCols[flatColKey]);
    };
  }, []);
    const calcAttrSpansHandler = useCallback((attrArr, numAttrs) => {
    // Given an array of attribute values (i.e. each element is another array with
    // the value at every level), compute the spans for every attribute value at
    // every level. The return value is a nested array of the same shape. It has
    // -1's for repeated values and the span number otherwise.

    const spans = [];
    // Index of the last new value
    const li = Array(numAttrs).map(() => 0);
    let lv = Array(numAttrs).map(() => null);
    for (let i = 0; i < attrArr.length; i += 1) {
      // Keep increasing span values as long as the last keys are the same. For
      // the rest, record spans of 1. Update the indices too.
      const cv = attrArr[i];
      const ent = [];
      let depth = 0;
      const limit = Math.min(lv.length, cv.length);
      while (depth < limit && lv[depth] === cv[depth]) {
        ent.push(-1);
        spans[li[depth]][depth] += 1;
        depth += 1;
      }
      while (depth < cv.length) {
        li[depth] = i;
        ent.push(1);
        depth += 1;
      }
      spans.push(ent);
      lv = cv;
    }
    return spans;
  }, []);
    const renderColHeaderRowHandler = useCallback((attrName, attrIdx, pivotSettings) => {
    // Render a single row in the column header at the top of the pivot table.

    const {
      rowAttrs,
      colAttrs,
      colKeys,
      visibleColKeys,
      colAttrSpans,
      rowTotals,
      arrowExpanded,
      arrowCollapsed,
      colSubtotalDisplay,
      maxColVisible,
      pivotData,
      namesMapping,
    } = pivotSettings;
    const {
      highlightHeaderCellsOnHover,
      omittedHighlightHeaderGroups = [],
      highlightedHeaderCells,
      dateFormatters,
    } = props.tableOptions;

    const spaceCell =
      attrIdx === 0 && rowAttrs.length !== 0 ? (
        <th
          key="padding"
          colSpan={rowAttrs.length}
          rowSpan={colAttrs.length}
          aria-hidden="true"
        />
      ) : null;

    const needToggle =
      colSubtotalDisplay.enabled && attrIdx !== colAttrs.length - 1;
    let arrowClickHandle = null;
    let subArrow = null;
    if (needToggle) {
      arrowClickHandle =
        attrIdx + 1 < maxColVisible
          ? collapseAttrHandler(false, attrIdx, colKeys)
          : expandAttrHandler(false, attrIdx, colKeys);
      subArrow = attrIdx + 1 < maxColVisible ? arrowExpanded : arrowCollapsed;
    }
    const attrNameCell = (
      <th key="label" className="pvtAxisLabel">
        {displayHeaderCell(
          needToggle,
          subArrow,
          arrowClickHandle,
          attrName,
          namesMapping,
        )}
      </th>
    );

    const attrValueCells = [];
    const rowIncrSpan = rowAttrs.length !== 0 ? 1 : 0;
    // Iterate through columns. Jump over duplicate values.
    let i = 0;
    while (i < visibleColKeys.length) {
      const colKey = visibleColKeys[i];
      const colSpan = attrIdx < colKey.length ? colAttrSpans[i][attrIdx] : 1;
      let colLabelClass = 'pvtColLabel';
      if (attrIdx < colKey.length) {
        if (
          highlightHeaderCellsOnHover &&
          !omittedHighlightHeaderGroups.includes(colAttrs[attrIdx])
        ) {
          colLabelClass += ' hoverable';
        }
        if (
          highlightedHeaderCells &&
          Array.isArray(highlightedHeaderCells[colAttrs[attrIdx]]) &&
          highlightedHeaderCells[colAttrs[attrIdx]].includes(colKey[attrIdx])
        ) {
          colLabelClass += ' active';
        }

        const rowSpan = 1 + (attrIdx === colAttrs.length - 1 ? rowIncrSpan : 0);
        const flatColKey = flatKey(colKey.slice(0, attrIdx + 1));
        const onArrowClick = needToggle ? toggleColKeyHandler(flatColKey) : null;

        const headerCellFormattedValue =
          dateFormatters &&
          dateFormatters[attrName] &&
          typeof dateFormatters[attrName] === 'function'
            ? dateFormatters[attrName](colKey[attrIdx])
            : colKey[attrIdx];
        attrValueCells.push(
          <th
            className={colLabelClass}
            key={`colKey-${flatColKey}`}
            colSpan={colSpan}
            rowSpan={rowSpan}
            onClick={clickHeaderHandlerHandler(
              pivotData,
              colKey,
              props.cols,
              attrIdx,
              props.tableOptions.clickColumnHeaderCallback,
            )}
          >
            {displayHeaderCell(
              needToggle,
              collapsedCols[flatColKey]
                ? arrowCollapsed
                : arrowExpanded,
              onArrowClick,
              headerCellFormattedValue,
              namesMapping,
            )}
          </th>,
        );
      } else if (attrIdx === colKey.length) {
        const rowSpan = colAttrs.length - colKey.length + rowIncrSpan;
        attrValueCells.push(
          <th
            className={`${colLabelClass} pvtSubtotalLabel`}
            key={`colKeyBuffer-${flatKey(colKey)}`}
            colSpan={colSpan}
            rowSpan={rowSpan}
            onClick={clickHeaderHandlerHandler(
              pivotData,
              colKey,
              props.cols,
              attrIdx,
              props.tableOptions.clickColumnHeaderCallback,
              true,
            )}
          >
            Subtotal
          </th>,
        );
      }
      // The next colSpan columns will have the same value anyway...
      i += colSpan;
    }

    const totalCell =
      attrIdx === 0 && rowTotals ? (
        <th
          key="total"
          className="pvtTotalLabel"
          rowSpan={colAttrs.length + Math.min(rowAttrs.length, 1)}
          onClick={clickHeaderHandlerHandler(
            pivotData,
            [],
            props.cols,
            attrIdx,
            props.tableOptions.clickColumnHeaderCallback,
            false,
            true,
          )}
        >
          {`Total (${props.aggregatorName})`}
        </th>
      ) : null;

    const cells = [spaceCell, attrNameCell, ...attrValueCells, totalCell];
    return <tr key={`colAttr-${attrIdx}`}>{cells}</tr>;
  }, [collapsedCols]);
    const renderRowHeaderRowHandler = useCallback((pivotSettings) => {
    // Render just the attribute names of the rows (the actual attribute values
    // will show up in the individual rows).

    const {
      rowAttrs,
      colAttrs,
      rowKeys,
      arrowCollapsed,
      arrowExpanded,
      rowSubtotalDisplay,
      maxRowVisible,
      pivotData,
      namesMapping,
    } = pivotSettings;
    return (
      <tr key="rowHdr">
        {rowAttrs.map((r, i) => {
          const needLabelToggle =
            rowSubtotalDisplay.enabled && i !== rowAttrs.length - 1;
          let arrowClickHandle = null;
          let subArrow = null;
          if (needLabelToggle) {
            arrowClickHandle =
              i + 1 < maxRowVisible
                ? collapseAttrHandler(true, i, rowKeys)
                : expandAttrHandler(true, i, rowKeys);
            subArrow = i + 1 < maxRowVisible ? arrowExpanded : arrowCollapsed;
          }
          return (
            <th className="pvtAxisLabel" key={`rowAttr-${i}`}>
              {displayHeaderCell(
                needLabelToggle,
                subArrow,
                arrowClickHandle,
                r,
                namesMapping,
              )}
            </th>
          );
        })}
        <th
          className="pvtTotalLabel"
          key="padding"
          onClick={clickHeaderHandlerHandler(
            pivotData,
            [],
            props.rows,
            0,
            props.tableOptions.clickRowHeaderCallback,
            false,
            true,
          )}
        >
          {colAttrs.length === 0
            ? `Total (${props.aggregatorName})`
            : null}
        </th>
      </tr>
    );
  }, []);
    const renderTableRowHandler = useCallback((rowKey, rowIdx, pivotSettings) => {
    // Render a single row in the pivot table.

    const {
      rowAttrs,
      colAttrs,
      rowAttrSpans,
      visibleColKeys,
      pivotData,
      rowTotals,
      rowSubtotalDisplay,
      arrowExpanded,
      arrowCollapsed,
      cellCallbacks,
      rowTotalCallbacks,
      namesMapping,
    } = pivotSettings;

    const {
      highlightHeaderCellsOnHover,
      omittedHighlightHeaderGroups = [],
      highlightedHeaderCells,
      cellColorFormatters,
      dateFormatters,
    } = props.tableOptions;
    const flatRowKey = flatKey(rowKey);

    const colIncrSpan = colAttrs.length !== 0 ? 1 : 0;
    const attrValueCells = rowKey.map((r, i) => {
      let valueCellClassName = 'pvtRowLabel';
      if (
        highlightHeaderCellsOnHover &&
        !omittedHighlightHeaderGroups.includes(rowAttrs[i])
      ) {
        valueCellClassName += ' hoverable';
      }
      if (
        highlightedHeaderCells &&
        Array.isArray(highlightedHeaderCells[rowAttrs[i]]) &&
        highlightedHeaderCells[rowAttrs[i]].includes(r)
      ) {
        valueCellClassName += ' active';
      }
      const rowSpan = rowAttrSpans[rowIdx][i];
      if (rowSpan > 0) {
        const flatRowKey = flatKey(rowKey.slice(0, i + 1));
        const colSpan = 1 + (i === rowAttrs.length - 1 ? colIncrSpan : 0);
        const needRowToggle =
          rowSubtotalDisplay.enabled && i !== rowAttrs.length - 1;
        const onArrowClick = needRowToggle
          ? toggleRowKeyHandler(flatRowKey)
          : null;

        const headerCellFormattedValue =
          dateFormatters && dateFormatters[rowAttrs[i]]
            ? dateFormatters[rowAttrs[i]](r)
            : r;
        return (
          <th
            key={`rowKeyLabel-${i}`}
            className={valueCellClassName}
            rowSpan={rowSpan}
            colSpan={colSpan}
            onClick={clickHeaderHandlerHandler(
              pivotData,
              rowKey,
              props.rows,
              i,
              props.tableOptions.clickRowHeaderCallback,
            )}
          >
            {displayHeaderCell(
              needRowToggle,
              collapsedRows[flatRowKey]
                ? arrowCollapsed
                : arrowExpanded,
              onArrowClick,
              headerCellFormattedValue,
              namesMapping,
            )}
          </th>
        );
      }
      return null;
    });

    const attrValuePaddingCell =
      rowKey.length < rowAttrs.length ? (
        <th
          className="pvtRowLabel pvtSubtotalLabel"
          key="rowKeyBuffer"
          colSpan={rowAttrs.length - rowKey.length + colIncrSpan}
          rowSpan={1}
          onClick={clickHeaderHandlerHandler(
            pivotData,
            rowKey,
            props.rows,
            rowKey.length,
            props.tableOptions.clickRowHeaderCallback,
            true,
          )}
        >
          Subtotal
        </th>
      ) : null;

    const rowClickHandlers = cellCallbacks[flatRowKey] || {};
    const valueCells = visibleColKeys.map(colKey => {
      const flatColKey = flatKey(colKey);
      const agg = pivotData.getAggregator(rowKey, colKey);
      const aggValue = agg.value();

      const keys = [...rowKey, ...colKey];
      let backgroundColor;
      if (cellColorFormatters) {
        Object.values(cellColorFormatters).forEach(cellColorFormatter => {
          if (Array.isArray(cellColorFormatter)) {
            keys.forEach(key => {
              if (backgroundColor) {
                return;
              }
              cellColorFormatter
                .filter(formatter => formatter.column === key)
                .forEach(formatter => {
                  const formatterResult = formatter.getColorFromValue(aggValue);
                  if (formatterResult) {
                    backgroundColor = formatterResult;
                  }
                });
            });
          }
        });
      }

      const style = agg.isSubtotal
        ? { fontWeight: 'bold' }
        : { backgroundColor };

      return (
        <td
          role="gridcell"
          className="pvtVal"
          key={`pvtVal-${flatColKey}`}
          onClick={rowClickHandlers[flatColKey]}
          style={style}
        >
          {agg.format(aggValue)}
        </td>
      );
    });

    let totalCell = null;
    if (rowTotals) {
      const agg = pivotData.getAggregator(rowKey, []);
      const aggValue = agg.value();
      totalCell = (
        <td
          role="gridcell"
          key="total"
          className="pvtTotal"
          onClick={rowTotalCallbacks[flatRowKey]}
        >
          {agg.format(aggValue)}
        </td>
      );
    }

    const rowCells = [
      ...attrValueCells,
      attrValuePaddingCell,
      ...valueCells,
      totalCell,
    ];

    return <tr key={`keyRow-${flatRowKey}`}>{rowCells}</tr>;
  }, [collapsedRows]);
    const renderTotalsRowHandler = useCallback((pivotSettings) => {
    // Render the final totals rows that has the totals for all the columns.

    const {
      rowAttrs,
      colAttrs,
      visibleColKeys,
      rowTotals,
      pivotData,
      colTotalCallbacks,
      grandTotalCallback,
    } = pivotSettings;

    const totalLabelCell = (
      <th
        key="label"
        className="pvtTotalLabel pvtRowTotalLabel"
        colSpan={rowAttrs.length + Math.min(colAttrs.length, 1)}
        onClick={clickHeaderHandlerHandler(
          pivotData,
          [],
          props.rows,
          0,
          props.tableOptions.clickRowHeaderCallback,
          false,
          true,
        )}
      >
        {`Total (${props.aggregatorName})`}
      </th>
    );

    const totalValueCells = visibleColKeys.map(colKey => {
      const flatColKey = flatKey(colKey);
      const agg = pivotData.getAggregator([], colKey);
      const aggValue = agg.value();

      return (
        <td
          role="gridcell"
          className="pvtTotal pvtRowTotal"
          key={`total-${flatColKey}`}
          onClick={colTotalCallbacks[flatColKey]}
          style={{ padding: '5px' }}
        >
          {agg.format(aggValue)}
        </td>
      );
    });

    let grandTotalCell = null;
    if (rowTotals) {
      const agg = pivotData.getAggregator([], []);
      const aggValue = agg.value();
      grandTotalCell = (
        <td
          role="gridcell"
          key="total"
          className="pvtGrandTotal pvtRowTotal"
          onClick={grandTotalCallback}
        >
          {agg.format(aggValue)}
        </td>
      );
    }

    const totalCells = [totalLabelCell, ...totalValueCells, grandTotalCell];

    return (
      <tr key="total" className="pvtRowTotals">
        {totalCells}
      </tr>
    );
  }, []);
    const visibleKeysHandler = useCallback((keys, collapsed, numAttrs, subtotalDisplay) => {
    return keys.filter(
      key =>
        // Is the key hidden by one of its parents?
        !key.some((k, j) => collapsed[flatKey(key.slice(0, j))]) &&
        // Leaf key.
        (key.length === numAttrs ||
          // Children hidden. Must show total.
          flatKey(key) in collapsed ||
          // Don't hide totals.
          !subtotalDisplay.hideOnExpand),
    );
  }, []);

    if (cachedPropsHandler !== props) {
      cachedPropsHandler = props;
      cachedBasePivotSettingsHandler = getBasePivotSettingsHandler();
    }
    const {
      colAttrs,
      rowAttrs,
      rowKeys,
      colKeys,
      colTotals,
      rowSubtotalDisplay,
      colSubtotalDisplay,
    } = cachedBasePivotSettingsHandler;

    // Need to account for exclusions to compute the effective row
    // and column keys.
    const visibleRowKeys = visibleKeysHandler(
      rowKeys,
      collapsedRows,
      rowAttrs.length,
      rowSubtotalDisplay,
    );
    const visibleColKeys = visibleKeysHandler(
      colKeys,
      collapsedCols,
      colAttrs.length,
      colSubtotalDisplay,
    );

    const pivotSettings = {
      visibleRowKeys,
      maxRowVisible: Math.max(...visibleRowKeys.map(k => k.length)),
      visibleColKeys,
      maxColVisible: Math.max(...visibleColKeys.map(k => k.length)),
      rowAttrSpans: calcAttrSpansHandler(visibleRowKeys, rowAttrs.length),
      colAttrSpans: calcAttrSpansHandler(visibleColKeys, colAttrs.length),
      ...cachedBasePivotSettingsHandler,
    };

    return (
      <Styles>
        <table className="pvtTable" role="grid">
          <thead>
            {colAttrs.map((c, j) =>
              renderColHeaderRowHandler(c, j, pivotSettings),
            )}
            {rowAttrs.length !== 0 && renderRowHeaderRowHandler(pivotSettings)}
          </thead>
          <tbody>
            {visibleRowKeys.map((r, i) =>
              renderTableRowHandler(r, i, pivotSettings),
            )}
            {colTotals && renderTotalsRowHandler(pivotSettings)}
          </tbody>
        </table>
      </Styles>
    ); 
};




TableRenderer.propTypes = {
  ...PivotData.propTypes,
  tableOptions: PropTypes.object,
};
TableRenderer.defaultProps = { ...PivotData.defaultProps, tableOptions: {} };
