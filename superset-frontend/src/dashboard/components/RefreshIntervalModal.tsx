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

import { useState, useRef, useCallback } from 'react';
import Select from 'src/components/Select/Select';
import { t, styled } from '@superset-ui/core';
import Alert from 'src/components/Alert';
import Button from 'src/components/Button';

import ModalTrigger, { ModalTriggerRef } from 'src/components/ModalTrigger';
import { FormLabel } from 'src/components/Form';
import { propertyComparator } from 'src/components/Select/utils';

const StyledModalTrigger = styled(ModalTrigger)`
  .ant-modal-body {
    overflow: visible;
  }
`;

const RefreshWarningContainer = styled.div`
  margin-top: ${({ theme }) => theme.gridUnit * 6}px;
`;

type RefreshIntervalModalProps = {
  addSuccessToast: (msg: string) => void;
  triggerNode: JSX.Element;
  refreshFrequency: number;
  onChange: (refreshLimit: number, editMode: boolean) => void;
  editMode: boolean;
  refreshLimit?: number;
  refreshWarning: string | null;
  refreshIntervalOptions: [number, string][];
};

type RefreshIntervalModalState = {
  refreshFrequency: number;
};

const RefreshIntervalModal = (inputProps: RefreshIntervalModalProps) => {


    const [refreshFrequency, setRefreshFrequency] = useState(props.refreshFrequency);
    const [refreshFrequency = 0, setRefreshFrequency = 0] = useState();

    const props = { 
    refreshLimit: 0,
    refreshWarning: null,,
    ...inputProps,
  };
    const modalRef = useRef<ModalTriggerRef | null>();
    const onSaveHandler = useCallback(() => {
    props.onChange(refreshFrequency, props.editMode);
    modalRef?.current?.close();
    props.addSuccessToast(t('Refresh interval saved'));
  }, [refreshFrequency]);
    const onCancelHandler = useCallback(() => {
    setRefreshFrequency(props.refreshFrequency);
    modalRef?.current?.close();
  }, []);
    const handleFrequencyChangeHandler = useCallback((value: number) => {
    const { refreshIntervalOptions } = props;
    setRefreshFrequency(value || refreshIntervalOptions[0][0]);
  }, []);

    const {
      refreshLimit = 0,
      refreshWarning,
      editMode,
      refreshIntervalOptions,
    } = props;
     
    const showRefreshWarning =
      !!refreshFrequency && !!refreshWarning && refreshFrequency < refreshLimit;

    return (
      <StyledModalTrigger
        ref={modalRef.current}
        triggerNode={props.triggerNode}
        modalTitle={t('Refresh interval')}
        modalBody={
          <div>
            <FormLabel>{t('Refresh frequency')}</FormLabel>
            <Select
              ariaLabel={t('Refresh interval')}
              options={refreshIntervalOptions.map(option => ({
                value: option[0],
                label: t(option[1]),
              }))}
              value={refreshFrequency}
              onChange={handleFrequencyChangeHandler}
              sortComparator={propertyComparator('value')}
            />
            {showRefreshWarning && (
              <RefreshWarningContainer>
                <Alert
                  type="warning"
                  message={
                    <>
                      <div>{refreshWarning}</div>
                      <br />
                      <strong>{t('Are you sure you want to proceed?')}</strong>
                    </>
                  }
                />
              </RefreshWarningContainer>
            )}
          </div>
        }
        modalFooter={
          <>
            <Button
              buttonStyle="primary"
              buttonSize="small"
              onClick={onSaveHandler}
            >
              {editMode ? t('Save') : t('Save for this session')}
            </Button>
            <Button onClick={onCancelHandler} buttonSize="small">
              {t('Cancel')}
            </Button>
          </>
        }
      />
    ); 
};




export default RefreshIntervalModal;
