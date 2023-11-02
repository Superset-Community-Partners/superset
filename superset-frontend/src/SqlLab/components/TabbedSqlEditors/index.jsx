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

import { useEffect, useCallback } from 'react';
import pick from 'lodash/pick';
import PropTypes from 'prop-types';
import { EditableTabs } from 'src/components/Tabs';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import URI from 'urijs';
import { FeatureFlag, styled, t, isFeatureEnabled } from '@superset-ui/core';
import { Tooltip } from 'src/components/Tooltip';
import { detectOS } from 'src/utils/common';
import * as Actions from 'src/SqlLab/actions/sqlLab';
import { EmptyStateBig } from 'src/components/EmptyState';
import getBootstrapData from 'src/utils/getBootstrapData';
import SqlEditor from '../SqlEditor';
import SqlEditorTabHeader from '../SqlEditorTabHeader';

const propTypes = {
  actions: PropTypes.object.isRequired,
  defaultDbId: PropTypes.number,
  displayLimit: PropTypes.number,
  defaultQueryLimit: PropTypes.number.isRequired,
  maxRow: PropTypes.number.isRequired,
  databases: PropTypes.object.isRequired,
  queries: PropTypes.object.isRequired,
  queryEditors: PropTypes.array,
  tabHistory: PropTypes.array.isRequired,
  tables: PropTypes.array.isRequired,
  offline: PropTypes.bool,
  saveQueryWarning: PropTypes.string,
  scheduleQueryWarning: PropTypes.string,
};
const defaultProps = {
  queryEditors: [],
  offline: false,
  saveQueryWarning: null,
  scheduleQueryWarning: null,
};

const StyledEditableTabs = styled(EditableTabs)`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const StyledTab = styled.span`
  line-height: 24px;
`;

const TabTitle = styled.span`
  margin-right: ${({ theme }) => theme.gridUnit * 2}px;
  text-transform: none;
`;

// Get the user's OS
const userOS = detectOS();

const TabbedSqlEditors = (props) => {
const sqlLabUrl = '/superset/sqllab';

    

    useEffect(() => {
    // migrate query editor and associated tables state to server
    if (isFeatureEnabled(FeatureFlag.SQLLAB_BACKEND_PERSISTENCE)) {
      const localStorageTables = props.tables.filter(
        table => table.inLocalStorage,
      );
      const localStorageQueries = Object.values(props.queries).filter(
        query => query.inLocalStorage,
      );
      props.queryEditors
        .filter(qe => qe.inLocalStorage)
        .forEach(qe => {
          // get all queries associated with the query editor
          const queries = localStorageQueries.filter(
            query => query.sqlEditorId === qe.id,
          );
          const tables = localStorageTables.filter(
            table => table.queryEditorId === qe.id,
          );
          props.actions.migrateQueryEditorFromLocalStorage(
            qe,
            tables,
            queries,
          );
        });
    }

    // merge post form data with GET search params
    // Hack: this data should be coming from getInitialState
    // but for some reason this data isn't being passed properly through
    // the reducer.
    const bootstrapData = getBootstrapData();
    const queryParameters = URI(window.location).search(true);
    const {
      id,
      name,
      sql,
      savedQueryId,
      datasourceKey,
      queryId,
      dbid,
      dbname,
      schema,
      autorun,
      new: isNewQuery,
      ...urlParams
    } = {
      ...bootstrapData.requested_query,
      ...queryParameters,
    };

    // Popping a new tab based on the querystring
    if (id || sql || savedQueryId || datasourceKey || queryId) {
      if (id) {
        props.actions.popStoredQuery(id);
      } else if (savedQueryId) {
        props.actions.popSavedQuery(savedQueryId);
      } else if (queryId) {
        props.actions.popQuery(queryId);
      } else if (datasourceKey) {
        props.actions.popDatasourceQuery(datasourceKey, sql);
      } else if (sql) {
        let databaseId = dbid;
        if (databaseId) {
          databaseId = parseInt(databaseId, 10);
        } else {
          const { databases } = props;
          const databaseName = dbname;
          if (databaseName) {
            Object.keys(databases).forEach(db => {
              if (databases[db].database_name === databaseName) {
                databaseId = databases[db].id;
              }
            });
          }
        }
        const newQueryEditor = {
          name,
          dbId: databaseId,
          schema,
          autorun,
          sql,
        };
        props.actions.addQueryEditor(newQueryEditor);
      }
      popNewTabHandler(pick(urlParams, Object.keys(queryParameters)));
    } else if (isNewQuery || props.queryEditors.length === 0) {
      newQueryEditorHandler();

      if (isNewQuery) {
        window.history.replaceState({}, document.title, sqlLabUrl);
      }
    } else {
      const qe = activeQueryEditorHandler();
      const latestQuery = props.queries[qe.latestQueryId];
      if (
        isFeatureEnabled(FeatureFlag.SQLLAB_BACKEND_PERSISTENCE) &&
        latestQuery &&
        latestQuery.resultsKey
      ) {
        // when results are not stored in localStorage they need to be
        // fetched from the results backend (if configured)
        props.actions.fetchQueryResults(
          latestQuery,
          props.displayLimit,
        );
      }
    }
  }, []);
    const popNewTabHandler = useCallback((urlParams) => {
    // Clean the url in browser history
    const updatedUrl = `${URI(sqlLabUrl).query(urlParams)}`;
    window.history.replaceState({}, document.title, updatedUrl);
  }, []);
    const activeQueryEditorHandler = useCallback(() => {
    if (props.tabHistory.length === 0) {
      return props.queryEditors[0];
    }
    const qeid = props.tabHistory[props.tabHistory.length - 1];
    return props.queryEditors.find(qe => qe.id === qeid) || null;
  }, []);
    const newQueryEditorHandler = useCallback(() => {
    props.actions.addNewQueryEditor();
  }, []);
    const handleSelectHandler = useCallback((key) => {
    const qeid = props.tabHistory[props.tabHistory.length - 1];
    if (key !== qeid) {
      const queryEditor = props.queryEditors.find(qe => qe.id === key);
      if (!queryEditor) {
        return;
      }
      props.actions.switchQueryEditor(
        queryEditor,
        props.displayLimit,
      );
    }
  }, []);
    const handleEditHandler = useCallback((key, action) => {
    if (action === 'remove') {
      const qe = props.queryEditors.find(qe => qe.id === key);
      removeQueryEditorHandler(qe);
    }
    if (action === 'add') {
      newQueryEditorHandler();
    }
  }, []);
    const removeQueryEditorHandler = useCallback((qe) => {
    props.actions.removeQueryEditor(qe);
  }, []);
    const duplicateQueryEditorHandler = useCallback((qe) => {
    props.actions.cloneQueryToNewTab(qe, false);
  }, []);

    const noQueryEditors = props.queryEditors?.length === 0;
    const editors = props.queryEditors?.map(qe => (
      <EditableTabs.TabPane
        key={qe.id}
        tab={<SqlEditorTabHeader queryEditor={qe} />}
        // for tests - key prop isn't handled by enzyme well bcs it's a react keyword
        data-key={qe.id}
      >
        <SqlEditor
          tables={props.tables.filter(xt => xt.queryEditorId === qe.id)}
          queryEditor={qe}
          defaultQueryLimit={props.defaultQueryLimit}
          maxRow={props.maxRow}
          displayLimit={props.displayLimit}
          saveQueryWarning={props.saveQueryWarning}
          scheduleQueryWarning={props.scheduleQueryWarning}
        />
      </EditableTabs.TabPane>
    ));

    const emptyTab = (
      <StyledTab>
        <TabTitle>{t('Add a new tab')}</TabTitle>
        <Tooltip
          id="add-tab"
          placement="bottom"
          title={
            userOS === 'Windows'
              ? t('New tab (Ctrl + q)')
              : t('New tab (Ctrl + t)')
          }
        >
          <i data-test="add-tab-icon" className="fa fa-plus-circle" />
        </Tooltip>
      </StyledTab>
    );

    const emptyTabState = (
      <EditableTabs.TabPane
        key={0}
        data-key={0}
        tab={emptyTab}
        closable={false}
      >
        <EmptyStateBig
          image="empty_sql_chart.svg"
          description={t('Add a new tab to create SQL Query')}
        />
      </EditableTabs.TabPane>
    );

    return (
      <StyledEditableTabs
        destroyInactiveTabPane
        activeKey={props.tabHistory[props.tabHistory.length - 1]}
        id="a11y-query-editor-tabs"
        className="SqlEditorTabs"
        data-test="sql-editor-tabs"
        onChange={handleSelectHandler}
        fullWidth={false}
        hideAdd={props.offline}
        onTabClick={() => noQueryEditors && newQueryEditorHandler()}
        onEdit={handleEditHandler}
        type={noQueryEditors ? 'card' : 'editable-card'}
        addIcon={
          <Tooltip
            id="add-tab"
            placement="bottom"
            title={
              userOS === 'Windows'
                ? t('New tab (Ctrl + q)')
                : t('New tab (Ctrl + t)')
            }
          >
            <i data-test="add-tab-icon" className="fa fa-plus-circle" />
          </Tooltip>
        }
      >
        {editors}
        {noQueryEditors && emptyTabState}
      </StyledEditableTabs>
    ); 
};



TabbedSqlEditors.propTypes = propTypes;
TabbedSqlEditors.defaultProps = defaultProps;

function mapStateToProps({ sqlLab, common }) {
  return {
    databases: sqlLab.databases,
    queryEditors: sqlLab.queryEditors,
    queries: sqlLab.queries,
    tabHistory: sqlLab.tabHistory,
    tables: sqlLab.tables,
    defaultDbId: common.conf.SQLLAB_DEFAULT_DBID,
    displayLimit: common.conf.DISPLAY_MAX_ROW,
    offline: sqlLab.offline,
    defaultQueryLimit: common.conf.DEFAULT_SQLLAB_LIMIT,
    maxRow: common.conf.SQL_MAX_ROW,
    saveQueryWarning: common.conf.SQLLAB_SAVE_WARNING_MESSAGE,
    scheduleQueryWarning: common.conf.SQLLAB_SCHEDULE_WARNING_MESSAGE,
  };
}
function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(Actions, dispatch),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(TabbedSqlEditors);
