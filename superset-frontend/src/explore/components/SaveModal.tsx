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
import { Input } from 'src/components/Input';
import { Form, FormItem } from 'src/components/Form';
import Alert from 'src/components/Alert';
import { t, styled } from '@superset-ui/core';
import ReactMarkdown from 'react-markdown';
import Modal from 'src/components/Modal';
import { Radio } from 'src/components/Radio';
import Button from 'src/components/Button';
import { Select } from 'src/components';
import { SelectValue } from 'antd/lib/select';
import { connect } from 'react-redux';
import { withRouter, RouteComponentProps } from 'react-router-dom';

// Session storage key for recent dashboard
const SK_DASHBOARD_ID = 'save_chart_recent_dashboard';
const SELECT_PLACEHOLDER = t('**Select** a dashboard OR **create** a new one');

interface SaveModalProps extends RouteComponentProps {
  onHide: () => void;
  actions: Record<string, any>;
  form_data?: Record<string, any>;
  userId: number;
  dashboards: Array<any>;
  alert?: string;
  sliceName?: string;
  slice?: Record<string, any>;
  datasource?: Record<string, any>;
  dashboardId: '' | number | null;
  sliceDashboards: number[];
}

type ActionType = 'overwrite' | 'saveas';

type SaveModalState = {
  saveToDashboardId: number | string | null;
  newSliceName?: string;
  newDashboardName?: string;
  alert: string | null;
  action: ActionType;
};

export const StyledModal = styled(Modal)`
  .ant-modal-body {
    overflow: visible;
  }
`;

const SaveModal = (props: SaveModalProps) => {


    const [saveToDashboardId, setSaveToDashboardId] = useState(null);
    const [newSliceName, setNewSliceName] = useState(props.sliceName);
    const [alert, setAlert] = useState(null);
    const [action, setAction] = useState(canOverwriteSliceHandler() ? 'overwrite' : 'saveas');

    const isNewDashboardHandler = useCallback(() => {
    return !!(!saveToDashboardId && newDashboardName);
  }, [saveToDashboardId]);
    const canOverwriteSliceHandler = useCallback(() => {
    return (
      props.slice?.owners?.includes(props.userId) &&
      !props.slice?.is_managed_externally
    );
  }, []);
    useEffect(() => {
    props.actions.fetchDashboards(props.userId).then(() => {
      const dashboardIds = props.dashboards.map(
        dashboard => dashboard.value
      );
      const lastDashboard = sessionStorage.getItem(SK_DASHBOARD_ID);
      let recentDashboard = lastDashboard && parseInt(lastDashboard, 10);

      if (props.dashboardId) {
        recentDashboard = props.dashboardId;
      }

      if (
        recentDashboard !== null &&
        dashboardIds.indexOf(recentDashboard) !== -1
      ) {
        setSaveToDashboardId(recentDashboard);
      }
    });
  }, []);
    const onSliceNameChangeHandler = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setNewSliceName(event.target.value);
  }, []);
    const onDashboardSelectChangeHandler = useCallback((selected: SelectValue) => {
    const newDashboardName = selected ? String(selected) : undefined;
    const saveToDashboardId =
      selected && typeof selected === 'number' ? selected : null;
    setSaveToDashboardId(saveToDashboardId);
    setNewDashboardName(newDashboardName);
  }, [saveToDashboardId]);
    const changeActionHandler = useCallback((action: ActionType) => {
    setAction(action);
  }, [action]);
    const saveOrOverwriteHandler = useCallback((gotodash: boolean) => {
    setAlert(null);
    props.actions.removeSaveModalAlert();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { url_params, ...formData } = props.form_data || {};

    let promise = Promise.resolve();

    //  Create or retrieve dashboard
    type DashboardGetResponse = {
      id: number;
      url: string;
      dashboard_title: string;
    };

    let dashboard: DashboardGetResponse | null = null;
    if (newDashboardName || saveToDashboardId) {
      let saveToDashboardId = saveToDashboardId || null;
      if (!saveToDashboardId) {
        promise = promise
          .then(() =>
            props.actions.createDashboard(newDashboardName)
          )
          .then((response: { id: number }) => {
            setSaveToDashboardId(response.id);
          });
      }

      promise = promise
        .then(() => props.actions.getDashboard(saveToDashboardId))
        .then((response: { result: DashboardGetResponse }) => {
          dashboard = response.result;
          const dashboards = new Set<number>(props.sliceDashboards);
          dashboards.add(dashboard.id);
          formData.dashboards = Array.from(dashboards);
        });
    }

    //  Update or create slice
    if (action === 'overwrite') {
      promise = promise.then(() =>
        props.actions.updateSlice(
          props.slice,
          newSliceName,
          formData,
          dashboard
            ? {
                title: dashboard.dashboard_title,
                new: !saveToDashboardId
              }
            : null
        )
      );
    } else {
      promise = promise.then(() =>
        props.actions.createSlice(
          newSliceName,
          formData,
          dashboard
            ? {
                title: dashboard.dashboard_title,
                new: !saveToDashboardId
              }
            : null
        )
      );
    }

    promise.then(((value: { id: number }) => {
      //  Update recent dashboard
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
      searchParams.delete('form_data_key');
      if (action === 'saveas') {
        searchParams.set('slice_id', value.id.toString());
      }
      props.history.replace(`/explore/?${searchParams.toString()}`);
    }) as (value: any) => void);

    props.onHide();
  }, [saveToDashboardId, action, newSliceName]);
    const removeAlertHandler = useCallback(() => {
    if (props.alert) {
      props.actions.removeSaveModalAlert();
    }
    setAlert(null);
  }, []);

    const dashboardSelectValue =
      saveToDashboardId || newDashboardName;
    return (
      <StyledModal
        show
        onHide={props.onHide}
        title={t('Save chart')}
        footer={
          <div data-test="save-modal-footer">
            <Button
              id="btn_cancel"
              buttonSize="small"
              onClick={props.onHide}
            >
              {t('Cancel')}
            </Button>
            <Button
              id="btn_modal_save_goto_dash"
              buttonSize="small"
              disabled={
                !newSliceName ||
                (!saveToDashboardId && !newDashboardName)
              }
              onClick={() => saveOrOverwriteHandler(true)}
            >
              {isNewDashboardHandler()
                ? t('Save & go to new dashboard')
                : t('Save & go to dashboard')}
            </Button>
            <Button
              id="btn_modal_save"
              buttonSize="small"
              buttonStyle="primary"
              onClick={() => saveOrOverwriteHandler(false)}
              disabled={!newSliceName}
              data-test="btn-modal-save"
            >
              {!canOverwriteSliceHandler() && props.slice
                ? t('Save as new chart')
                : isNewDashboardHandler()
                ? t('Save to new dashboard')
                : t('Save')}
            </Button>
          </div>
        }
      >
        <Form data-test="save-modal-body" layout="vertical">
          {(alert || props.alert) && (
            <Alert
              type="warning"
              message={
                <>
                  {alert ? alert : props.alert}
                  <i
                    role="button"
                    aria-label="Remove alert"
                    tabIndex={0}
                    className="fa fa-close pull-right"
                    onClick={removeAlertHandler.bind(this)}
                    style={{ cursor: 'pointer' }}
                  />
                </>
              }
            />
          )}
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
          <FormItem
            label={t('Add to dashboard')}
            data-test="save-chart-modal-select-dashboard-form"
          >
            <Select
              allowClear
              allowNewOptions
              ariaLabel={t('Select a dashboard')}
              options={props.dashboards}
              onChange={onDashboardSelectChangeHandler}
              value={dashboardSelectValue || undefined}
              placeholder={
                // Using markdown to allow for good i18n
                <ReactMarkdown
                  source={SELECT_PLACEHOLDER}
                  renderers={{ paragraph: 'span' }}
                />
              }
            />
          </FormItem>
        </Form>
      </StyledModal>
    ); 
};




interface StateProps {
  datasource: any;
  slice: any;
  userId: any;
  dashboards: any;
  alert: any;
}

function mapStateToProps({
  explore,
  saveModal,
  user
}: Record<string, any>): StateProps {
  return {
    datasource: explore.datasource,
    slice: explore.slice,
    userId: user?.userId,
    dashboards: saveModal.dashboards,
    alert: saveModal.saveModalAlert
  };
}

export default withRouter(connect(mapStateToProps, () => ({}))(SaveModal));
