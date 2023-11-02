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

import PropTypes from 'prop-types';
import { useEffect, useCallback } from 'react';
import {
    ensureIsArray,
    FeatureFlag,
    isFeatureEnabled,
    logging,
    styled,
    t,
} from '@superset-ui/core';
import { PLACEHOLDER_DATASOURCE } from 'src/dashboard/constants';
import Loading from 'src/components/Loading';
import { EmptyStateBig } from 'src/components/EmptyState';
import ErrorBoundary from 'src/components/ErrorBoundary';
import { Logger, LOG_ACTIONS_RENDER_CHART } from 'src/logger/LogUtils';
import { URL_PARAMS } from 'src/constants';
import { getUrlParam } from 'src/utils/urlUtils';
import { isCurrentUserBot } from 'src/utils/isBot';
import { ChartSource } from 'src/types/ChartSource';
import { ResourceStatus } from 'src/hooks/apiResources/apiResources';
import ChartRenderer from './ChartRenderer';
import { ChartErrorMessage } from './ChartErrorMessage';
import { getChartRequiredFieldsMissingMessage } from '../../utils/getChartRequiredFieldsMissingMessage';

const propTypes = {
  annotationData: PropTypes.object,
  actions: PropTypes.object,
  chartId: PropTypes.number.isRequired,
  datasource: PropTypes.object,
  // current chart is included by dashboard
  dashboardId: PropTypes.number,
  // original selected values for FilterBox viz
  // so that FilterBox can pre-populate selected values
  // only affect UI control
  initialValues: PropTypes.object,
  // formData contains chart's own filter parameter
  // and merged with extra filter that current dashboard applying
  formData: PropTypes.object.isRequired,
  labelColors: PropTypes.object,
  sharedLabelColors: PropTypes.object,
  width: PropTypes.number,
  height: PropTypes.number,
  setControlValue: PropTypes.func,
  timeout: PropTypes.number,
  vizType: PropTypes.string.isRequired,
  triggerRender: PropTypes.bool,
  force: PropTypes.bool,
  isFiltersInitialized: PropTypes.bool,
  // state
  chartAlert: PropTypes.string,
  chartStatus: PropTypes.string,
  chartStackTrace: PropTypes.string,
  queriesResponse: PropTypes.arrayOf(PropTypes.object),
  triggerQuery: PropTypes.bool,
  chartIsStale: PropTypes.bool,
  errorMessage: PropTypes.node,
  // dashboard callbacks
  addFilter: PropTypes.func,
  onQuery: PropTypes.func,
  onFilterMenuOpen: PropTypes.func,
  onFilterMenuClose: PropTypes.func,
  ownState: PropTypes.object,
  postTransformProps: PropTypes.func,
  datasetsStatus: PropTypes.oneOf(['loading', 'error', 'complete']),
  isInView: PropTypes.bool,
  emitCrossFilters: PropTypes.bool,
};

const BLANK = {};
const NONEXISTENT_DATASET = t(
  'The dataset associated with this chart no longer exists',
);

const defaultProps = {
  addFilter: () => BLANK,
  onFilterMenuOpen: () => BLANK,
  onFilterMenuClose: () => BLANK,
  initialValues: BLANK,
  setControlValue() {},
  triggerRender: false,
  dashboardId: null,
  chartStackTrace: null,
  force: false,
  isInView: true,
};

const Styles = styled.div`
  min-height: ${p => p.height}px;
  position: relative;

  .chart-tooltip {
    opacity: 0.75;
    font-size: ${({ theme }) => theme.typography.sizes.s}px;
  }

  .slice_container {
    display: flex;
    flex-direction: column;
    justify-content: center;

    height: ${p => p.height}px;

    .pivot_table tbody tr {
      font-feature-settings: 'tnum' 1;
    }

    .alert {
      margin: ${({ theme }) => theme.gridUnit * 2}px;
    }
  }
`;

const MonospaceDiv = styled.div`
  font-family: ${({ theme }) => theme.typography.families.monospace};
  word-break: break-word;
  overflow-x: auto;
  white-space: pre-wrap;
`;

const Chart = (props) => {


    

    useEffect(() => {
    if (props.triggerQuery) {
      runQueryHandler();
    }
  }, []);
    useEffect(() => {
    if (props.triggerQuery) {
      runQueryHandler();
    }
  }, []);
    const runQueryHandler = useCallback(() => {
    if (props.chartId > 0 && isFeatureEnabled(FeatureFlag.CLIENT_CACHE)) {
      // Load saved chart with a GET request
      props.actions.getSavedChart(
        props.formData,
        props.force || getUrlParam(URL_PARAMS.force), // allow override via url params force=true
        props.timeout,
        props.chartId,
        props.dashboardId,
        props.ownState,
      );
    } else {
      // Create chart with POST request
      props.actions.postChartFormData(
        props.formData,
        props.force || getUrlParam(URL_PARAMS.force), // allow override via url params force=true
        props.timeout,
        props.chartId,
        props.dashboardId,
        props.ownState,
      );
    }
  }, []);
    const handleRenderContainerFailureHandler = useCallback((error, info) => {
    const { actions, chartId } = props;
    logging.warn(error);
    actions.chartRenderingFailed(
      error.toString(),
      chartId,
      info ? info.componentStack : null,
    );

    actions.logEvent(LOG_ACTIONS_RENDER_CHART, {
      slice_id: chartId,
      has_err: true,
      error_details: error.toString(),
      start_offset: renderStartTimeHandler,
      ts: new Date().getTime(),
      duration: Logger.getTimestamp() - renderStartTimeHandler,
    });
  }, []);
    const renderErrorMessageHandler = useCallback((queryResponse) => {
    const {
      chartId,
      chartAlert,
      chartStackTrace,
      datasource,
      dashboardId,
      height,
      datasetsStatus,
    } = props;
    const error = queryResponse?.errors?.[0];
    const message = chartAlert || queryResponse?.message;

    // if datasource is still loading, don't render JS errors
    if (
      chartAlert !== undefined &&
      chartAlert !== NONEXISTENT_DATASET &&
      datasource === PLACEHOLDER_DATASOURCE &&
      datasetsStatus !== ResourceStatus.ERROR
    ) {
      return (
        <Styles
          key={chartId}
          data-ui-anchor="chart"
          className="chart-container"
          data-test="chart-container"
          height={height}
        >
          <Loading />
        </Styles>
      );
    }

    return (
      <ChartErrorMessage
        key={chartId}
        chartId={chartId}
        error={error}
        subtitle={<MonospaceDiv>{message}</MonospaceDiv>}
        copyText={message}
        link={queryResponse ? queryResponse.link : null}
        source={dashboardId ? ChartSource.Dashboard : ChartSource.Explore}
        stackTrace={chartStackTrace}
      />
    );
  }, []);

    const {
      height,
      chartAlert,
      chartStatus,
      errorMessage,
      chartIsStale,
      queriesResponse = [],
      width,
    } = props;

    const isLoading = chartStatus === 'loading';
    renderContainerStartTimeHandler = Logger.getTimestamp();
    if (chartStatus === 'failed') {
      return queriesResponse.map(item => renderErrorMessageHandler(item));
    }

    if (errorMessage && ensureIsArray(queriesResponse).length === 0) {
      return (
        <EmptyStateBig
          title={t('Add required control values to preview chart')}
          description={getChartRequiredFieldsMissingMessage(true)}
          image="chart.svg"
        />
      );
    }

    if (
      !isLoading &&
      !chartAlert &&
      !errorMessage &&
      chartIsStale &&
      ensureIsArray(queriesResponse).length === 0
    ) {
      return (
        <EmptyStateBig
          title={t('Your chart is ready to go!')}
          description={
            <span>
              {t(
                'Click on "Create chart" button in the control panel on the left to preview a visualization or',
              )}{' '}
              <span role="button" tabIndex={0} onClick={props.onQuery}>
                {t('click here')}
              </span>
              .
            </span>
          }
          image="chart.svg"
        />
      );
    }

    return (
      <ErrorBoundary
        onError={handleRenderContainerFailureHandler}
        showMessage={false}
      >
        <Styles
          data-ui-anchor="chart"
          className="chart-container"
          data-test="chart-container"
          height={height}
          width={width}
        >
          <div className="slice_container" data-test="slice-container">
            {props.isInView ||
            !isFeatureEnabled(FeatureFlag.DASHBOARD_VIRTUALIZATION) ||
            isCurrentUserBot() ? (
              <ChartRenderer
                {...props}
                source={props.dashboardId ? 'dashboard' : 'explore'}
                data-test={props.vizType}
              />
            ) : (
              <Loading />
            )}
          </div>
          {isLoading && <Loading />}
        </Styles>
      </ErrorBoundary>
    ); 
};




Chart.propTypes = propTypes;
Chart.defaultProps = defaultProps;

export default Chart;
