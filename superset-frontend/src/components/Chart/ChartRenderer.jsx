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

import { snakeCase, isEqual, cloneDeep } from 'lodash';
import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';
import {
    SuperChart,
    logging,
    Behavior,
    t,
    isFeatureEnabled,
    FeatureFlag,
    getChartMetadataRegistry,
} from '@superset-ui/core';
import { Logger, LOG_ACTIONS_RENDER_CHART } from 'src/logger/LogUtils';
import { EmptyStateBig, EmptyStateSmall } from 'src/components/EmptyState';
import { ChartSource } from 'src/types/ChartSource';
import ChartContextMenu from './ChartContextMenu/ChartContextMenu';

const propTypes = {
  annotationData: PropTypes.object,
  actions: PropTypes.object,
  chartId: PropTypes.number.isRequired,
  datasource: PropTypes.object,
  initialValues: PropTypes.object,
  formData: PropTypes.object.isRequired,
  latestQueryFormData: PropTypes.object,
  labelColors: PropTypes.object,
  sharedLabelColors: PropTypes.object,
  height: PropTypes.number,
  width: PropTypes.number,
  setControlValue: PropTypes.func,
  vizType: PropTypes.string.isRequired,
  triggerRender: PropTypes.bool,
  // state
  chartAlert: PropTypes.string,
  chartStatus: PropTypes.string,
  queriesResponse: PropTypes.arrayOf(PropTypes.object),
  triggerQuery: PropTypes.bool,
  chartIsStale: PropTypes.bool,
  // dashboard callbacks
  addFilter: PropTypes.func,
  setDataMask: PropTypes.func,
  onFilterMenuOpen: PropTypes.func,
  onFilterMenuClose: PropTypes.func,
  ownState: PropTypes.object,
  postTransformProps: PropTypes.func,
  source: PropTypes.oneOf([ChartSource.Dashboard, ChartSource.Explore]),
  emitCrossFilters: PropTypes.bool,
};

const BLANK = {};

const BIG_NO_RESULT_MIN_WIDTH = 300;
const BIG_NO_RESULT_MIN_HEIGHT = 220;

const behaviors = [Behavior.INTERACTIVE_CHART];

const defaultProps = {
  addFilter: () => BLANK,
  onFilterMenuOpen: () => BLANK,
  onFilterMenuClose: () => BLANK,
  initialValues: BLANK,
  setControlValue() {},
  triggerRender: false,
};

const ChartRenderer = (props) => {


    const [showContextMenu, setShowContextMenu] = useState(props.source === ChartSource.Dashboard &&
        (isFeatureEnabled(FeatureFlag.DRILL_TO_DETAIL) ||
          isFeatureEnabled(FeatureFlag.DASHBOARD_CROSS_FILTERS)));
    const [inContextMenu, setInContextMenu] = useState(false);
    const [legendState, setLegendState] = useState(undefined);

    const shouldComponentUpdateHandler = useCallback((nextProps, nextState) => {
    const resultsReady =
      nextProps.queriesResponse &&
      ['success', 'rendered'].indexOf(nextProps.chartStatus) > -1 &&
      !nextProps.queriesResponse?.[0]?.error;

    if (resultsReady) {
      if (!isEqual(stateHandler, nextState)) {
        return true;
      }
      hasQueryResponseChangeHandler =
        nextProps.queriesResponse !== props.queriesResponse;

      if (hasQueryResponseChangeHandler) {
        mutableQueriesResponseHandler = cloneDeep(nextProps.queriesResponse);
      }

      return (
        hasQueryResponseChangeHandler ||
        !isEqual(nextProps.datasource, props.datasource) ||
        nextProps.annotationData !== props.annotationData ||
        nextProps.ownState !== props.ownState ||
        nextProps.filterState !== props.filterState ||
        nextProps.height !== props.height ||
        nextProps.width !== props.width ||
        nextProps.triggerRender ||
        nextProps.labelColors !== props.labelColors ||
        nextProps.sharedLabelColors !== props.sharedLabelColors ||
        nextProps.formData.color_scheme !== props.formData.color_scheme ||
        nextProps.formData.stack !== props.formData.stack ||
        nextProps.cacheBusterProp !== props.cacheBusterProp ||
        nextProps.emitCrossFilters !== props.emitCrossFilters
      );
    }
    return false;
  }, []);
    const handleAddFilterHandler = useCallback((col, vals, merge = true, refresh = true) => {
    props.addFilter(col, vals, merge, refresh);
  }, []);
    const handleRenderSuccessHandler = useCallback(() => {
    const { actions, chartStatus, chartId, vizType } = props;
    if (['loading', 'rendered'].indexOf(chartStatus) < 0) {
      actions.chartRenderingSucceeded(chartId);
    }

    // only log chart render time which is triggered by query results change
    // currently we don't log chart re-render time, like window resize etc
    if (hasQueryResponseChangeHandler) {
      actions.logEvent(LOG_ACTIONS_RENDER_CHART, {
        slice_id: chartId,
        viz_type: vizType,
        start_offset: renderStartTimeHandler,
        ts: new Date().getTime(),
        duration: Logger.getTimestamp() - renderStartTimeHandler,
      });
    }
  }, []);
    const handleRenderFailureHandler = useCallback((error, info) => {
    const { actions, chartId } = props;
    logging.warn(error);
    actions.chartRenderingFailed(
      error.toString(),
      chartId,
      info ? info.componentStack : null,
    );

    // only trigger render log when query is changed
    if (hasQueryResponseChangeHandler) {
      actions.logEvent(LOG_ACTIONS_RENDER_CHART, {
        slice_id: chartId,
        has_err: true,
        error_details: error.toString(),
        start_offset: renderStartTimeHandler,
        ts: new Date().getTime(),
        duration: Logger.getTimestamp() - renderStartTimeHandler,
      });
    }
  }, []);
    const handleSetControlValueHandler = useCallback((...args) => {
    const { setControlValue } = props;
    if (setControlValue) {
      setControlValue(...args);
    }
  }, []);
    const handleOnContextMenuHandler = useCallback((offsetX, offsetY, filters) => {
    contextMenuRefHandler.current.open(offsetX, offsetY, filters);
    setInContextMenu(true);
  }, []);
    const handleContextMenuSelectedHandler = useCallback(() => {
    setInContextMenu(false);
  }, []);
    const handleContextMenuClosedHandler = useCallback(() => {
    setInContextMenu(false);
  }, []);
    const handleLegendStateChangedHandler = useCallback((legendState) => {
    setLegendState(legendState);
  }, [legendState]);
    // calls `handleOnContextMenu` with no `filters` param.
    const onContextMenuFallbackHandler = useCallback((event) => {
    if (!inContextMenu) {
      event.preventDefault();
      handleOnContextMenuHandler(event.clientX, event.clientY);
    }
  }, [inContextMenu]);

    const { chartAlert, chartStatus, chartId, emitCrossFilters } = props;

    // Skip chart rendering
    if (chartStatus === 'loading' || !!chartAlert || chartStatus === null) {
      return null;
    }

    renderStartTimeHandler = Logger.getTimestamp();

    const {
      width,
      height,
      datasource,
      annotationData,
      initialValues,
      ownState,
      filterState,
      chartIsStale,
      formData,
      latestQueryFormData,
      postTransformProps,
    } = props;

    const currentFormData =
      chartIsStale && latestQueryFormData ? latestQueryFormData : formData;
    const vizType = currentFormData.viz_type || props.vizType;

    // It's bad practice to use unprefixed `vizType` as classnames for chart
    // container. It may cause css conflicts as in the case of legacy table chart.
    // When migrating charts, we should gradually add a `superset-chart-` prefix
    // to each one of them.
    const snakeCaseVizType = snakeCase(vizType);
    const chartClassName =
      vizType === 'table'
        ? `superset-chart-${snakeCaseVizType}`
        : snakeCaseVizType;

    const webpackHash =
      process.env.WEBPACK_MODE === 'development'
        ? `-${
            // eslint-disable-next-line camelcase
            typeof __webpack_require__ !== 'undefined' &&
            // eslint-disable-next-line camelcase, no-undef
            typeof __webpack_require__.h === 'function' &&
            // eslint-disable-next-line no-undef
            __webpack_require__.h()
          }`
        : '';

    let noResultsComponent;
    const noResultTitle = t('No results were returned for this query');
    const noResultDescription =
      props.source === ChartSource.Explore
        ? t(
            'Make sure that the controls are configured properly and the datasource contains data for the selected time range',
          )
        : undefined;
    const noResultImage = 'chart.svg';
    if (width > BIG_NO_RESULT_MIN_WIDTH && height > BIG_NO_RESULT_MIN_HEIGHT) {
      noResultsComponent = (
        <EmptyStateBig
          title={noResultTitle}
          description={noResultDescription}
          image={noResultImage}
        />
      );
    } else {
      noResultsComponent = (
        <EmptyStateSmall title={noResultTitle} image={noResultImage} />
      );
    }

    // Check for Behavior.DRILL_TO_DETAIL to tell if chart can receive Drill to
    // Detail props or if it'll cause side-effects (e.g. excessive re-renders).
    const drillToDetailProps = getChartMetadataRegistry()
      .get(formData.viz_type)
      ?.behaviors.find(behavior => behavior === Behavior.DRILL_TO_DETAIL)
      ? { inContextMenu: inContextMenu }
      : {};

    return (
      <>
        {showContextMenu && (
          <ChartContextMenu
            ref={contextMenuRefHandler}
            id={chartId}
            formData={currentFormData}
            onSelection={handleContextMenuSelectedHandler}
            onClose={handleContextMenuClosedHandler}
          />
        )}
        <div
          onContextMenu={
            showContextMenu ? onContextMenuFallbackHandler : undefined
          }
        >
          <SuperChart
            disableErrorBoundary
            key={`${chartId}${webpackHash}`}
            id={`chart-id-${chartId}`}
            className={chartClassName}
            chartType={vizType}
            width={width}
            height={height}
            annotationData={annotationData}
            datasource={datasource}
            initialValues={initialValues}
            formData={currentFormData}
            ownState={ownState}
            filterState={filterState}
            hooks={hooksHandler}
            behaviors={behaviors}
            queriesData={mutableQueriesResponseHandler}
            onRenderSuccess={handleRenderSuccessHandler}
            onRenderFailure={handleRenderFailureHandler}
            noResults={noResultsComponent}
            postTransformProps={postTransformProps}
            emitCrossFilters={emitCrossFilters}
            legendState={legendState}
            {...drillToDetailProps}
          />
        </div>
      </>
    ); 
};




ChartRenderer.propTypes = propTypes;
ChartRenderer.defaultProps = defaultProps;

export default ChartRenderer;
