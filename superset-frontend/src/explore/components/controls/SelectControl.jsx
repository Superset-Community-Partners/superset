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
import { css, isEqualArray, t } from '@superset-ui/core';
import Select from 'src/components/Select/Select';
import ControlHeader from 'src/explore/components/ControlHeader';

const propTypes = {
  ariaLabel: PropTypes.string,
  autoFocus: PropTypes.bool,
  choices: PropTypes.array,
  clearable: PropTypes.bool,
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  disabled: PropTypes.bool,
  freeForm: PropTypes.bool,
  isLoading: PropTypes.bool,
  mode: PropTypes.string,
  multi: PropTypes.bool,
  isMulti: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  onFocus: PropTypes.func,
  onSelect: PropTypes.func,
  onDeselect: PropTypes.func,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
  default: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
  showHeader: PropTypes.bool,
  optionRenderer: PropTypes.func,
  valueKey: PropTypes.string,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  filterOption: PropTypes.func,
  tokenSeparators: PropTypes.arrayOf(PropTypes.string),
  notFoundContent: PropTypes.object,

  // ControlHeader props
  label: PropTypes.string,
  renderTrigger: PropTypes.bool,
  validationErrors: PropTypes.array,
  rightNode: PropTypes.node,
  leftNode: PropTypes.node,
  onClick: PropTypes.func,
  hovered: PropTypes.bool,
  tooltipOnClick: PropTypes.func,
  warning: PropTypes.string,
  danger: PropTypes.string,
};

const defaultProps = {
  autoFocus: false,
  choices: [],
  clearable: true,
  description: null,
  disabled: false,
  freeForm: false,
  isLoading: false,
  label: null,
  multi: false,
  onChange: () => {},
  onFocus: () => {},
  showHeader: true,
  valueKey: 'value',
};

const SelectControl = (props) => {


    const [options, setOptions] = useState(getOptionsHandler(props));

    const UNSAFE_componentWillReceivePropsHandler = useCallback((nextProps) => {
    if (
      !isEqualArray(nextProps.choices, props.choices) ||
      !isEqualArray(nextProps.options, props.options)
    ) {
      const options = getOptionsHandler(nextProps);
      setOptions(options);
    }
  }, [options]);
    // (firing every time user chooses vs firing only if a new option is chosen).
    const onChangeHandler = useCallback((val) => {
    // will eventually call `exploreReducer`: SET_FIELD_VALUE
    const { valueKey } = props;
    let onChangeVal = val;

    if (Array.isArray(val)) {
      const values = val.map(v =>
        v?.[valueKey] !== undefined ? v[valueKey] : v,
      );
      onChangeVal = values;
    }
    if (typeof val === 'object' && val?.[valueKey] !== undefined) {
      onChangeVal = val[valueKey];
    }
    props.onChange(onChangeVal, []);
  }, []);
    const getOptionsHandler = useCallback((props) => {
    const { choices, optionRenderer, valueKey } = props;
    let options = [];
    if (props.options) {
      setOptions(props.options.map(o => ({
        ...o,
        value: o[valueKey],
        label: o.label || o[valueKey],
        customLabel: optionRenderer ? optionRenderer(o) : undefined,
      })));
    } else if (choices) {
      // Accepts different formats of input
      setOptions(choices.map(c => {
        if (Array.isArray(c)) {
          const [value, label] = c.length > 1 ? c : [c[0], c[0]];
          return {
            value,
            label,
          };
        }
        if (Object.is(c)) {
          return {
            ...c,
            value: c[valueKey],
            label: c.label || c[valueKey],
          };
        }
        return { value: c, label: c };
      }));
    }
    return options;
  }, [options]);
    const handleFilterOptionsHandler = useCallback((text, option) => {
    const { filterOption } = props;
    return filterOption({ data: option }, text);
  }, []);

    const {
      ariaLabel,
      autoFocus,
      clearable,
      disabled,
      filterOption,
      freeForm,
      isLoading,
      isMulti,
      label,
      multi,
      name,
      notFoundContent,
      onFocus,
      onSelect,
      onDeselect,
      placeholder,
      showHeader,
      tokenSeparators,
      value,
      // ControlHeader props
      description,
      renderTrigger,
      rightNode,
      leftNode,
      validationErrors,
      onClick,
      hovered,
      tooltipOnClick,
      warning,
      danger,
    } = props;

    const headerProps = {
      name,
      label,
      description,
      renderTrigger,
      rightNode,
      leftNode,
      validationErrors,
      onClick,
      hovered,
      tooltipOnClick,
      warning,
      danger,
    };

    const getValue = () => {
      const currentValue =
        value ||
        (props.default !== undefined ? props.default : undefined);

      // safety check - the value is intended to be undefined but null was used
      if (
        currentValue === null &&
        !options.find(o => o.value === null)
      ) {
        return undefined;
      }
      return currentValue;
    };

    const selectProps = {
      allowNewOptions: freeForm,
      autoFocus,
      ariaLabel:
        ariaLabel || (typeof label === 'string' ? label : t('Select ...')),
      allowClear: clearable,
      disabled,
      filterOption:
        filterOption && typeof filterOption === 'function'
          ? handleFilterOptionsHandler
          : true,
      header: showHeader && <ControlHeader {...headerProps} />,
      loading: isLoading,
      mode: props.mode || (isMulti || multi ? 'multiple' : 'single'),
      name: `select-${name}`,
      onChange: onChangeHandler,
      onFocus,
      onSelect,
      onDeselect,
      options: options,
      placeholder,
      sortComparator: props.sortComparator,
      value: getValue(),
      tokenSeparators,
      notFoundContent,
    };

    return (
      <div
        css={theme => css`
          .type-label {
            margin-right: ${theme.gridUnit * 2}px;
          }
          .Select__multi-value__label > span,
          .Select__option > span,
          .Select__single-value > span {
            display: flex;
            align-items: center;
          }
        `}
      >
        <Select {...selectProps} />
      </div>
    ); 
};

export default SelectControl;




SelectControl.propTypes = propTypes;
SelectControl.defaultProps = defaultProps;
