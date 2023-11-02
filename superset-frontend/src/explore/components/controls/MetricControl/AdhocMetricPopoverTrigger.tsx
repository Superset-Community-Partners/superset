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

import { ReactNode, useState, useCallback } from "react";
import { Metric, t } from '@superset-ui/core';
import AdhocMetricEditPopoverTitle from 'src/explore/components/controls/MetricControl/AdhocMetricEditPopoverTitle';
import { ExplorePopoverContent } from 'src/explore/components/ExploreContentPopover';
import {
    ISaveableDatasource,
    SaveDatasetModal,
} from 'src/SqlLab/components/SaveDatasetModal';
import { Datasource } from 'src/explore/types';
import AdhocMetricEditPopover, {
    SAVED_TAB_KEY,
} from './AdhocMetricEditPopover';
import AdhocMetric from './AdhocMetric';
import { savedMetricType } from './types';
import ControlPopover from '../ControlPopover/ControlPopover';

export type AdhocMetricPopoverTriggerProps = {
  adhocMetric: AdhocMetric;
  onMetricEdit(newMetric: Metric, oldMetric: Metric): void;
  columns: { column_name: string; type: string }[];
  savedMetricsOptions: savedMetricType[];
  savedMetric: savedMetricType;
  datasource: Datasource & ISaveableDatasource;
  children: ReactNode;
  isControlledComponent?: boolean;
  visible?: boolean;
  togglePopover?: (visible: boolean) => void;
  closePopover?: () => void;
  isNew?: boolean;
};

export type AdhocMetricPopoverTriggerState = {
  adhocMetric: AdhocMetric;
  popoverVisible: boolean;
  title: { label: string; hasCustomLabel: boolean };
  currentLabel: string;
  labelModified: boolean;
  isTitleEditDisabled: boolean;
  showSaveDatasetModal: boolean;
};

const AdhocMetricPopoverTrigger = (props: AdhocMetricPopoverTriggerProps) => {


    const [adhocMetric, setAdhocMetric] = useState(props.adhocMetric);
    const [popoverVisible, setPopoverVisible] = useState(false);
    const [title, setTitle] = useState({
        label: props.adhocMetric.label,
        hasCustomLabel: props.adhocMetric.hasCustomLabel,
      });
    const [currentLabel, setCurrentLabel] = useState('');
    const [labelModified, setLabelModified] = useState(false);
    const [isTitleEditDisabled, setIsTitleEditDisabled] = useState(false);
    const [showSaveDatasetModal, setShowSaveDatasetModal] = useState(false);

    const onLabelChangeHandler = useCallback((e: any) => {
    const { verbose_name, metric_name } = props.savedMetric;
    const defaultMetricLabel = props.adhocMetric?.getDefaultLabel();
    const label = e.target.value;
    setStateHandler(state => ({
      title: {
        label:
          label ||
          state.currentLabel ||
          verbose_name ||
          metric_name ||
          defaultMetricLabel,
        hasCustomLabel: !!label,
      },
      labelModified: true,
    }));
  }, []);
    const onPopoverResizeHandler = useCallback(() => {
    forceUpdateHandler();
  }, []);
    const handleDatasetModalHandler = useCallback((showModal: boolean) => {
    setShowSaveDatasetModal(showModal);
  }, []);
    const closePopoverHandler = useCallback(() => {
    togglePopoverHandler(false);
    setLabelModified(false);
  }, []);
    const togglePopoverHandler = useCallback((visible: boolean) => {
    setPopoverVisible(visible);
  }, []);
    const getCurrentTabHandler = useCallback((tab: string) => {
    setIsTitleEditDisabled(tab === SAVED_TAB_KEY);
  }, []);
    const getCurrentLabelHandler = useCallback(({
    savedMetricLabel,
    adhocMetricLabel,
  }: {
    savedMetricLabel: string;
    adhocMetricLabel: string;
  }) => {
    const currentLabel = savedMetricLabel || adhocMetricLabel;
    setCurrentLabel(currentLabel)
    setLabelModified(true);
    if (savedMetricLabel || !title.hasCustomLabel) {
      setTitle({
          label: currentLabel,
          hasCustomLabel: false,
        });
    }
  }, [currentLabel, title]);
    const onChangeHandler = useCallback((newMetric: Metric, oldMetric: Metric) => {
    props.onMetricEdit({ ...newMetric, ...title }, oldMetric);
  }, [title]);

    const {
      adhocMetric,
      savedMetric,
      columns,
      savedMetricsOptions,
      datasource,
      isControlledComponent,
    } = props;
    const { verbose_name, metric_name } = savedMetric;
    const { hasCustomLabel, label } = adhocMetric;
    const adhocMetricLabel = hasCustomLabel
      ? label
      : adhocMetric.getDefaultLabel();
    const title = labelModified
      ? title
      : {
          label: verbose_name || metric_name || adhocMetricLabel,
          hasCustomLabel,
        };

    const { visible, togglePopover, closePopover } = isControlledComponent
      ? {
          visible: props.visible,
          togglePopover: props.togglePopover,
          closePopover: props.closePopover,
        }
      : {
          visible: popoverVisible,
          togglePopover: togglePopoverHandler,
          closePopover: closePopoverHandler,
        };

    const overlayContent = (
      <ExplorePopoverContent>
        <AdhocMetricEditPopover
          adhocMetric={adhocMetric}
          columns={columns}
          savedMetricsOptions={savedMetricsOptions}
          savedMetric={savedMetric}
          datasource={datasource}
          handleDatasetModal={handleDatasetModalHandler}
          onResize={onPopoverResizeHandler}
          onClose={closePopover}
          onChange={onChangeHandler}
          getCurrentTab={getCurrentTabHandler}
          getCurrentLabel={getCurrentLabelHandler}
          isNewMetric={props.isNew}
          isLabelModified={
            labelModified &&
            adhocMetricLabel !== title.label
          }
        />
      </ExplorePopoverContent>
    );

    const popoverTitle = (
      <AdhocMetricEditPopoverTitle
        title={title}
        onChange={onLabelChangeHandler}
        isEditDisabled={isTitleEditDisabled}
      />
    );

    return (
      <>
        {showSaveDatasetModal && (
          <SaveDatasetModal
            visible={showSaveDatasetModal}
            onHide={() => handleDatasetModalHandler(false)}
            buttonTextOnSave={t('Save')}
            buttonTextOnOverwrite={t('Overwrite')}
            modalDescription={t(
              'Save this query as a virtual dataset to continue exploring',
            )}
            datasource={datasource}
          />
        )}
        <ControlPopover
          placement="right"
          trigger="click"
          content={overlayContent}
          defaultVisible={visible}
          visible={visible}
          onVisibleChange={togglePopover}
          title={popoverTitle}
          destroyTooltipOnHide
        >
          {props.children}
        </ControlPopover>
      </>
    ); 
};

AdhocMetricPopoverTrigger.getDerivedStateFromProps = (nextProps: AdhocMetricPopoverTriggerProps,
    prevState: AdhocMetricPopoverTriggerState) => {
    if (prevState.adhocMetric.optionName !== nextProps.adhocMetric.optionName) {
      return {
        adhocMetric: nextProps.adhocMetric,
        title: {
          label: nextProps.adhocMetric.label,
          hasCustomLabel: nextProps.adhocMetric.hasCustomLabel,
        },
        currentLabel: '',
        labelModified: false,
      };
    }
    return {
      adhocMetric: nextProps.adhocMetric,
    };
  };


export default AdhocMetricPopoverTrigger;
