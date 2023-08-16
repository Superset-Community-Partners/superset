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
import {
    t,
    logging,
    SupersetClient,
    withTheme,
    ensureIsArray
} from '@superset-ui/core';

import ControlHeader from 'src/explore/components/ControlHeader';
import adhocMetricType from 'src/explore/components/controls/MetricControl/adhocMetricType';
import savedMetricType from 'src/explore/components/controls/MetricControl/savedMetricType';
import AdhocMetric from 'src/explore/components/controls/MetricControl/AdhocMetric';
import {
    Operators,
    OPERATOR_ENUM_TO_OPERATOR_TYPE
} from 'src/explore/constants';
import {
    AddControlLabel,
    AddIconButton,
    HeaderContainer,
    LabelsContainer
} from 'src/explore/components/controls/OptionControls';
import Icons from 'src/components/Icons';
import AdhocFilterPopoverTrigger from 'src/explore/components/controls/FilterControl/AdhocFilterPopoverTrigger';
import AdhocFilter, {
    CLAUSES,
    EXPRESSION_TYPES
} from 'src/explore/components/controls/FilterControl/AdhocFilter';
import adhocFilterType from 'src/explore/components/controls/FilterControl/adhocFilterType';
import columnType from 'src/explore/components/controls/FilterControl/columnType';

const selectedMetricType = PropTypes.oneOfType([
  PropTypes.string,
  adhocMetricType
]);

const propTypes = {
  label: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
  name: PropTypes.string,
  sections: PropTypes.arrayOf(PropTypes.string),
  operators: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func,
  value: PropTypes.arrayOf(adhocFilterType),
  datasource: PropTypes.object,
  columns: PropTypes.arrayOf(columnType),
  savedMetrics: PropTypes.arrayOf(savedMetricType),
  selectedMetrics: PropTypes.oneOfType([
    selectedMetricType,
    PropTypes.arrayOf(selectedMetricType)
  ]),
  isLoading: PropTypes.bool
};

const defaultProps = {
  name: '',
  onChange: () => {},
  columns: [],
  savedMetrics: [],
  selectedMetrics: []
};

function isDictionaryForAdhocFilter(value) {
  return value && !(value instanceof AdhocFilter) && value.expressionType;
}

const AdhocFilterControl = (props) => {
const filters = (props.value || []).map(filter =>
      isDictionaryForAdhocFilter(filter) ? new AdhocFilter(filter) : filter
    );

    const [values, setValues] = useState(filters);
    const [options, setOptions] = useState(optionsForSelectHandler(props));
    const [partitionColumn, setPartitionColumn] = useState(null);

    useEffect(() => {
    const { datasource } = props;
    if (datasource && datasource.type === 'table') {
      const dbId = datasource.database?.id;
      const {
        datasource_name: name,
        schema,
        is_sqllab_view: isSqllabView
      } = datasource;

      if (!isSqllabView && dbId && name && schema) {
        SupersetClient.get({
          endpoint: `/api/v1/database/${dbId}/table_extra/${name}/${schema}/`
        })
          .then(({ json }) => {
            if (json && json.partitions) {
              const { partitions } = json;
              // for now only show latest_partition option
              // when table datasource has only 1 partition key.
              if (
                partitions &&
                partitions.cols &&
                Object.keys(partitions.cols).length === 1
              ) {
                setPartitionColumn(partitions.cols[0]);
              }
            }
          })
          .catch(error => {
            logging.error('fetch extra_table_metadata:', error.statusText);
          });
      }
    }
  }, []);
    const UNSAFE_componentWillReceivePropsHandler = useCallback((nextProps) => {
    if (props.columns !== nextProps.columns) {
      setOptions(optionsForSelectHandler(nextProps));
    }
    if (props.value !== nextProps.value) {
      setValues((nextProps.value || []).map(filter =>
          isDictionaryForAdhocFilter(filter) ? new AdhocFilter(filter) : filter
        ));
    }
  }, []);
    const onRemoveFilterHandler = useCallback((index) => {
    const valuesCopy = [...values];
    valuesCopy.splice(index, 1);
    setValues(valuesCopy);
    props.onChange(valuesCopy);
  }, [values]);
    const onNewFilterHandler = useCallback((newFilter) => {
    const mappedOption = mapOptionHandler(newFilter);
    if (mappedOption) {
      setValues([...prevState.values, mappedOption]);
    }
  }, []);
    const onFilterEditHandler = useCallback((changedFilter) => {
    props.onChange(
      values.map(value => {
        if (value.filterOptionName === changedFilter.filterOptionName) {
          return changedFilter;
        }
        return value;
      })
    );
  }, [values]);
    const onChangeHandler = useCallback((opts) => {
    const options = (opts || [])
      .map(option => mapOptionHandler(option))
      .filter(option => option);
    props.onChange(options);
  }, [options]);
    const getMetricExpressionHandler = useCallback((savedMetricName) => {
    return props.savedMetrics.find(
      savedMetric => savedMetric.metric_name === savedMetricName
    ).expression;
  }, []);
    const moveLabelHandler = useCallback((dragIndex, hoverIndex) => {
    

    const newValues = [...values];
    [newValues[hoverIndex], newValues[dragIndex]] = [
      newValues[dragIndex],
      newValues[hoverIndex]
    ];
    setValues(newValues);
  }, [values]);
    const mapOptionHandler = useCallback((option) => {
    // already a AdhocFilter, skip
    if (option instanceof AdhocFilter) {
      return option;
    }
    // via datasource saved metric
    if (option.saved_metric_name) {
      return new AdhocFilter({
        expressionType: EXPRESSION_TYPES.SQL,
        subject: getMetricExpressionHandler(option.saved_metric_name),
        operator:
          OPERATOR_ENUM_TO_OPERATOR_TYPE[Operators.GREATER_THAN].operation,
        comparator: 0,
        clause: CLAUSES.HAVING
      });
    }
    // has a custom label, meaning it's custom column
    if (option.label) {
      return new AdhocFilter({
        expressionType: EXPRESSION_TYPES.SQL,
        subject: new AdhocMetric(option).translateToSql(),
        operator:
          OPERATOR_ENUM_TO_OPERATOR_TYPE[Operators.GREATER_THAN].operation,
        comparator: 0,
        clause: CLAUSES.HAVING
      });
    }
    // add a new filter item
    if (option.column_name) {
      return new AdhocFilter({
        expressionType: EXPRESSION_TYPES.SIMPLE,
        subject: option.column_name,
        operator: OPERATOR_ENUM_TO_OPERATOR_TYPE[Operators.EQUALS].operation,
        comparator: '',
        clause: CLAUSES.WHERE,
        isNew: true
      });
    }
    return null;
  }, []);
    const optionsForSelectHandler = useCallback((props) => {
    const options = [
      ...props.columns,
      ...ensureIsArray(props.selectedMetrics).map(
        metric =>
          metric &&
          (typeof metric === 'string'
            ? { saved_metric_name: metric }
            : new AdhocMetric(metric))
      )
    ].filter(option => option);

    return options
      .reduce((results, option) => {
        if (option.saved_metric_name) {
          results.push({
            ...option,
            filterOptionName: option.saved_metric_name
          });
        } else if (option.column_name) {
          results.push({
            ...option,
            filterOptionName: `_col_${option.column_name}`
          });
        } else if (option instanceof AdhocMetric) {
          results.push({
            ...option,
            filterOptionName: `_adhocmetric_${option.label}`
          });
        }
        return results;
      }, [])
      .sort((a, b) =>
        (a.saved_metric_name || a.column_name || a.label).localeCompare(
          b.saved_metric_name || b.column_name || b.label
        )
      );
  }, [options]);
    const addNewFilterPopoverTriggerHandler = useCallback((trigger) => {
    return (
      <AdhocFilterPopoverTrigger
        operators={props.operators}
        sections={props.sections}
        adhocFilter={new AdhocFilter({})}
        datasource={props.datasource}
        options={options}
        onFilterEdit={onNewFilterHandler}
        partitionColumn={partitionColumn}
      >
        {trigger}
      </AdhocFilterPopoverTrigger>
    );
  }, [options, partitionColumn]);

    const { theme } = props;
    return (
      <div className="metrics-select" data-test="adhoc-filter-control">
        <HeaderContainer>
          <ControlHeader {...props} />
          {addNewFilterPopoverTriggerHandler(
            <AddIconButton data-test="add-filter-button">
              <Icons.PlusLarge
                iconSize="s"
                iconColor={theme.colors.grayscale.light5}
              />
            </AddIconButton>
          )}
        </HeaderContainer>
        <LabelsContainer>
          {values.length > 0
            ? values.map((value, index) =>
                valueRendererHandler(value, index)
              )
            : addNewFilterPopoverTriggerHandler(
                <AddControlLabel>
                  <Icons.PlusSmall iconColor={theme.colors.grayscale.light1} />
                  {t('Add filter')}
                </AddControlLabel>
              )}
        </LabelsContainer>
      </div>
    ); 
};




AdhocFilterControl.propTypes = propTypes;
AdhocFilterControl.defaultProps = defaultProps;

export default withTheme(AdhocFilterControl);
