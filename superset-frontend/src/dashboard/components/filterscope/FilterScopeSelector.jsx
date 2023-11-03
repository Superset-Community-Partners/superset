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
import cx from 'classnames';
import Button from 'src/components/Button';
import { css, t, styled } from '@superset-ui/core';

import buildFilterScopeTreeEntry from 'src/dashboard/util/buildFilterScopeTreeEntry';
import getFilterScopeNodesTree from 'src/dashboard/util/getFilterScopeNodesTree';
import getFilterFieldNodesTree from 'src/dashboard/util/getFilterFieldNodesTree';
import getFilterScopeParentNodes from 'src/dashboard/util/getFilterScopeParentNodes';
import getKeyForFilterScopeTree from 'src/dashboard/util/getKeyForFilterScopeTree';
import getSelectedChartIdForFilterScopeTree from 'src/dashboard/util/getSelectedChartIdForFilterScopeTree';
import getFilterScopeFromNodesTree from 'src/dashboard/util/getFilterScopeFromNodesTree';
import getRevertedFilterScope from 'src/dashboard/util/getRevertedFilterScope';
import { getChartIdsInFilterBoxScope } from 'src/dashboard/util/activeDashboardFilters';
import {
  getChartIdAndColumnFromFilterKey,
  getDashboardFilterKey,
} from 'src/dashboard/util/getDashboardFilterKey';
import { ALL_FILTERS_ROOT } from 'src/dashboard/util/constants';
import { dashboardFilterPropShape } from 'src/dashboard/util/propShapes';
import FilterScopeTree from './FilterScopeTree';
import FilterFieldTree from './FilterFieldTree';

const propTypes = {
  dashboardFilters: PropTypes.objectOf(dashboardFilterPropShape).isRequired,
  layout: PropTypes.object.isRequired,

  updateDashboardFiltersScope: PropTypes.func.isRequired,
  setUnsavedChanges: PropTypes.func.isRequired,
  onCloseModal: PropTypes.func.isRequired,
};

const ScopeContainer = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    height: 80%;
    margin-right: ${theme.gridUnit * -6}px;
    font-size: ${theme.typography.sizes.m}px;

    & .nav.nav-tabs {
      border: none;
    }

    & .filter-scope-body {
      flex: 1;
      max-height: calc(100% - ${theme.gridUnit * 32}px);

      .filter-field-pane,
      .filter-scope-pane {
        overflow-y: auto;
      }
    }

    & .warning-message {
      padding: ${theme.gridUnit * 6}px;
    }
  `}
`;

const ScopeBody = styled.div`
  ${({ theme }) => css`
    &.filter-scope-body {
      flex: 1;
      max-height: calc(100% - ${theme.gridUnit * 32}px);

      .filter-field-pane,
      .filter-scope-pane {
        overflow-y: auto;
      }
    }
  `}
`;

const ScopeHeader = styled.div`
  ${({ theme }) => css`
    height: ${theme.gridUnit * 16}px;
    border-bottom: 1px solid ${theme.colors.grayscale.light2};
    padding-left: ${theme.gridUnit * 6}px;
    margin-left: ${theme.gridUnit * -6}px;

    h4 {
      margin-top: 0;
    }

    .selected-fields {
      margin: ${theme.gridUnit * 3}px 0 ${theme.gridUnit * 4}px;
      visibility: hidden;

      &.multi-edit-mode {
        visibility: visible;
      }

      .selected-scopes {
        padding-left: ${theme.gridUnit}px;
      }
    }
  `}
`;

const ScopeSelector = styled.div`
  ${({ theme }) => css`
    &.filters-scope-selector {
      display: flex;
      flex-direction: row;
      position: relative;
      height: 100%;

      a,
      a:active,
      a:hover {
        color: inherit;
        text-decoration: none;
      }

      .react-checkbox-tree .rct-icon.rct-icon-expand-all,
      .react-checkbox-tree .rct-icon.rct-icon-collapse-all {
        font-family: ${theme.typography.families.sansSerif};
        font-size: ${theme.typography.sizes.m}px;
        color: ${theme.colors.primary.base};

        &::before {
          content: '';
        }

        &:hover {
          text-decoration: underline;
        }

        &:focus {
          outline: none;
        }
      }

      .filter-field-pane {
        position: relative;
        width: 40%;
        padding: ${theme.gridUnit * 4}px;
        padding-left: 0;
        border-right: 1px solid ${theme.colors.grayscale.light2};

        .filter-container label {
          font-weight: ${theme.typography.weights.normal};
          margin: 0 0 0 ${theme.gridUnit * 4}px;
          word-break: break-all;
        }

        .filter-field-item {
          height: ${theme.gridUnit * 9}px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 ${theme.gridUnit * 6}px;
          margin-left: ${theme.gridUnit * -6}px;

          &.is-selected {
            border: 1px solid ${theme.colors.text.label};
            border-radius: ${theme.borderRadius}px;
            background-color: ${theme.colors.grayscale.light4};
            margin-left: ${theme.gridUnit * -6}px;
          }
        }

        .react-checkbox-tree {
          .rct-title .root {
            font-weight: ${theme.typography.weights.bold};
          }

          .rct-text {
            height: ${theme.gridUnit * 10}px;
          }
        }
      }

      .filter-scope-pane {
        position: relative;
        flex: 1;
        padding: ${theme.gridUnit * 4}px;
        padding-right: ${theme.gridUnit * 6}px;
      }

      .react-checkbox-tree {
        flex-direction: column;
        color: ${theme.colors.grayscale.dark1};
        font-size: ${theme.typography.sizes.m}px;

        .filter-scope-type {
          padding: ${theme.gridUnit * 2}px 0;
          display: flex;
          align-items: center;

          &.chart {
            font-weight: ${theme.typography.weights.normal};
          }

          &.selected-filter {
            padding-left: ${theme.gridUnit * 7}px;
            position: relative;
            color: ${theme.colors.text.label};

            &::before {
              content: ' ';
              position: absolute;
              left: 0;
              top: 50%;
              width: ${theme.gridUnit * 4}px;
              height: ${theme.gridUnit * 4}px;
              border-radius: ${theme.borderRadius}px;
              margin-top: ${theme.gridUnit * -2}px;
              box-shadow: inset 0 0 0 2px ${theme.colors.grayscale.light2};
              background: ${theme.colors.grayscale.light3};
            }
          }

          &.root {
            font-weight: ${theme.typography.weights.bold};
          }
        }

        .rct-checkbox {
          svg {
            position: relative;
            top: 3px;
            width: ${theme.gridUnit * 4.5}px;
          }
        }

        .rct-node-leaf {
          .rct-bare-label {
            &::before {
              padding-left: ${theme.gridUnit}px;
            }
          }
        }

        .rct-options {
          text-align: left;
          margin-left: 0;
          margin-bottom: ${theme.gridUnit * 2}px;
        }

        .rct-text {
          margin: 0;
          display: flex;
        }

        .rct-title {
          display: block;
        }

        // disable style from react-checkbox-trees.css
        .rct-node-clickable:hover,
        .rct-node-clickable:focus,
        label:hover,
        label:active {
          background: none !important;
        }
      }

      .multi-edit-mode {
        &.filter-scope-pane {
          .rct-node.rct-node-leaf .filter-scope-type.filter_box {
            display: none;
          }
        }

        .filter-field-item {
          padding: 0 ${theme.gridUnit * 4}px 0 ${theme.gridUnit * 12}px;
          margin-left: ${theme.gridUnit * -12}px;

          &.is-selected {
            margin-left: ${theme.gridUnit * -13}px;
          }
        }
      }

      .scope-search {
        position: absolute;
        right: ${theme.gridUnit * 4}px;
        top: ${theme.gridUnit * 4}px;
        border-radius: ${theme.borderRadius}px;
        border: 1px solid ${theme.colors.grayscale.light2};
        padding: ${theme.gridUnit}px ${theme.gridUnit * 2}px;
        font-size: ${theme.typography.sizes.m}px;
        outline: none;

        &:focus {
          border: 1px solid ${theme.colors.primary.base};
        }
      }
    }
  `}
`;

const ActionsContainer = styled.div`
  ${({ theme }) => `
    height: ${theme.gridUnit * 16}px;

    border-top: ${theme.gridUnit / 4}px solid ${theme.colors.primary.light3};
    padding: ${theme.gridUnit * 6}px;
    margin: 0 0 0 ${-theme.gridUnit * 6}px;
    text-align: right;

    .btn {
      margin-right: ${theme.gridUnit * 4}px;

      &:last-child {
        margin-right: 0;
      }
    }
  `}
`;

const FilterScopeSelector = props => {
  const { dashboardFilters, layout } = props;
  const filterFieldNodes = getFilterFieldNodesTree({
    dashboardFilters,
  });
  const filtersNodes = filterFieldNodes[0].children;
  const filterScopeMap = Object.values(dashboardFilters).reduce(
    (map, { chartId: filterId, columns }) => {
      const filterScopeByChartId = Object.keys(columns).reduce(
        (mapByChartId, columnName) => {
          const filterKey = getDashboardFilterKey({
            chartId: filterId,
            column: columnName,
          });
          const nodes = getFilterScopeNodesTree({
            components: layout,
            filterFields: [filterKey],
            selectedChartId: filterId,
          });
          const expanded = getFilterScopeParentNodes(nodes, 1);
          // force display filter_box chart as unchecked, but show checkbox as disabled
          const chartIdsInFilterScope = (
            getChartIdsInFilterBoxScope({
              filterScope: dashboardFilters[filterId].scopes[columnName],
            }) || []
          ).filter(id => id !== filterId);

          return {
            ...mapByChartId,
            [filterKey]: {
              // unfiltered nodes
              nodes,
              // filtered nodes in display if searchText is not empty
              nodesFiltered: [...nodes],
              checked: chartIdsInFilterScope,
              expanded,
            },
          };
        },
        {},
      );

      return {
        ...map,
        ...filterScopeByChartId,
      };
    },
    {},
  );
  const filterScopeByChartId = Object.keys(columns).reduce(
    (mapByChartId, columnName) => {
      const filterKey = getDashboardFilterKey({
        chartId: filterId,
        column: columnName,
      });
      const nodes = getFilterScopeNodesTree({
        components: layout,
        filterFields: [filterKey],
        selectedChartId: filterId,
      });
      const expanded = getFilterScopeParentNodes(nodes, 1);
      // force display filter_box chart as unchecked, but show checkbox as disabled
      const chartIdsInFilterScope = (
        getChartIdsInFilterBoxScope({
          filterScope: dashboardFilters[filterId].scopes[columnName],
        }) || []
      ).filter(id => id !== filterId);

      return {
        ...mapByChartId,
        [filterKey]: {
          // unfiltered nodes
          nodes,
          // filtered nodes in display if searchText is not empty
          nodesFiltered: [...nodes],
          checked: chartIdsInFilterScope,
          expanded,
        },
      };
    },
    {},
  );
  const filterKey = getDashboardFilterKey({
    chartId: filterId,
    column: columnName,
  });
  const nodes = getFilterScopeNodesTree({
    components: layout,
    filterFields: [filterKey],
    selectedChartId: filterId,
  });
  const expanded = getFilterScopeParentNodes(nodes, 1);
  const chartIdsInFilterScope = (
    getChartIdsInFilterBoxScope({
      filterScope: dashboardFilters[filterId].scopes[columnName],
    }) || []
  ).filter(id => id !== filterId);
  const { chartId } = getChartIdAndColumnFromFilterKey(defaultFilterKeyHandler);
  const checkedFilterFields = [];
  const activeFilterField = defaultFilterKeyHandler;
  const expandedFilterIds = [ALL_FILTERS_ROOT].concat(chartId);
  const filterScopeTreeEntry = buildFilterScopeTreeEntry({
    checkedFilterFields,
    activeFilterField,
    filterScopeMap,
    layout,
  });

  const [showSelector, setShowSelector] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterScopeMap, setFilterScopeMap] = useState({
    ...filterScopeMap,
    ...filterScopeTreeEntry,
  });
  const [showSelector, setShowSelector] = useState(false);

  const onCheckFilterScopeHandler = useCallback(
    (checked = []) => {
      const key = getKeyForFilterScopeTree({
        activeFilterField,
        checkedFilterFields,
      });
      const editingList = activeFilterField
        ? [activeFilterField]
        : checkedFilterFields;
      const updatedEntry = {
        ...filterScopeMap[key],
        checked,
      };

      const updatedFilterScopeMap = getRevertedFilterScope({
        checked,
        filterFields: editingList,
        filterScopeMap,
      });

      setStateHandler(() => ({
        filterScopeMap: {
          ...filterScopeMap,
          ...updatedFilterScopeMap,
          [key]: updatedEntry,
        },
      }));
    },
    [filterScopeMap],
  );
  const onExpandFilterScopeHandler = useCallback(
    (expanded = []) => {
      const key = getKeyForFilterScopeTree({
        activeFilterField,
        checkedFilterFields,
      });
      const updatedEntry = {
        ...filterScopeMap[key],
        expanded,
      };
      setStateHandler(() => ({
        filterScopeMap: {
          ...filterScopeMap,
          [key]: updatedEntry,
        },
      }));
    },
    [filterScopeMap],
  );
  const onCheckFilterFieldHandler = useCallback(
    (checkedFilterFields = []) => {
      const { layout } = props;

      const filterScopeTreeEntry = buildFilterScopeTreeEntry({
        checkedFilterFields,
        activeFilterField: null,
        filterScopeMap,
        layout,
      });

      setStateHandler(() => ({
        activeFilterField: null,
        checkedFilterFields,
        filterScopeMap: {
          ...filterScopeMap,
          ...filterScopeTreeEntry,
        },
      }));
    },
    [filterScopeMap],
  );
  const onExpandFilterFieldHandler = useCallback((expandedFilterIds = []) => {
    setStateHandler(() => ({
      expandedFilterIds,
    }));
  }, []);
  const onChangeFilterFieldHandler = useCallback(
    (filterField = {}) => {
      const { layout } = props;
      const nextActiveFilterField = filterField.value;

      // we allow single edit and multiple edit in the same view.
      // if user click on the single filter field,
      // will show filter scope for the single field.
      // if user click on the same filter filed again,
      // will toggle off the single filter field,
      // and allow multi-edit all checked filter fields.
      if (nextActiveFilterField === currentActiveFilterField) {
        const filterScopeTreeEntry = buildFilterScopeTreeEntry({
          checkedFilterFields,
          activeFilterField: null,
          filterScopeMap,
          layout,
        });

        setActiveFilterField(null);
        setFilterScopeMap({
          ...filterScopeMap,
          ...filterScopeTreeEntry,
        });
      } else if (allfilterFieldsHandler.includes(nextActiveFilterField)) {
        const filterScopeTreeEntry = buildFilterScopeTreeEntry({
          checkedFilterFields,
          activeFilterField: nextActiveFilterField,
          filterScopeMap,
          layout,
        });

        setActiveFilterField(nextActiveFilterField);
        setFilterScopeMap({
          ...filterScopeMap,
          ...filterScopeTreeEntry,
        });
      }
    },
    [filterScopeMap],
  );
  const onSearchInputChangeHandler = useCallback(e => {
    setStateHandler({ searchText: e.target.value }, filterTreeHandler);
  }, []);
  const onCloseHandler = useCallback(() => {
    props.onCloseModal();
  }, []);
  const onSaveHandler = useCallback(() => {
    const allFilterFieldScopes = allfilterFieldsHandler.reduce(
      (map, filterKey) => {
        const { nodes } = filterScopeMap[filterKey];
        const checkedChartIds = filterScopeMap[filterKey].checked;

        return {
          ...map,
          [filterKey]: getFilterScopeFromNodesTree({
            filterKey,
            nodes,
            checkedChartIds,
          }),
        };
      },
      {},
    );

    props.updateDashboardFiltersScope(allFilterFieldScopes);
    props.setUnsavedChanges(true);

    // click Save button will do save and close modal
    props.onCloseModal();
  }, [filterScopeMap]);
  const filterTreeHandler = useCallback(() => {
    // Reset nodes back to unfiltered state
    if (!searchText) {
      setStateHandler(prevState => {
        const { activeFilterField, checkedFilterFields, filterScopeMap } =
          prevState;
        const key = getKeyForFilterScopeTree({
          activeFilterField,
          checkedFilterFields,
        });

        const updatedEntry = {
          ...filterScopeMap[key],
          nodesFiltered: filterScopeMap[key].nodes,
        };
        return {
          filterScopeMap: {
            ...filterScopeMap,
            [key]: updatedEntry,
          },
        };
      });
    } else {
      const updater = prevState => {
        const { activeFilterField, checkedFilterFields, filterScopeMap } =
          prevState;
        const key = getKeyForFilterScopeTree({
          activeFilterField,
          checkedFilterFields,
        });

        const nodesFiltered = filterScopeMap[key].nodes.reduce(
          filterNodesHandler,
          [],
        );
        const expanded = getFilterScopeParentNodes([...nodesFiltered]);
        const updatedEntry = {
          ...filterScopeMap[key],
          nodesFiltered,
          expanded,
        };

        return {
          filterScopeMap: {
            ...filterScopeMap,
            [key]: updatedEntry,
          },
        };
      };

      setStateHandler(updater);
    }
  }, [searchText, filterScopeMap]);
  const filterNodesHandler = useCallback(
    (filtered = [], node = {}) => {
      const children = (node.children || []).reduce(filterNodesHandler, []);

      if (
        // Node's label matches the search string
        node.label.toLocaleLowerCase().indexOf(searchText.toLocaleLowerCase()) >
          -1 ||
        // Or a children has a matching node
        children.length
      ) {
        filtered.push({ ...node, children });
      }

      return filtered;
    },
    [searchText],
  );
  const renderFilterFieldListHandler = useCallback(() => {
    return (
      <FilterFieldTree
        activeKey={activeFilterField}
        nodes={filterFieldNodes}
        checked={checkedFilterFields}
        expanded={expandedFilterIds}
        onClick={onChangeFilterFieldHandler}
        onCheck={onCheckFilterFieldHandler}
        onExpand={onExpandFilterFieldHandler}
      />
    );
  }, []);
  const renderFilterScopeTreeHandler = useCallback(() => {
    const key = getKeyForFilterScopeTree({
      activeFilterField,
      checkedFilterFields,
    });

    const selectedChartId = getSelectedChartIdForFilterScopeTree({
      activeFilterField,
      checkedFilterFields,
    });
    return (
      <>
        <input
          className="filter-text scope-search multi-edit-mode"
          placeholder={t('Search...')}
          type="text"
          value={searchText}
          onChange={onSearchInputChangeHandler}
        />
        <FilterScopeTree
          nodes={filterScopeMap[key].nodesFiltered}
          checked={filterScopeMap[key].checked}
          expanded={filterScopeMap[key].expanded}
          onCheck={onCheckFilterScopeHandler}
          onExpand={onExpandFilterScopeHandler}
          // pass selectedFilterId prop to FilterScopeTree component,
          // to hide checkbox for selected filter field itself
          selectedChartId={selectedChartId}
        />
      </>
    );
  }, [searchText, filterScopeMap]);
  const renderEditingFiltersNameHandler = useCallback(() => {
    const { dashboardFilters } = props;

    const currentFilterLabels = []
      .concat(activeFilterField || checkedFilterFields)
      .map(key => {
        const { chartId, column } = getChartIdAndColumnFromFilterKey(key);
        return dashboardFilters[chartId].labels[column] || column;
      });

    return (
      <div className="selected-fields multi-edit-mode">
        {currentFilterLabels.length === 0 && t('No filter is selected.')}
        {currentFilterLabels.length === 1 && t('Editing 1 filter:')}
        {currentFilterLabels.length > 1 &&
          t('Batch editing %d filters:', currentFilterLabels.length)}
        <span className="selected-scopes">
          {currentFilterLabels.join(', ')}
        </span>
      </div>
    );
  }, []);

  return (
    <ScopeContainer>
      <ScopeHeader>
        <h4>{t('Configure filter scopes')}</h4>
        {showSelector && renderEditingFiltersNameHandler()}
      </ScopeHeader>

      <ScopeBody className="filter-scope-body">
        {!showSelector ? (
          <div className="warning-message">
            {t('There are no filters in this dashboard.')}
          </div>
        ) : (
          <ScopeSelector className="filters-scope-selector">
            <div className={cx('filter-field-pane multi-edit-mode')}>
              {renderFilterFieldListHandler()}
            </div>
            <div className="filter-scope-pane multi-edit-mode">
              {renderFilterScopeTreeHandler()}
            </div>
          </ScopeSelector>
        )}
      </ScopeBody>

      <ActionsContainer>
        <Button buttonSize="small" onClick={onCloseHandler}>
          {t('Close')}
        </Button>
        {showSelector && (
          <Button
            buttonSize="small"
            buttonStyle="primary"
            onClick={onSaveHandler}
          >
            {t('Save')}
          </Button>
        )}
      </ActionsContainer>
    </ScopeContainer>
  );
};

export default FilterScopeSelector;

FilterScopeSelector.propTypes = propTypes;
