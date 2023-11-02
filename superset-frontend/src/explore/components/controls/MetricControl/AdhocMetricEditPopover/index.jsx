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
/* eslint-disable camelcase */

import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    isDefined,
    t,
    styled,
    ensureIsArray,
    DatasourceType,
} from '@superset-ui/core';
import Tabs from 'src/components/Tabs';
import Button from 'src/components/Button';
import { Select } from 'src/components';
import { Tooltip } from 'src/components/Tooltip';
import { EmptyStateSmall } from 'src/components/EmptyState';
import { Form, FormItem } from 'src/components/Form';
import { SQLEditor } from 'src/components/AsyncAceEditor';
import sqlKeywords from 'src/SqlLab/utils/sqlKeywords';
import { noOp } from 'src/utils/common';
import {
    AGGREGATES_OPTIONS,
    POPOVER_INITIAL_HEIGHT,
    POPOVER_INITIAL_WIDTH,
} from 'src/explore/constants';
import columnType from 'src/explore/components/controls/MetricControl/columnType';
import savedMetricType from 'src/explore/components/controls/MetricControl/savedMetricType';
import AdhocMetric, {
    EXPRESSION_TYPES,
} from 'src/explore/components/controls/MetricControl/AdhocMetric';
import {
    StyledMetricOption,
    StyledColumnOption,
} from 'src/explore/components/optionRenderers';

const propTypes = {
  onChange: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  getCurrentTab: PropTypes.func,
  getCurrentLabel: PropTypes.func,
  adhocMetric: PropTypes.instanceOf(AdhocMetric).isRequired,
  columns: PropTypes.arrayOf(columnType),
  savedMetricsOptions: PropTypes.arrayOf(savedMetricType),
  savedMetric: savedMetricType,
  datasource: PropTypes.object,
  isNewMetric: PropTypes.bool,
  isLabelModified: PropTypes.bool,
};

const defaultProps = {
  columns: [],
  getCurrentTab: noOp,
  isNewMetric: false,
};

const StyledSelect = styled(Select)`
  .metric-option {
    & > svg {
      min-width: ${({ theme }) => `${theme.gridUnit * 4}px`};
    }
    & > .option-label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;

export const SAVED_TAB_KEY = 'SAVED';

const AdhocMetricEditPopover = (props) => {


    const [adhocMetric, setAdhocMetric] = useState(props.adhocMetric);
    const [savedMetric, setSavedMetric] = useState(props.savedMetric);
    const [width, setWidth] = useState(POPOVER_INITIAL_WIDTH);
    const [height, setHeight] = useState(POPOVER_INITIAL_HEIGHT);

    // "Saved" is a default tab unless there are no saved metrics for dataset
    const defaultActiveTabKey = useRef(getDefaultTabHandler());
    useEffect(() => {
    props.getCurrentTab(defaultActiveTabKey.current);
  }, []);
    useEffect(() => {
    if (
      prevState.adhocMetric?.sqlExpression !==
        adhocMetric?.sqlExpression ||
      prevState.adhocMetric?.aggregate !== adhocMetric?.aggregate ||
      prevState.adhocMetric?.column?.column_name !==
        adhocMetric?.column?.column_name ||
      prevState.savedMetric?.metric_name !== savedMetric?.metric_name
    ) {
      props.getCurrentLabel({
        savedMetricLabel:
          savedMetric?.verbose_name ||
          savedMetric?.metric_name,
        adhocMetricLabel: adhocMetric?.getDefaultLabel(),
      });
    }
  }, [adhocMetric, savedMetric]);
    useEffect(() => {
    return () => {
    document.removeEventListener('mouseup', onMouseUpHandler);
    document.removeEventListener('mousemove', onMouseMoveHandler);
  };
}, []);
    const getDefaultTabHandler = useCallback(() => {
    const { adhocMetric, savedMetric, savedMetricsOptions, isNewMetric } =
      props;
    if (isDefined(adhocMetric.column) || isDefined(adhocMetric.sqlExpression)) {
      return adhocMetric.expressionType;
    }
    if (
      (isNewMetric || savedMetric.metric_name) &&
      Array.isArray(savedMetricsOptions) &&
      savedMetricsOptions.length > 0
    ) {
      return SAVED_TAB_KEY;
    }
    return adhocMetric.expressionType;
  }, [adhocMetric, savedMetric]);
    const onSaveHandler = useCallback(() => {
    

    const metric = savedMetric?.metric_name ? savedMetric : adhocMetric;
    const oldMetric = props.savedMetric?.metric_name
      ? props.savedMetric
      : props.adhocMetric;
    props.onChange(
      {
        ...metric,
      },
      oldMetric,
    );
    props.onClose();
  }, [savedMetric, adhocMetric]);
    const onResetStateAndCloseHandler = useCallback(() => {
    setStateHandler(
      {
        adhocMetric: props.adhocMetric,
        savedMetric: props.savedMetric,
      },
      props.onClose,
    );
  }, []);
    const onColumnChangeHandler = useCallback((columnName) => {
    const column = props.columns.find(
      column => column.column_name === columnName,
    );
    setStateHandler(prevState => ({
      adhocMetric: prevState.adhocMetric.duplicateWith({
        column,
        expressionType: EXPRESSION_TYPES.SIMPLE,
      }),
      savedMetric: undefined,
    }));
  }, []);
    const onAggregateChangeHandler = useCallback((aggregate) => {
    // we construct this object explicitly to overwrite the value in the case aggregate is null
    setStateHandler(prevState => ({
      adhocMetric: prevState.adhocMetric.duplicateWith({
        aggregate,
        expressionType: EXPRESSION_TYPES.SIMPLE,
      }),
      savedMetric: undefined,
    }));
  }, []);
    const onSavedMetricChangeHandler = useCallback((savedMetricName) => {
    const savedMetric = props.savedMetricsOptions.find(
      metric => metric.metric_name === savedMetricName,
    );
    setStateHandler(prevState => ({
      savedMetric,
      adhocMetric: prevState.adhocMetric.duplicateWith({
        column: undefined,
        aggregate: undefined,
        sqlExpression: undefined,
        expressionType: EXPRESSION_TYPES.SIMPLE,
      }),
    }));
  }, [savedMetric]);
    const onSqlExpressionChangeHandler = useCallback((sqlExpression) => {
    setStateHandler(prevState => ({
      adhocMetric: prevState.adhocMetric.duplicateWith({
        sqlExpression,
        expressionType: EXPRESSION_TYPES.SQL,
      }),
      savedMetric: undefined,
    }));
  }, []);
    const onDragDownHandler = useCallback((e) => {
    dragStartXHandler = e.clientX;
    dragStartYHandler = e.clientY;
    dragStartWidthHandler = width;
    dragStartHeightHandler = height;
    document.addEventListener('mousemove', onMouseMoveHandler);
  }, [width, height]);
    const onMouseMoveHandler = useCallback((e) => {
    props.onResize();
    setWidth(Math.max(
        dragStartWidthHandler + (e.clientX - dragStartXHandler),
        POPOVER_INITIAL_WIDTH,
      ))
    setHeight(Math.max(
        dragStartHeightHandler + (e.clientY - dragStartYHandler),
        POPOVER_INITIAL_HEIGHT,
      ));
  }, []);
    const onMouseUpHandler = useCallback(() => {
    document.removeEventListener('mousemove', onMouseMoveHandler);
  }, []);
    const onTabChangeHandler = useCallback((tab) => {
    refreshAceEditorHandler();
    props.getCurrentTab(tab);
  }, []);
    const handleAceEditorRefHandler = useCallback((ref) => {
    if (ref) {
      aceEditorRefHandler = ref;
    }
  }, []);
    const refreshAceEditorHandler = useCallback(() => {
    setTimeout(() => {
      if (aceEditorRefHandler) {
        aceEditorRefHandler.editor.resize();
      }
    }, 0);
  }, []);
    const renderColumnOptionHandler = useCallback((option) => {
    const column = { ...option };
    if (column.metric_name && !column.verbose_name) {
      column.verbose_name = column.metric_name;
    }
    return <StyledColumnOption column={column} showType />;
  }, []);
    const renderMetricOptionHandler = useCallback((savedMetric) => {
    return <StyledMetricOption metric={savedMetric} showType />;
  }, [savedMetric]);

    const {
      adhocMetric: propsAdhocMetric,
      savedMetric: propsSavedMetric,
      columns,
      savedMetricsOptions,
      onChange,
      onClose,
      onResize,
      datasource,
      isNewMetric,
      isLabelModified,
      ...popoverProps
    } = props;
    
    const keywords = sqlKeywords.concat(
      columns.map(column => ({
        name: column.column_name,
        value: column.column_name,
        score: 50,
        meta: 'column',
      })),
    );

    const columnValue =
      (adhocMetric.column && adhocMetric.column.column_name) ||
      adhocMetric.inferSqlExpressionColumn();

    // autofocus on column if there's no value in column; otherwise autofocus on aggregate
    const columnSelectProps = {
      ariaLabel: t('Select column'),
      placeholder: t('%s column(s)', columns.length),
      value: columnValue,
      onChange: onColumnChangeHandler,
      allowClear: true,
      autoFocus: !columnValue,
    };

    const aggregateSelectProps = {
      ariaLabel: t('Select aggregate options'),
      placeholder: t('%s aggregates(s)', AGGREGATES_OPTIONS.length),
      value: adhocMetric.aggregate || adhocMetric.inferSqlExpressionAggregate(),
      onChange: onAggregateChangeHandler,
      allowClear: true,
      autoFocus: !!columnValue,
    };

    const savedSelectProps = {
      ariaLabel: t('Select saved metrics'),
      placeholder: t('%s saved metric(s)', savedMetricsOptions?.length ?? 0),
      value: savedMetric?.metric_name,
      onChange: onSavedMetricChangeHandler,
      allowClear: true,
      autoFocus: true,
    };

    const stateIsValid = adhocMetric.isValid() || savedMetric?.metric_name;
    const hasUnsavedChanges =
      isLabelModified ||
      isNewMetric ||
      !adhocMetric.equals(propsAdhocMetric) ||
      (!(
        typeof savedMetric?.metric_name === 'undefined' &&
        typeof propsSavedMetric?.metric_name === 'undefined'
      ) &&
        savedMetric?.metric_name !== propsSavedMetric?.metric_name);

    let extra = {};
    if (datasource?.extra) {
      try {
        extra = JSON.parse(datasource.extra);
      } catch {} // eslint-disable-line no-empty
    }

    return (
      <Form
        layout="vertical"
        id="metrics-edit-popover"
        data-test="metrics-edit-popover"
        {...popoverProps}
      >
        <Tabs
          id="adhoc-metric-edit-tabs"
          data-test="adhoc-metric-edit-tabs"
          defaultActiveKey={defaultActiveTabKey.current}
          className="adhoc-metric-edit-tabs"
          style={{ height: height, width: width }}
          onChange={onTabChangeHandler}
          allowOverflow
        >
          <Tabs.TabPane key={SAVED_TAB_KEY} tab={t('Saved')}>
            {ensureIsArray(savedMetricsOptions).length > 0 ? (
              <FormItem label={t('Saved metric')}>
                <StyledSelect
                  options={ensureIsArray(savedMetricsOptions).map(
                    savedMetric => ({
                      value: savedMetric.metric_name,
                      label: savedMetric.metric_name,
                      customLabel: renderMetricOptionHandler(savedMetric),
                      key: savedMetric.id,
                    }),
                  )}
                  {...savedSelectProps}
                />
              </FormItem>
            ) : datasource.type === DatasourceType.Table ? (
              <EmptyStateSmall
                image="empty.svg"
                title={t('No saved metrics found')}
                description={t(
                  'Add metrics to dataset in "Edit datasource" modal',
                )}
              />
            ) : (
              <EmptyStateSmall
                image="empty.svg"
                title={t('No saved metrics found')}
                description={
                  <>
                    <span
                      tabIndex={0}
                      role="button"
                      onClick={() => {
                        props.handleDatasetModal(true);
                        props.onClose();
                      }}
                    >
                      {t('Create a dataset')}
                    </span>
                    {t(' to add metrics')}
                  </>
                }
              />
            )}
          </Tabs.TabPane>
          <Tabs.TabPane
            key={EXPRESSION_TYPES.SIMPLE}
            tab={
              extra.disallow_adhoc_metrics ? (
                <Tooltip
                  title={t(
                    'Simple ad-hoc metrics are not enabled for this dataset',
                  )}
                >
                  {t('Simple')}
                </Tooltip>
              ) : (
                t('Simple')
              )
            }
            disabled={extra.disallow_adhoc_metrics}
          >
            <FormItem label={t('column')}>
              <Select
                options={columns.map(column => ({
                  value: column.column_name,
                  label: column.verbose_name || column.column_name,
                  key: column.id,
                  customLabel: renderColumnOptionHandler(column),
                }))}
                {...columnSelectProps}
              />
            </FormItem>
            <FormItem label={t('aggregate')}>
              <Select
                options={AGGREGATES_OPTIONS.map(option => ({
                  value: option,
                  label: option,
                  key: option,
                }))}
                {...aggregateSelectProps}
              />
            </FormItem>
          </Tabs.TabPane>
          <Tabs.TabPane
            key={EXPRESSION_TYPES.SQL}
            tab={
              extra.disallow_adhoc_metrics ? (
                <Tooltip
                  title={t(
                    'Custom SQL ad-hoc metrics are not enabled for this dataset',
                  )}
                >
                  {t('Custom SQL')}
                </Tooltip>
              ) : (
                t('Custom SQL')
              )
            }
            data-test="adhoc-metric-edit-tab#custom"
            disabled={extra.disallow_adhoc_metrics}
          >
            <SQLEditor
              data-test="sql-editor"
              showLoadingForImport
              ref={handleAceEditorRefHandler}
              keywords={keywords}
              height={`${height - 80}px`}
              onChange={onSqlExpressionChangeHandler}
              width="100%"
              showGutter={false}
              value={
                adhocMetric.sqlExpression ||
                adhocMetric.translateToSql({ transformCountDistinct: true })
              }
              editorProps={{ $blockScrolling: true }}
              enableLiveAutocompletion
              className="filter-sql-editor"
              wrapEnabled
            />
          </Tabs.TabPane>
        </Tabs>
        <div>
          <Button
            buttonSize="small"
            onClick={onResetStateAndCloseHandler}
            data-test="AdhocMetricEdit#cancel"
            cta
          >
            {t('Close')}
          </Button>
          <Button
            disabled={!stateIsValid || !hasUnsavedChanges}
            buttonStyle="primary"
            buttonSize="small"
            data-test="AdhocMetricEdit#save"
            onClick={onSaveHandler}
            cta
          >
            {t('Save')}
          </Button>
          <i
            role="button"
            aria-label="Resize"
            tabIndex={0}
            onMouseDown={onDragDownHandler}
            className="fa fa-expand edit-popover-resize text-muted"
          />
        </div>
      </Form>
    ); 
};

export default AdhocMetricEditPopover;



AdhocMetricEditPopover.propTypes = propTypes;
AdhocMetricEditPopover.defaultProps = defaultProps;
