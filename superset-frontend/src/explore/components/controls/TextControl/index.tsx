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

import React, { useState, useRef, useCallback } from 'react';
import { legacyValidateNumber, legacyValidateInteger } from '@superset-ui/core';
import debounce from 'lodash/debounce';
import { FAST_DEBOUNCE } from 'src/constants';
import ControlHeader from 'src/explore/components/ControlHeader';
import { Input } from 'src/components/Input';

type InputValueType = string | number;

export interface TextControlProps<T extends InputValueType = InputValueType> {
  label?: string;
  disabled?: boolean;
  isFloat?: boolean;
  isInt?: boolean;
  onChange?: (value: T, errors: any) => {};
  onFocus?: () => {};
  placeholder?: string;
  value?: T | null;
  controlId?: string;
  renderTrigger?: boolean;
}

export interface TextControlState {
  value: string;
}

const safeStringify = (value?: InputValueType | null) =>
  value == null ? '' : String(value);

const TextControl = (props: TextControlProps<T>) => {


    const [value, setValue] = useState(safeStringify(initialValue.current));

    const initialValue = useRef<TextControlProps['value']>();
    const onChangeHandler = useCallback((inputValue: string) => {
    let parsedValue: InputValueType = inputValue;
    // Validation & casting
    const errors = [];
    if (inputValue !== '' && props.isFloat) {
      const error = legacyValidateNumber(inputValue);
      if (error) {
        errors.push(error);
      } else {
        parsedValue = inputValue.match(/.*([.0])$/g)
          ? inputValue
          : parseFloat(inputValue);
      }
    }
    if (inputValue !== '' && props.isInt) {
      const error = legacyValidateInteger(inputValue);
      if (error) {
        errors.push(error);
      } else {
        parsedValue = parseInt(inputValue, 10);
      }
    }
    props.onChange?.(parsedValue as T, errors);
  }, []);
    const debouncedOnChange = useRef(debounce((inputValue: string) => {
    onChangeHandler(inputValue);
  }, FAST_DEBOUNCE));
    const onChangeWrapperHandler = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setStateHandler({ value }, () => {
      debouncedOnChange.current(value);
    });
  }, [value]);

    
    if (initialValue.current !== props.value) {
      initialValue.current = props.value;
      setValue(safeStringify(props.value));
    }
    return (
      <div>
        <ControlHeader {...props} />
        <Input
          type="text"
          data-test="inline-name"
          placeholder={props.placeholder}
          onChange={onChangeWrapperHandler}
          onFocus={props.onFocus}
          value={value}
          disabled={props.disabled}
          aria-label={props.label}
        />
      </div>
    ); 
};

export default TextControl;



