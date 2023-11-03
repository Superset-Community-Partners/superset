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
import { css } from '@emotion/react';
import { t } from '@superset-ui/core';
import Label from 'src/components/Label';
import Collapse from 'src/components/Collapse';
import TextControl from 'src/explore/components/controls/TextControl';
import MetricsControl from 'src/explore/components/controls/MetricControl/MetricsControl';
import ControlHeader from 'src/explore/components/ControlHeader';
import PopoverSection from 'src/components/PopoverSection';

const controlTypes = {
  fixed: 'fix',
  metric: 'metric',
};

const propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.object,
  isFloat: PropTypes.bool,
  datasource: PropTypes.object.isRequired,
  default: PropTypes.shape({
    type: PropTypes.oneOf(['fix', 'metric']),
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};

const defaultProps = {
  onChange: () => {},
  default: { type: controlTypes.fixed, value: 5 },
};

const FixedOrMetricControl = props => {
  const type =
    (props.value ? props.value.type : props.default.type) || controlTypes.fixed;
  const value =
    (props.value ? props.value.value : props.default.value) || '100';

  const [fixedValue, setFixedValue] = useState(
    type === controlTypes.fixed ? value : '',
  );
  const [metricValue, setMetricValue] = useState(
    type === controlTypes.metric ? value : null,
  );

  const onChangeHandler = useCallback(() => {
    props.onChange({
      type: type,
      value: type === controlTypes.fixed ? fixedValue : metricValue,
    });
  }, [fixedValue, metricValue]);
  const setTypeHandler = useCallback(type => {
    setStateHandler({ type }, onChangeHandler);
  }, []);
  const setFixedValueHandler = useCallback(
    fixedValue => {
      setStateHandler({ fixedValue }, onChangeHandler);
    },
    [fixedValue],
  );
  const setMetricHandler = useCallback(
    metricValue => {
      setStateHandler({ metricValue }, onChangeHandler);
    },
    [metricValue],
  );

  const value = props.value || props.default;
  const type = value.type || controlTypes.fixed;
  const columns = props.datasource ? props.datasource.columns : null;
  const metrics = props.datasource ? props.datasource.metrics : null;
  return (
    <div>
      <ControlHeader {...props} />
      <Collapse
        ghost
        css={theme => css`
          &.ant-collapse
            > .ant-collapse-item.ant-collapse-no-arrow
            > .ant-collapse-header {
            border: 0px;
            padding: 0px 0px ${theme.gridUnit * 2}px 0px;
            display: inline-block;
          }
          &.ant-collapse-ghost
            > .ant-collapse-item
            > .ant-collapse-content
            > .ant-collapse-content-box {
            padding: 0px;

            & .well {
              margin-bottom: 0px;
              padding: ${theme.gridUnit * 2}px;
            }
          }
        `}
      >
        <Collapse.Panel
          showArrow={false}
          header={
            <Label onClick={() => undefined}>
              {type === controlTypes.fixed && <span>{fixedValue}</span>}
              {type === controlTypes.metric && (
                <span>
                  <span>{t('metric')}: </span>
                  <strong>{metricValue ? metricValue.label : null}</strong>
                </span>
              )}
            </Label>
          }
        >
          <div className="well">
            <PopoverSection
              title={t('Fixed')}
              isSelected={type === controlTypes.fixed}
              onSelect={() => {
                setTypeHandler(controlTypes.fixed);
              }}
            >
              <TextControl
                isFloat
                onChange={setFixedValueHandler}
                onFocus={() => {
                  setTypeHandler(controlTypes.fixed);
                }}
                value={fixedValue}
              />
            </PopoverSection>
            <PopoverSection
              title={t('Based on a metric')}
              isSelected={type === controlTypes.metric}
              onSelect={() => {
                setTypeHandler(controlTypes.metric);
              }}
            >
              <MetricsControl
                name="metric"
                columns={columns}
                savedMetrics={metrics}
                multi={false}
                onFocus={() => {
                  setTypeHandler(controlTypes.metric);
                }}
                onChange={setMetricHandler}
                value={metricValue}
                datasource={props.datasource}
              />
            </PopoverSection>
          </div>
        </Collapse.Panel>
      </Collapse>
    </div>
  );
};

export default FixedOrMetricControl;

FixedOrMetricControl.propTypes = propTypes;
FixedOrMetricControl.defaultProps = defaultProps;
