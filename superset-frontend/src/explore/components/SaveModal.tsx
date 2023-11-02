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
/* eslint camelcase: 0 */

import React, { useState, useCallback, useEffect } from 'react';
import { Dispatch } from 'redux';
import rison from 'rison';
import { connect } from 'react-redux';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { InfoTooltipWithTrigger } from '@superset-ui/chart-controls';
import {
    css,
    DatasourceType,
    isFeatureEnabled,
    FeatureFlag,
    isDefined,
    styled,
    SupersetClient,
    t,
} from '@superset-ui/core';
import { Input } from 'src/components/Input';
import { Form, FormItem } from 'src/components/Form';
import Alert from 'src/components/Alert';
import Modal from 'src/components/Modal';
import { Radio } from 'src/components/Radio';
import Button from 'src/components/Button';
import { AsyncSelect } from 'src/components';
import Loading from 'src/components/Loading';
import { canUserEditDashboard } from 'src/dashboard/util/permissionUtils';
import { setSaveChartModalVisibility } from 'src/explore/actions/saveModalActions';
import { SaveActionType } from 'src/explore/types';
import { UserWithPermissionsAndRoles } from 'src/types/bootstrapTypes';
import { Dashboard } from 'src/types/Dashboard';

// Session storage key for recent dashboard
const SK_DASHBOARD_ID = 'save_chart_recent_dashboard';

interface SaveModalProps extends RouteComponentProps {
  addDangerToast: (msg: string) => void;
  actions: Record<string, any>;
  form_data?: Record<string, any>;
  user: UserWithPermissionsAndRoles;
  alert?: string;
  sliceName?: string;
  slice?: Record<string, any>;
  datasource?: Record<string, any>;
  dashboardId: '' | number | null;
  isVisible: boolean;
  dispatch: Dispatch;
}

type SaveModalState = {
  newSliceName?: string;
  datasetName: string;
  action: SaveActionType;
  isLoading: boolean;
  saveStatus?: string | null;
  vizType?: string;
  dashboard?: { label: string; value: string | number };
};

export const StyledModal = styled(Modal)`
  .ant-modal-body {
    overflow: visible;
  }
  i {
    position: absolute;
    top: -${({ theme }) => theme.gridUnit * 5.25}px;
    left: ${({ theme }) => theme.gridUnit * 26.75}px;
  }
`;

const SaveModal = (props: SaveModalProps) => {


    const [newSliceName, setNewSliceName] = useState(props.sliceName);
    const [datasetName, setDatasetName] = useState(props.datasource?.name);
    const [action, setAction] = useState(canOverwriteSliceHandler() ? 'overwrite' : 'saveas');
    const [isLoading, setIsLoading] = useState(false);
    const [vizType, setVizType] = useState(props.form_data?.viz_type);
    const [dashboard, setDashboard] = useState(undefined);

    const isNewDashboardHandler = useCallback(() => {
    
    return typeof dashboard?.value === 'string';
  }, [dashboard]);
    const canOverwriteSliceHandler = useCallback(() => {
    return (
      props.slice?.owners?.includes(props.user.userId) &&
      !props.slice?.is_managed_externally
    );
  }, []);
    useEffect(() => {
    let { dashboardId } = props;
    if (!dashboardId) {
      const lastDashboard = sessionStorage.getItem(SK_DASHBOARD_ID);
      dashboardId = lastDashboard && parseInt(lastDashboard, 10);
    }
    if (dashboardId) {
      try {
        const result = (await loadDashboardHandler(dashboardId)) as Dashboard;
        if (canUserEditDashboard(result, props.user)) {
          setDashboard({ label: result.dashboard_title, value: result.id });
    setLabel(result.dashboard_title);
    setValue(result.id);
        }
      } catch (error) {
        props.actions.addDangerToast(
          t('An error occurred while loading dashboard information.'),
        );
      }
    }
  }, []);
    const handleDatasetNameChangeHandler = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    // @ts-expect-error
    setDatasetName(e.target.value);
  }, []);
    const onSliceNameChangeHandler = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setNewSliceName(event.target.value);
  }, []);
    const onDashboardChangeHandler = useCallback((dashboard: { label: string; value: string | number }) => {
    setDashboard(dashboard);
  }, [dashboard]);
    const changeActionHandler = useCallback((action: SaveActionType) => {
    setAction(action);
  }, [action]);
    const onHideHandler = useCallback(() => {
    props.dispatch(setSaveChartModalVisibility(false));
  }, []);
    const saveOrOverwriteHandler = useCallback(async (gotodash: boolean) => {
    setIsLoading(true);

    //  Create or retrieve dashboard
    type DashboardGetResponse = {
      id: number;
      url: string;
      dashboard_title: string;
    };

    try {
      if (props.datasource?.type === DatasourceType.Query) {
        const { schema, sql, database } = props.datasource;
        const { templateParams } = props.datasource;

        await props.actions.saveDataset({
          schema,
          sql,
          database,
          templateParams,
          datasourceName: datasetName,
        });
      }

      //  Get chart dashboards
      let sliceDashboards: number[] = [];
      if (props.slice && action === 'overwrite') {
        sliceDashboards = await props.actions.getSliceDashboards(
          props.slice,
        );
      }

      const formData = props.form_data || {};
      delete formData.url_params;

      let dashboard: DashboardGetResponse | null = null;
      if (dashboard) {
        let validId = dashboard.value;
        if (isNewDashboardHandler()) {
          const response = await props.actions.createDashboard(
            dashboard.label,
          );
          validId = response.id;
        }

        try {
          setDashboard(await loadDashboardHandler(validId as number));
        } catch (error) {
          props.actions.saveSliceFailed();
          return;
        }

        if (isDefined(dashboard) && isDefined(dashboard?.id)) {
          sliceDashboards = sliceDashboards.includes(dashboard.id)
            ? sliceDashboards
            : [...sliceDashboards, dashboard.id];
          formData.dashboards = sliceDashboards;
        }
      }

      // Sets the form data
      props.actions.setFormData({ ...formData });

      //  Update or create slice
      let value: { id: number };
      if (action === 'overwrite') {
        value = await props.actions.updateSlice(
          props.slice,
          newSliceName,
          sliceDashboards,
          dashboard
            ? {
                title: dashboard.dashboard_title,
                new: isNewDashboardHandler(),
              }
            : null,
        );
      } else {
        value = await props.actions.createSlice(
          newSliceName,
          sliceDashboards,
          dashboard
            ? {
                title: dashboard.dashboard_title,
                new: isNewDashboardHandler(),
              }
            : null,
        );
      }

      if (dashboard) {
        sessionStorage.setItem(SK_DASHBOARD_ID, `${dashboard.id}`);
      } else {
        sessionStorage.removeItem(SK_DASHBOARD_ID);
      }

      // Go to new dashboard url
      if (gotodash && dashboard) {
        props.history.push(dashboard.url);
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('save_action', action);
      if (action !== 'overwrite') {
        searchParams.delete('form_data_key');
      }
      if (action === 'saveas') {
        searchParams.set('slice_id', value.id.toString());
      }
      props.history.replace(`/explore/?${searchParams.toString()}`);

      setIsLoading(false);
      onHideHandler();
    } finally {
      setIsLoading(false);
    }
  }, [datasetName, action, dashboard, newSliceName]);
    const loadDashboardHandler = useCallback(async (id: number) => {
    const response = await SupersetClient.get({
      endpoint: `/api/v1/dashboard/${id}`,
    });
    return response.json.result;
  }, []);
    const loadDashboardsHandler = useCallback(async (search: string, page: number, pageSize: number) => {
    const queryParams = rison.encode({
      columns: ['id', 'dashboard_title'],
      filters: [
        {
          col: 'dashboard_title',
          opr: 'ct',
          value: search,
        },
        {
          col: 'owners',
          opr: 'rel_m_m',
          value: props.user.userId,
        },
      ],
      page,
      page_size: pageSize,
      order_column: 'dashboard_title',
    });

    const { json } = await SupersetClient.get({
      endpoint: `/api/v1/dashboard/?q=${queryParams}`,
    });
    const { result, count } = json;
    return {
      data: result.map(
        (dashboard: { id: number; dashboard_title: string }) => ({
          value: dashboard.id,
          label: dashboard.dashboard_title,
        }),
      ),
      totalCount: count,
    };
  }, [dashboard]);
    const renderSaveChartModalHandler = useCallback(() => {
    const info = infoHandler();
    return (
      <Form data-test="save-modal-body" layout="vertical">
        <FormItem data-test="radio-group">
          <Radio
            id="overwrite-radio"
            disabled={!canOverwriteSliceHandler()}
            checked={action === 'overwrite'}
            onChange={() => changeActionHandler('overwrite')}
            data-test="save-overwrite-radio"
          >
            {t('Save (Overwrite)')}
          </Radio>
          <Radio
            id="saveas-radio"
            data-test="saveas-radio"
            checked={action === 'saveas'}
            onChange={() => changeActionHandler('saveas')}
          >
            {t('Save as...')}
          </Radio>
        </FormItem>
        <hr />
        <FormItem label={t('Chart name')} required>
          <Input
            name="new_slice_name"
            type="text"
            placeholder="Name"
            value={newSliceName}
            onChange={onSliceNameChangeHandler}
            data-test="new-chart-name"
          />
        </FormItem>
        {props.datasource?.type === 'query' && (
          <FormItem label={t('Dataset Name')} required>
            <InfoTooltipWithTrigger
              tooltip={t('A reusable dataset will be saved with your chart.')}
              placement="right"
            />
            <Input
              name="dataset_name"
              type="text"
              placeholder="Dataset Name"
              value={datasetName}
              onChange={handleDatasetNameChangeHandler}
              data-test="new-dataset-name"
            />
          </FormItem>
        )}
        {!(
          isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS) &&
          vizType === 'filter_box'
        ) && (
          <FormItem
            label={t('Add to dashboard')}
            data-test="save-chart-modal-select-dashboard-form"
          >
            <AsyncSelect
              allowClear
              allowNewOptions
              ariaLabel={t('Select a dashboard')}
              options={loadDashboardsHandler}
              onChange={onDashboardChangeHandler}
              value={dashboard}
              placeholder={
                <div>
                  <b>{t('Select')}</b>
                  {t(' a dashboard OR ')}
                  <b>{t('create')}</b>
                  {t(' a new one')}
                </div>
              }
            />
          </FormItem>
        )}
        {info && <Alert type="info" message={info} closable={false} />}
        {props.alert && (
          <Alert
            css={{ marginTop: info ? 16 : undefined }}
            type="warning"
            message={props.alert}
            closable={false}
          />
        )}
      </Form>
    );
  }, [action, newSliceName, datasetName, vizType, dashboard]);
    const infoHandler = useCallback(() => {
    const isNewDashboard = isNewDashboardHandler();
    let chartWillBeCreated = false;
    if (
      props.slice &&
      (action !== 'overwrite' || !canOverwriteSliceHandler())
    ) {
      chartWillBeCreated = true;
    }
    if (chartWillBeCreated && isNewDashboard) {
      return t('A new chart and dashboard will be created.');
    }
    if (chartWillBeCreated) {
      return t('A new chart will be created.');
    }
    if (isNewDashboard) {
      return t('A new dashboard will be created.');
    }
    return null;
  }, [action]);
    const renderFooterHandler = useCallback(() => (
    <div data-test="save-modal-footer">
      <Button id="btn_cancel" buttonSize="small" onClick={onHideHandler}>
        {t('Cancel')}
      </Button>
      <Button
        id="btn_modal_save_goto_dash"
        buttonSize="small"
        disabled={
          !newSliceName ||
          !dashboard ||
          (props.datasource?.type !== DatasourceType.Table &&
            !datasetName) ||
          (isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS) &&
            vizType === 'filter_box')
        }
        onClick={() => saveOrOverwriteHandler(true)}
      >
        {t('Save & go to dashboard')}
      </Button>
      <Button
        id="btn_modal_save"
        buttonSize="small"
        buttonStyle="primary"
        onClick={() => saveOrOverwriteHandler(false)}
        disabled={
          isLoading ||
          !newSliceName ||
          (props.datasource?.type !== DatasourceType.Table &&
            !datasetName)
        }
        data-test="btn-modal-save"
      >
        {t('Save')}
      </Button>
    </div>
  ), [newSliceName, dashboard, datasetName, vizType, isLoading]);

    return (
      <StyledModal
        show={props.isVisible}
        onHide={onHideHandler}
        title={t('Save chart')}
        footer={renderFooterHandler()}
      >
        {isLoading ? (
          <div
            css={css`
              display: flex;
              justify-content: center;
            `}
          >
            <Loading position="normal" />
          </div>
        ) : (
          renderSaveChartModalHandler()
        )}
      </StyledModal>
    ); 
};




interface StateProps {
  datasource: any;
  slice: any;
  user: UserWithPermissionsAndRoles;
  dashboards: any;
  alert: any;
  isVisible: boolean;
}

function mapStateToProps({
  explore,
  saveModal,
  user,
}: Record<string, any>): StateProps {
  return {
    datasource: explore.datasource,
    slice: explore.slice,
    user,
    dashboards: saveModal.dashboards,
    alert: saveModal.saveModalAlert,
    isVisible: saveModal.isVisible,
  };
}

export default withRouter(connect(mapStateToProps)(SaveModal));
