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
/* eslint-env browser */

import { useState, useRef, useCallback } from 'react';
import { Radio } from 'src/components/Radio';
import { RadioChangeEvent } from 'src/components';
import { Input } from 'src/components/Input';
import Button from 'src/components/Button';
import { t, JsonResponse } from '@superset-ui/core';

import ModalTrigger, { ModalTriggerRef } from 'src/components/ModalTrigger';
import Checkbox from 'src/components/Checkbox';
import {
  SAVE_TYPE_OVERWRITE,
  SAVE_TYPE_NEWDASHBOARD,
} from 'src/dashboard/util/constants';

type SaveType = typeof SAVE_TYPE_OVERWRITE | typeof SAVE_TYPE_NEWDASHBOARD;

type SaveModalProps = {
  addSuccessToast: (arg: string) => void;
  addDangerToast: (arg: string) => void;
  dashboardId: number;
  dashboardTitle: string;
  dashboardInfo: Record<string, any>;
  expandedSlices: Record<string, any>;
  layout: Record<string, any>;
  saveType: SaveType;
  triggerNode: JSX.Element;
  customCss: string;
  colorNamespace?: string;
  colorScheme?: string;
  onSave: (data: any, id: number | string, saveType: SaveType) => void;
  canOverwrite: boolean;
  shouldPersistRefreshFrequency: boolean;
  refreshFrequency: number;
  lastModifiedTime: number;
};

type SaveModalState = {
  saveType: SaveType;
  newDashName: string;
  duplicateSlices: boolean;
};

const defaultProps = {
  saveType: SAVE_TYPE_OVERWRITE,
  colorNamespace: undefined,
  colorScheme: undefined,
  shouldPersistRefreshFrequency: false,
};

const SaveModal = (inputProps: SaveModalProps) => {
  const [saveType, setSaveType] = useState(props.saveType);
  const [newDashName, setNewDashName] = useState(
    `${props.dashboardTitle} ${t('[copy]')}`,
  );
  const [duplicateSlices, setDuplicateSlices] = useState(false);

  const props = {
    ...defaultProps,
    ...inputProps,
  };
  const modal = useRef<ModalTriggerRef | null>();
  const onSave =
    useRef<
      (
        data: Record<string, any>,
        dashboardId: number | string,
        saveType: SaveType,
      ) => Promise<JsonResponse>
    >();
  const toggleDuplicateSlicesHandler = useCallback(() => {
    setStateHandler(prevState => ({
      duplicateSlices: !prevState.duplicateSlices,
    }));
  }, []);
  const handleSaveTypeChangeHandler = useCallback((event: RadioChangeEvent) => {
    setSaveType((event.target as HTMLInputElement).value as SaveType);
  }, []);
  const handleNameChangeHandler = useCallback((name: string) => {
    setNewDashName(name);
    setSaveType(SAVE_TYPE_NEWDASHBOARD);
  }, []);
  const saveDashboardHandler = useCallback(() => {
    const {
      dashboardTitle,
      dashboardInfo,
      layout: positions,
      customCss,
      dashboardId,
      refreshFrequency: currentRefreshFrequency,
      shouldPersistRefreshFrequency,
      lastModifiedTime,
    } = props;

    // check refresh frequency is for current session or persist
    const refreshFrequency = shouldPersistRefreshFrequency
      ? currentRefreshFrequency
      : dashboardInfo.metadata?.refresh_frequency; // eslint-disable camelcase

    const data = {
      certified_by: dashboardInfo.certified_by,
      certification_details: dashboardInfo.certification_details,
      css: customCss,
      dashboard_title:
        saveType === SAVE_TYPE_NEWDASHBOARD ? newDashName : dashboardTitle,
      duplicate_slices: duplicateSlices,
      last_modified_time: lastModifiedTime,
      owners: dashboardInfo.owners,
      roles: dashboardInfo.roles,
      metadata: {
        ...dashboardInfo?.metadata,
        positions,
        refresh_frequency: refreshFrequency,
      },
    };

    if (saveType === SAVE_TYPE_NEWDASHBOARD && !newDashName) {
      props.addDangerToast(t('You must pick a name for the new dashboard'));
    } else {
      onSave.current(data, dashboardId, saveType).then((resp: JsonResponse) => {
        if (saveType === SAVE_TYPE_NEWDASHBOARD && resp.json?.result?.id) {
          window.location.href = `/superset/dashboard/${resp.json.result.id}/`;
        }
      });
      modal?.current?.close?.();
    }
  }, [saveType, newDashName, duplicateSlices]);

  return (
    <ModalTrigger
      ref={modal.current}
      triggerNode={props.triggerNode}
      modalTitle={t('Save dashboard')}
      modalBody={
        <div>
          <Radio
            value={SAVE_TYPE_OVERWRITE}
            onChange={handleSaveTypeChangeHandler}
            checked={saveType === SAVE_TYPE_OVERWRITE}
            disabled={!props.canOverwrite}
          >
            {t('Overwrite Dashboard [%s]', props.dashboardTitle)}
          </Radio>
          <hr />
          <Radio
            value={SAVE_TYPE_NEWDASHBOARD}
            onChange={handleSaveTypeChangeHandler}
            checked={saveType === SAVE_TYPE_NEWDASHBOARD}
          >
            {t('Save as:')}
          </Radio>
          <Input
            type="text"
            placeholder={t('[dashboard name]')}
            value={newDashName}
            onFocus={e => handleNameChangeHandler(e.target.value)}
            onChange={e => handleNameChangeHandler(e.target.value)}
          />
          <div className="m-l-25 m-t-5">
            <Checkbox
              checked={duplicateSlices}
              onChange={() => toggleDuplicateSlicesHandler()}
            />
            <span className="m-l-5">{t('also copy (duplicate) charts')}</span>
          </div>
        </div>
      }
      modalFooter={
        <div>
          <Button
            data-test="modal-save-dashboard-button"
            buttonStyle="primary"
            onClick={saveDashboardHandler}
          >
            {t('Save')}
          </Button>
        </div>
      }
    />
  );
};

export default SaveModal;
