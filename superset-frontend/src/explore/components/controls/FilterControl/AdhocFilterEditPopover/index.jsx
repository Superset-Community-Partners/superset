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

import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Button from 'src/components/Button';
import { styled, t } from '@superset-ui/core';

import ErrorBoundary from 'src/components/ErrorBoundary';
import Tabs from 'src/components/Tabs';
import adhocMetricType from 'src/explore/components/controls/MetricControl/adhocMetricType';
import AdhocFilter from 'src/explore/components/controls/FilterControl/AdhocFilter';
import AdhocFilterEditPopoverSimpleTabContent from 'src/explore/components/controls/FilterControl/AdhocFilterEditPopoverSimpleTabContent';
import AdhocFilterEditPopoverSqlTabContent from 'src/explore/components/controls/FilterControl/AdhocFilterEditPopoverSqlTabContent';
import columnType from 'src/explore/components/controls/FilterControl/columnType';
import {
  POPOVER_INITIAL_HEIGHT,
  POPOVER_INITIAL_WIDTH,
} from 'src/explore/constants';
import { EXPRESSION_TYPES } from '../types';

const propTypes = {
  adhocFilter: PropTypes.instanceOf(AdhocFilter).isRequired,
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      columnType,
      PropTypes.shape({ saved_metric_name: PropTypes.string.isRequired }),
      adhocMetricType,
    ]),
  ).isRequired,
  datasource: PropTypes.object,
  partitionColumn: PropTypes.string,
  theme: PropTypes.object,
  sections: PropTypes.arrayOf(PropTypes.string),
  operators: PropTypes.arrayOf(PropTypes.string),
  requireSave: PropTypes.bool,
};

const ResizeIcon = styled.i`
  margin-left: ${({ theme }) => theme.gridUnit * 2}px;
`;

const FilterPopoverContentContainer = styled.div`
  .adhoc-filter-edit-tabs > .nav-tabs {
    margin-bottom: ${({ theme }) => theme.gridUnit * 2}px;

    & > li > a {
      padding: ${({ theme }) => theme.gridUnit}px;
    }
  }

  #filter-edit-popover {
    max-width: none;
  }

  .filter-edit-clause-info {
    font-size: ${({ theme }) => theme.typography.sizes.xs}px;
    padding-left: ${({ theme }) => theme.gridUnit}px;
  }

  .filter-edit-clause-section {
    display: inline-flex;
  }

  .adhoc-filter-simple-column-dropdown {
    margin-top: ${({ theme }) => theme.gridUnit * 5}px;
  }
`;

const FilterActionsContainer = styled.div`
  margin-top: ${({ theme }) => theme.gridUnit * 2}px;
`;

const AdhocFilterEditPopover = props => {
  const [adhocFilter, setAdhocFilter] = useState(props.adhocFilter);
  const [width, setWidth] = useState(POPOVER_INITIAL_WIDTH);
  const [height, setHeight] = useState(POPOVER_INITIAL_HEIGHT);
  const [activeKey, setActiveKey] = useState(
    props?.adhocFilter?.expressionType || 'SIMPLE',
  );
  const [isSimpleTabValid, setIsSimpleTabValid] = useState(true);

  useEffect(() => {
    document.addEventListener('mouseup', onMouseUpHandler);
  }, []);
  useEffect(() => {
    return () => {
      document.removeEventListener('mouseup', onMouseUpHandler);
      document.removeEventListener('mousemove', onMouseMoveHandler);
    };
  }, []);
  const onAdhocFilterChangeHandler = useCallback(
    adhocFilter => {
      setAdhocFilter(adhocFilter);
    },
    [adhocFilter],
  );
  const setSimpleTabIsValidHandler = useCallback(isValid => {
    setIsSimpleTabValid(isValid);
  }, []);
  const onSaveHandler = useCallback(() => {
    props.onChange(adhocFilter);
    props.onClose();
  }, [adhocFilter]);
  const onDragDownHandler = useCallback(
    e => {
      dragStartXHandler = e.clientX;
      dragStartYHandler = e.clientY;
      dragStartWidthHandler = width;
      dragStartHeightHandler = height;
      document.addEventListener('mousemove', onMouseMoveHandler);
    },
    [width, height],
  );
  const onMouseMoveHandler = useCallback(e => {
    props.onResize();
    setWidth(
      Math.max(
        dragStartWidthHandler + (e.clientX - dragStartXHandler),
        POPOVER_INITIAL_WIDTH,
      ),
    );
    setHeight(
      Math.max(
        dragStartHeightHandler + (e.clientY - dragStartYHandler),
        POPOVER_INITIAL_HEIGHT,
      ),
    );
  }, []);
  const onMouseUpHandler = useCallback(() => {
    document.removeEventListener('mousemove', onMouseMoveHandler);
  }, []);
  const onTabChangeHandler = useCallback(
    activeKey => {
      setActiveKey(activeKey);
    },
    [activeKey],
  );
  const adjustHeightHandler = useCallback(heightDifference => {
    setStateHandler(state => ({ height: state.height + heightDifference }));
  }, []);

  const {
    adhocFilter: propsAdhocFilter,
    options,
    onChange,
    onClose,
    onResize,
    datasource,
    partitionColumn,
    theme,
    operators,
    requireSave,
    ...popoverProps
  } = props;

  const stateIsValid = adhocFilter.isValid();
  const hasUnsavedChanges =
    requireSave || !adhocFilter.equals(propsAdhocFilter);

  return (
    <FilterPopoverContentContainer
      id="filter-edit-popover"
      {...popoverProps}
      data-test="filter-edit-popover"
      ref={popoverContentRefHandler}
    >
      <Tabs
        id="adhoc-filter-edit-tabs"
        defaultActiveKey={adhocFilter.expressionType}
        className="adhoc-filter-edit-tabs"
        data-test="adhoc-filter-edit-tabs"
        style={{ minHeight: height, width: width }}
        allowOverflow
        onChange={onTabChangeHandler}
      >
        <Tabs.TabPane
          className="adhoc-filter-edit-tab"
          key={EXPRESSION_TYPES.SIMPLE}
          tab={t('Simple')}
        >
          <ErrorBoundary>
            <AdhocFilterEditPopoverSimpleTabContent
              operators={operators}
              adhocFilter={adhocFilter}
              onChange={onAdhocFilterChangeHandler}
              options={options}
              datasource={datasource}
              onHeightChange={adjustHeightHandler}
              partitionColumn={partitionColumn}
              popoverRef={popoverContentRefHandler.current}
              validHandler={setSimpleTabIsValidHandler}
            />
          </ErrorBoundary>
        </Tabs.TabPane>
        <Tabs.TabPane
          className="adhoc-filter-edit-tab"
          key={EXPRESSION_TYPES.SQL}
          tab={t('Custom SQL')}
        >
          <ErrorBoundary>
            <AdhocFilterEditPopoverSqlTabContent
              adhocFilter={adhocFilter}
              onChange={onAdhocFilterChangeHandler}
              options={props.options}
              height={height}
              activeKey={activeKey}
            />
          </ErrorBoundary>
        </Tabs.TabPane>
      </Tabs>
      <FilterActionsContainer>
        <Button buttonSize="small" onClick={props.onClose} cta>
          {t('Close')}
        </Button>
        <Button
          data-test="adhoc-filter-edit-popover-save-button"
          disabled={!stateIsValid || !isSimpleTabValid || !hasUnsavedChanges}
          buttonStyle="primary"
          buttonSize="small"
          className="m-r-5"
          onClick={onSaveHandler}
          cta
        >
          {t('Save')}
        </Button>
        <ResizeIcon
          role="button"
          aria-label="Resize"
          tabIndex={0}
          onMouseDown={onDragDownHandler}
          className="fa fa-expand edit-popover-resize text-muted"
        />
      </FilterActionsContainer>
    </FilterPopoverContentContainer>
  );
};

export default AdhocFilterEditPopover;

AdhocFilterEditPopover.propTypes = propTypes;
