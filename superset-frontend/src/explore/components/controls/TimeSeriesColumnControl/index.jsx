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

import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'src/components/Input';
import Button from 'src/components/Button';
import { Select, Row, Col } from 'src/components';
import { t, styled } from '@superset-ui/core';
import { InfoTooltipWithTrigger } from '@superset-ui/chart-controls';
import BoundsControl from '../BoundsControl';
import CheckboxControl from '../CheckboxControl';
import ControlPopover from '../ControlPopover/ControlPopover';

const propTypes = {
  label: PropTypes.string,
  tooltip: PropTypes.string,
  colType: PropTypes.string,
  width: PropTypes.string,
  height: PropTypes.string,
  timeLag: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  timeRatio: PropTypes.string,
  comparisonType: PropTypes.string,
  showYAxis: PropTypes.bool,
  yAxisBounds: PropTypes.array,
  bounds: PropTypes.array,
  d3format: PropTypes.string,
  dateFormat: PropTypes.string,
  onChange: PropTypes.func,
};

const defaultProps = {
  label: t('Time series columns'),
  tooltip: '',
  colType: '',
  width: '',
  height: '',
  timeLag: '',
  timeRatio: '',
  comparisonType: '',
  showYAxis: false,
  yAxisBounds: [null, null],
  bounds: [null, null],
  d3format: '',
  dateFormat: '',
};

const comparisonTypeOptions = [
  { value: 'value', label: t('Actual value'), key: 'value' },
  { value: 'diff', label: t('Difference'), key: 'diff' },
  { value: 'perc', label: t('Percentage'), key: 'perc' },
  { value: 'perc_change', label: t('Percentage change'), key: 'perc_change' },
];

const colTypeOptions = [
  { value: 'time', label: t('Time comparison'), key: 'time' },
  { value: 'contrib', label: t('Contribution'), key: 'contrib' },
  { value: 'spark', label: t('Sparkline'), key: 'spark' },
  { value: 'avg', label: t('Period average'), key: 'avg' },
];

const StyledRow = styled(Row)`
  margin-top: ${({ theme }) => theme.gridUnit * 2}px;
  display: flex;
  align-items: center;
`;

const StyledCol = styled(Col)`
  display: flex;
  align-items: center;
`;

const StyledTooltip = styled(InfoTooltipWithTrigger)`
  margin-left: ${({ theme }) => theme.gridUnit}px;
  color: ${({ theme }) => theme.colors.grayscale.light1};
`;

const ButtonBar = styled.div`
  margin-top: ${({ theme }) => theme.gridUnit * 5}px;
  display: flex;
  justify-content: center;
`;

const TimeSeriesColumnControl = props => {
  const [label, setLabel] = useState();
  const [popoverVisible, setPopoverVisible] = useState();

  const initialStateHandler = useCallback(() => {
    return {
      label: props.label,
      tooltip: props.tooltip,
      colType: props.colType,
      width: props.width,
      height: props.height,
      timeLag: props.timeLag || 0,
      timeRatio: props.timeRatio,
      comparisonType: props.comparisonType,
      showYAxis: props.showYAxis,
      yAxisBounds: props.yAxisBounds,
      bounds: props.bounds,
      d3format: props.d3format,
      dateFormat: props.dateFormat,
      popoverVisible: false,
    };
  }, []);
  const resetStateHandler = useCallback(() => {
    const initialState = initialStateHandler();
    setStateHandler({ ...initialState });
  }, []);
  const onSaveHandler = useCallback(() => {
    props.onChange(stateHandler);
    setPopoverVisible(false);
  }, []);
  const onCloseHandler = useCallback(() => {
    resetStateHandler();
  }, []);
  const onSelectChangeHandler = useCallback((attr, opt) => {
    set[attr](opt);
  }, []);
  const onTextInputChangeHandler = useCallback((attr, event) => {
    set[attr](event.target.value);
  }, []);
  const onCheckboxChangeHandler = useCallback((attr, value) => {
    set[attr](value);
  }, []);
  const onBoundsChangeHandler = useCallback(bounds => {
    setBounds(bounds);
  }, []);
  const onPopoverVisibleChangeHandler = useCallback(
    popoverVisible => {
      if (popoverVisible) {
        setPopoverVisible(popoverVisible);
      } else {
        resetStateHandler();
      }
    },
    [popoverVisible],
  );
  const onYAxisBoundsChangeHandler = useCallback(yAxisBounds => {
    setYAxisBounds(yAxisBounds);
  }, []);
  const textSummaryHandler = useCallback(() => {
    return `${props.label}`;
  }, []);
  const formRowHandler = useCallback(
    (label, tooltip, ttLabel, control) => {
      return (
        <StyledRow>
          <StyledCol xs={24} md={11}>
            {label}
            <StyledTooltip placement="top" tooltip={tooltip} label={ttLabel} />
          </StyledCol>
          <Col xs={24} md={13}>
            {control}
          </Col>
        </StyledRow>
      );
    },
    [label],
  );
  const renderPopoverHandler = useCallback(() => {
    return (
      <div id="ts-col-popo" style={{ width: 320 }}>
        {formRowHandler(
          t('Label'),
          t('The column header label'),
          'time-lag',
          <Input
            value={label}
            onChange={onTextInputChangeHandler.bind(this, 'label')}
            placeholder={t('Label')}
          />,
        )}
        {formRowHandler(
          t('Tooltip'),
          t('Column header tooltip'),
          'col-tooltip',
          <Input
            value={tooltip}
            onChange={onTextInputChangeHandler.bind(this, 'tooltip')}
            placeholder={t('Tooltip')}
          />,
        )}
        {formRowHandler(
          t('Type'),
          t('Type of comparison, value difference or percentage'),
          'col-type',
          <Select
            ariaLabel={t('Type')}
            value={colType || undefined}
            onChange={onSelectChangeHandler.bind(this, 'colType')}
            options={colTypeOptions}
          />,
        )}
        <hr />
        {colType === 'spark' &&
          formRowHandler(
            t('Width'),
            t('Width of the sparkline'),
            'spark-width',
            <Input
              value={width}
              onChange={onTextInputChangeHandler.bind(this, 'width')}
              placeholder={t('Width')}
            />,
          )}
        {colType === 'spark' &&
          formRowHandler(
            t('Height'),
            t('Height of the sparkline'),
            'spark-width',
            <Input
              value={height}
              onChange={onTextInputChangeHandler.bind(this, 'height')}
              placeholder={t('Height')}
            />,
          )}
        {['time', 'avg'].indexOf(colType) >= 0 &&
          formRowHandler(
            t('Time lag'),
            t('Number of periods to compare against'),
            'time-lag',
            <Input
              value={timeLag}
              onChange={onTextInputChangeHandler.bind(this, 'timeLag')}
              placeholder={t('Time Lag')}
            />,
          )}
        {['spark'].indexOf(colType) >= 0 &&
          formRowHandler(
            t('Time ratio'),
            t('Number of periods to ratio against'),
            'time-ratio',
            <Input
              value={timeRatio}
              onChange={onTextInputChangeHandler.bind(this, 'timeRatio')}
              placeholder={t('Time Ratio')}
            />,
          )}
        {colType === 'time' &&
          formRowHandler(
            t('Type'),
            t('Type of comparison, value difference or percentage'),
            'comp-type',
            <Select
              ariaLabel={t('Type')}
              value={comparisonType || undefined}
              onChange={onSelectChangeHandler.bind(this, 'comparisonType')}
              options={comparisonTypeOptions}
            />,
          )}
        {colType === 'spark' &&
          formRowHandler(
            t('Show Y-axis'),
            t(
              'Show Y-axis on the sparkline. Will display the manually set min/max if set or min/max values in the data otherwise.',
            ),
            'show-y-axis-bounds',
            <CheckboxControl
              value={showYAxis}
              onChange={onCheckboxChangeHandler.bind(this, 'showYAxis')}
            />,
          )}
        {colType === 'spark' &&
          formRowHandler(
            t('Y-axis bounds'),
            t('Manually set min/max values for the y-axis.'),
            'y-axis-bounds',
            <BoundsControl
              value={yAxisBounds}
              onChange={onYAxisBoundsChangeHandler.bind(this)}
            />,
          )}
        {colType !== 'spark' &&
          formRowHandler(
            t('Color bounds'),
            t(`Number bounds used for color encoding from red to blue.
               Reverse the numbers for blue to red. To get pure red or blue,
               you can enter either only min or max.`),
            'bounds',
            <BoundsControl
              value={bounds}
              onChange={onBoundsChangeHandler.bind(this)}
            />,
          )}
        {formRowHandler(
          t('Number format'),
          t('Optional d3 number format string'),
          'd3-format',
          <Input
            value={d3format}
            onChange={onTextInputChangeHandler.bind(this, 'd3format')}
            placeholder={t('Number format string')}
          />,
        )}
        {colType === 'spark' &&
          formRowHandler(
            t('Date format'),
            t('Optional d3 date format string'),
            'date-format',
            <Input
              value={dateFormat}
              onChange={onTextInputChangeHandler.bind(this, 'dateFormat')}
              placeholder={t('Date format string')}
            />,
          )}
        <ButtonBar>
          <Button buttonSize="small" onClick={onCloseHandler} cta>
            {t('Close')}
          </Button>
          <Button
            buttonStyle="primary"
            buttonSize="small"
            onClick={onSaveHandler}
            cta
          >
            {t('Save')}
          </Button>
        </ButtonBar>
      </div>
    );
  }, [label]);

  return (
    <span>
      {textSummaryHandler()}{' '}
      <ControlPopover
        trigger="click"
        content={renderPopoverHandler()}
        title={t('Column Configuration')}
        visible={popoverVisible}
        onVisibleChange={onPopoverVisibleChangeHandler}
      >
        <InfoTooltipWithTrigger
          icon="edit"
          className="text-primary"
          label="edit-ts-column"
        />
      </ControlPopover>
    </span>
  );
};

export default TimeSeriesColumnControl;

TimeSeriesColumnControl.propTypes = propTypes;
TimeSeriesColumnControl.defaultProps = defaultProps;
