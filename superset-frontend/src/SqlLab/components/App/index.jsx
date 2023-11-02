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
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { css, styled, t } from '@superset-ui/core';
import ToastContainer from 'src/components/MessageToasts/ToastContainer';
import {
    LOCALSTORAGE_MAX_USAGE_KB,
    LOCALSTORAGE_WARNING_THRESHOLD
} from 'src/SqlLab/constants';
import * as Actions from 'src/SqlLab/actions/sqlLab';
import { logEvent } from 'src/logger/actions';
import {
    LOG_ACTIONS_SQLLAB_WARN_LOCAL_STORAGE_USAGE,
    LOG_ACTIONS_SQLLAB_MONITOR_LOCAL_STORAGE_USAGE,
} from 'src/logger/LogUtils';
import TabbedSqlEditors from '../TabbedSqlEditors';
import QueryAutoRefresh from '../QueryAutoRefresh';

const SqlLabStyles = styled.div`
  ${({ theme }) => css`
    &.SqlLab {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      padding: 0 ${theme.gridUnit * 2}px;

      pre {
        padding: 0 !important;
        margin: 0;
        border: none;
        font-size: ${theme.typography.sizes.s}px;
        background: transparent !important;
      }

      .north-pane {
        display: flex;
        flex-direction: column;
      }

      .ace_editor {
        flex-grow: 1;
      }

      .ace_content {
        height: 100%;
      }

      .ant-tabs-content-holder {
        /* This is needed for Safari */
        height: 100%;
      }

      .ant-tabs-content {
        height: 100%;
        position: relative;
        background-color: ${theme.colors.grayscale.light5};
        overflow-x: auto;
        overflow-y: auto;

        > .ant-tabs-tabpane {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
        }
      }

      .ResultsModal .ant-modal-body {
        min-height: ${theme.gridUnit * 140}px;
      }

      .ant-modal-body {
        overflow: auto;
      }
    }
  `};
`;

const App = (props) => {


    const [hash, setHash] = useState(window.location.hash);

    useEffect(() => {
    window.addEventListener('hashchange', onHashChangedHandler.bind(this));

    // Horrible hack to disable side swipe navigation when in SQL Lab. Even though the
    // docs say setting this style on any div will prevent it, turns out it only works
    // when set on the body element.
    document.body.style.overscrollBehaviorX = 'none';
  }, []);
    useEffect(() => {
    const { localStorageUsageInKilobytes, actions, queries } = props;
    const queryCount = queries?.lenghth || 0;
    if (
      localStorageUsageInKilobytes >=
      LOCALSTORAGE_WARNING_THRESHOLD * LOCALSTORAGE_MAX_USAGE_KB
    ) {
      showLocalStorageUsageWarningHandler(
        localStorageUsageInKilobytes,
        queryCount,
      );
    }
    if (localStorageUsageInKilobytes > 0 && !hasLoggedLocalStorageUsageHandler) {
      const eventData = {
        current_usage: localStorageUsageInKilobytes,
        query_count: queryCount,
      };
      actions.logEvent(
        LOG_ACTIONS_SQLLAB_MONITOR_LOCAL_STORAGE_USAGE,
        eventData,
      );
      hasLoggedLocalStorageUsageHandler = true;
    }
  }, []);
    useEffect(() => {
    return () => {
    window.removeEventListener('hashchange', onHashChangedHandler.bind(this));

    // And now we need to reset the overscroll behavior back to the default.
    document.body.style.overscrollBehaviorX = 'auto';
  };
}, []);
    const onHashChangedHandler = useCallback(() => {
    setHash(window.location.hash);
  }, []);
    const showLocalStorageUsageWarningHandler = useCallback((currentUsage, queryCount) => {
    props.actions.addDangerToast(
      t(
        "SQL Lab uses your browser's local storage to store queries and results." +
          '\nCurrently, you are using %(currentUsage)s KB out of %(maxStorage)d KB storage space.' +
          '\nTo keep SQL Lab from crashing, please delete some query tabs.' +
          '\nYou can re-access these queries by using the Save feature before you delete the tab.' +
          '\nNote that you will need to close other SQL Lab windows before you do this.',
        {
          currentUsage: currentUsage.toFixed(2),
          maxStorage: LOCALSTORAGE_MAX_USAGE_KB,
        },
      ),
    );
    const eventData = {
      current_usage: currentUsage,
      query_count: queryCount,
    };
    props.actions.logEvent(
      LOG_ACTIONS_SQLLAB_WARN_LOCAL_STORAGE_USAGE,
      eventData,
    );
  }, []);

    const { queries, queriesLastUpdate } = props;
    if (hash && hash === '#search') {
      return window.location.replace('/superset/sqllab/history/');
    }
    return (
      <SqlLabStyles data-test="SqlLabApp" className="App SqlLab">
        <QueryAutoRefresh
          queries={queries}
          queriesLastUpdate={queriesLastUpdate}
        />
        <TabbedSqlEditors />
        <ToastContainer />
      </SqlLabStyles>
    ); 
};




App.propTypes = {
  actions: PropTypes.object,
  common: PropTypes.object,
  localStorageUsageInKilobytes: PropTypes.number.isRequired,
};

function mapStateToProps(state) {
  const { common, localStorageUsageInKilobytes, sqlLab } = state;
  return {
    common,
    localStorageUsageInKilobytes,
    queries: sqlLab?.queries,
    queriesLastUpdate: sqlLab?.queriesLastUpdate,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators({ ...Actions, logEvent }, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(App);
