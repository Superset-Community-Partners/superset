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

import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Select } from 'src/components/DeprecatedSelect';

const OnPasteSelect = props => {
  const onPasteHandler = useCallback(evt => {
    if (!props.isMulti) {
      return;
    }
    evt.preventDefault();
    const clipboard = evt.clipboardData.getData('Text');
    if (!clipboard) {
      return;
    }
    const regex = `[${props.separator}]+`;
    const values = clipboard.split(new RegExp(regex)).map(v => v.trim());
    const validator = props.isValidNewOption;
    const selected = props.value || [];
    const existingOptions = {};
    const existing = {};
    props.options.forEach(v => {
      existingOptions[v[props.valueKey]] = 1;
    });
    let options = [];
    selected.forEach(v => {
      options.push({ [props.labelKey]: v, [props.valueKey]: v });
      existing[v] = 1;
    });
    options = options.concat(
      values
        .filter(v => {
          const notExists = !existing[v];
          existing[v] = 1;
          return (
            notExists && (validator ? validator({ [props.labelKey]: v }) : !!v)
          );
        })
        .map(v => {
          const opt = { [props.labelKey]: v, [props.valueKey]: v };
          if (!existingOptions[v]) {
            props.options.unshift(opt);
          }
          return opt;
        }),
    );
    if (options.length) {
      if (props.onChange) {
        props.onChange(options);
      }
    }
  }, []);

  const { selectWrap: SelectComponent, ...restProps } = props;
  return <SelectComponent {...restProps} onPaste={onPasteHandler} />;
};

export default OnPasteSelect;

OnPasteSelect.propTypes = {
  separator: PropTypes.array,
  selectWrap: PropTypes.elementType,
  selectRef: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  valueKey: PropTypes.string,
  labelKey: PropTypes.string,
  options: PropTypes.array,
  isMulti: PropTypes.bool,
  value: PropTypes.any,
  isValidNewOption: PropTypes.func,
  noResultsText: PropTypes.string,
  forceOverflow: PropTypes.bool,
};
OnPasteSelect.defaultProps = {
  separator: [',', '\n', '\t', ';'],
  selectWrap: Select,
  valueKey: 'value',
  labelKey: 'label',
  options: [],
  isMulti: false,
};
